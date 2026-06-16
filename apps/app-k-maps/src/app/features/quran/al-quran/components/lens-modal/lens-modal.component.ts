import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

import { QuranPageWord } from '../../../../../shared/models/quran/quran-reader.model';
import {
  FiveLensLexiconService,
  FiveLensResult,
} from '../../../../../shared/services/ar-linguistics/five-lens-lexicon.service';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Five-Lens lexicon modal. Opened from the word context menu (word-popover)
 * for a tapped Quran word. Loads the curated five-lens entry for the word's
 * root (qr_word_occurrences.root) and renders it through a styled,
 * scripture-toned sheet. Display-only — it reads the lexicon and writes
 * nothing (no notes, no documents).
 *
 * Roots without a curated entry resolve to a calm empty state rather than an
 * error.
 */
@Component({
  selector: 'app-lens-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="lm__header">
      <ion-toolbar class="lm__toolbar">
        <ion-title class="lm__title">Five Lenses</ion-title>
        <ion-buttons slot="end">
          <ion-button class="lm__close" (click)="dismiss()" aria-label="Close">
            <ion-icon slot="icon-only" name="close" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="lm__content">
      <div class="lm">
        <header class="lm__masthead">
          @if (rootDisplay(); as root) {
            <div class="lm__root" lang="ar" dir="rtl">{{ root }}</div>
          }
          <div class="lm__ref">
            @if (word.simple; as txt) {
              <span class="lm__word" lang="ar" dir="rtl">{{ txt }}</span>
            }
            <span class="lm__cite">{{ word.surah }}:{{ word.ayah }}</span>
          </div>
        </header>

        @switch (state()) {
          @case ('loading') {
            <div class="lm__state">
              <ion-spinner name="crescent" />
              <p>Opening the lexicon…</p>
            </div>
          }
          @case ('error') {
            <div class="lm__state lm__state--error">
              <ion-icon name="alert-circle-outline" />
              <p>{{ errorMessage() }}</p>
            </div>
          }
          @case ('ready') {
            @if (result()?.found) {
              @if (result()?.entry?.entry_text_ar || result()?.entry?.entry_text_en) {
                <section class="lm__entry">
                  @if (result()?.entry?.entry_text_ar; as ar) {
                    <p class="lm__entry-ar" lang="ar" dir="rtl">{{ ar }}</p>
                  }
                  @if (result()?.entry?.entry_text_en; as en) {
                    <p class="lm__entry-en">{{ en }}</p>
                  }
                </section>
              }

              <ol class="lm__lenses">
                @for (lens of result()?.lenses ?? []; track lens.id) {
                  <li class="lm__lens">
                    <div class="lm__lens-head">
                      <span class="lm__lens-no">{{ lens.section_seq }}</span>
                      @if (lens.heading_ar; as h) {
                        <span class="lm__lens-title" lang="ar" dir="rtl">{{ h }}</span>
                      } @else {
                        <span class="lm__lens-title lm__lens-title--type">{{ lens.section_type }}</span>
                      }
                    </div>
                    @if (lens.text_ar; as ar) {
                      <p class="lm__lens-ar" lang="ar" dir="rtl">{{ ar }}</p>
                    }
                    @if (lens.text_en; as en) {
                      <p class="lm__lens-en">{{ en }}</p>
                    }
                  </li>
                }
              </ol>

              @if (result()?.entry?.source_url; as url) {
                <a class="lm__source" [href]="url" target="_blank" rel="noopener">
                  <ion-icon name="open-outline" />
                  <span>Source</span>
                </a>
              }
            } @else {
              <div class="lm__state lm__state--empty">
                <ion-icon name="book-outline" />
                <p class="lm__empty-title">No five-lens entry yet</p>
                <p class="lm__empty-sub">
                  This root hasn’t been mapped through the five lenses.
                </p>
              </div>
            }
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --lm-ink: #1c160c;
      --lm-paper: #f7f1e3;
      --lm-gold: #9c7a32;
      --lm-gold-soft: rgba(156, 122, 50, 0.18);
      display: block;
      color: var(--lm-ink);
    }
    .lm__toolbar {
      --background: var(--lm-paper);
      --color: var(--lm-ink);
      --border-color: var(--lm-gold-soft);
    }
    .lm__title {
      font-family: 'Cinzel', 'EB Garamond', serif;
      letter-spacing: 0.08em;
      font-size: 1rem;
      text-transform: uppercase;
    }
    .lm__close { --color: var(--lm-gold); }
    .lm__content { --background: var(--lm-paper); }

    .lm { padding: 0.5rem 1.1rem 2rem; }

    .lm__masthead {
      text-align: center;
      padding: 0.6rem 0 1rem;
      border-bottom: 1px solid var(--lm-gold-soft);
      margin-bottom: 1.1rem;
    }
    .lm__root {
      font-family: 'Amiri', 'Gentium Plus', serif;
      font-size: 2.9rem;
      line-height: 1.1;
      color: var(--lm-ink);
      letter-spacing: 0.12em;
    }
    .lm__ref {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }
    .lm__word {
      font-family: 'Amiri', serif;
      font-size: 1.3rem;
      color: #5a4a28;
    }
    .lm__cite {
      font-family: 'EB Garamond', serif;
      font-variant-numeric: tabular-nums;
      font-size: 0.92rem;
      color: var(--lm-gold);
      border: 1px solid var(--lm-gold-soft);
      border-radius: 999px;
      padding: 1px 9px;
    }

    .lm__entry { margin-bottom: 1.25rem; }
    .lm__entry-ar {
      font-family: 'Amiri', 'Gentium Plus', serif;
      font-size: 1.25rem;
      line-height: 1.9;
      margin: 0 0 0.5rem;
    }
    .lm__entry-en {
      font-family: 'EB Garamond', 'Gentium Plus', serif;
      font-size: 1rem;
      line-height: 1.6;
      color: #4a3f2a;
      margin: 0;
    }

    .lm__lenses { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
    .lm__lens {
      background: rgba(255, 255, 255, 0.5);
      border: 1px solid var(--lm-gold-soft);
      border-radius: 12px;
      padding: 0.85rem 1rem 0.95rem;
    }
    .lm__lens-head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.5rem;
    }
    .lm__lens-no {
      flex: 0 0 auto;
      width: 1.6rem;
      height: 1.6rem;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--lm-gold);
      color: var(--lm-paper);
      font-family: 'Cinzel', serif;
      font-size: 0.82rem;
    }
    .lm__lens-title {
      font-family: 'Amiri', 'Cinzel', serif;
      font-size: 1.15rem;
      color: var(--lm-ink);
    }
    .lm__lens-title--type {
      font-family: 'Cinzel', serif;
      font-size: 0.82rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--lm-gold);
    }
    .lm__lens-ar {
      font-family: 'Amiri', 'Gentium Plus', serif;
      font-size: 1.18rem;
      line-height: 1.95;
      margin: 0 0 0.4rem;
    }
    .lm__lens-en {
      font-family: 'EB Garamond', 'Gentium Plus', serif;
      font-size: 0.98rem;
      line-height: 1.6;
      color: #4a3f2a;
      margin: 0;
    }

    .lm__source {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 1.25rem;
      font-family: 'EB Garamond', serif;
      font-size: 0.92rem;
      color: var(--lm-gold);
      text-decoration: none;
    }

    .lm__state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      padding: 2.5rem 1rem;
      text-align: center;
      color: #6a5c3e;
      font-family: 'EB Garamond', serif;
    }
    .lm__state ion-icon { font-size: 2.2rem; color: var(--lm-gold); }
    .lm__state--error ion-icon { color: #a4453a; }
    .lm__empty-title {
      font-family: 'Cinzel', serif;
      font-size: 1.05rem;
      margin: 0.2rem 0 0;
      color: var(--lm-ink);
    }
    .lm__empty-sub { margin: 0; font-size: 0.95rem; }
  `],
})
export class LensModalComponent implements OnInit {
  @Input({ required: true }) word!: QuranPageWord;

  private readonly modalCtrl = inject(ModalController);
  private readonly lexicon = inject(FiveLensLexiconService);

  readonly state = signal<LoadState>('loading');
  readonly result = signal<FiveLensResult | null>(null);
  readonly errorMessage = signal<string>('Unable to load the lexicon entry.');

  /** Prefer the morphological root; fall back to the surface word. */
  rootDisplay(): string {
    return (this.word.root ?? this.word.simple ?? '').trim();
  }

  ngOnInit(): void {
    const root = (this.word.root ?? this.word.simple ?? this.word.text ?? '').trim();
    if (!root) {
      this.result.set({ found: false, root_norm: '', root_text: null, entry: null, lenses: [] });
      this.state.set('ready');
      return;
    }

    this.lexicon.getByRoot(root).subscribe({
      next: (res) => {
        this.result.set(res);
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.errorMessage.set(err instanceof Error ? err.message : 'Unable to load the lexicon entry.');
        this.state.set('error');
      },
    });
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'close');
  }
}
