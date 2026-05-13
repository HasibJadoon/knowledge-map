// ─── Book-source modal ─────────────────────────────────────────────────────
//
// One Ionic modal for ALL book sources opened from the mobile catalog.
// Mirrors the desktop shells (Lane / Lexicon / Mufradat / Scholarship) but
// in a phone-friendly modal layout with an `ion-segment` for the tabs
// (Roots / Content / Source) the desktop shows in side rails.

import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlDictionaryApiService,
  ScholarshipShellView, ScholarshipRootRow,
} from '../../../../shared/services/al-dictionary-api.service';

export interface BookSummary {
  kind:     'lexicon' | 'scholarship';
  slug:     string;
  title_ar: string;
  title_en: string;
  author:   string;
  year?:    number | null;
  genre?:   string;
  genre_ar?: string;
  period:   string;
}

type ModalTab = 'content' | 'roots' | 'source';

@Component({
  selector: 'app-book-source-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './book-source-modal.component.html',
  styleUrl: './book-source-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSourceModalComponent {
  readonly book   = input.required<BookSummary | null>();
  readonly closed = output<void>();

  private readonly api    = inject(AlDictionaryApiService);
  private readonly router = inject(Router);

  readonly tab           = signal<ModalTab>('content');
  readonly loading       = signal(false);
  readonly currentRoot   = signal<string>('');
  readonly rootRows      = signal<ScholarshipRootRow[]>([]);
  readonly shellView     = signal<ScholarshipShellView | null>(null);

  readonly isOpen = computed(() => !!this.book());
  readonly isScholarship = computed(() => this.book()?.kind === 'scholarship');

  constructor() {
    // When the bound `book` changes (modal opened/replaced), reset state
    // and trigger the appropriate fetches for the new source.
    effect(() => {
      const b = this.book();
      if (!b) {
        this.shellView.set(null);
        this.rootRows.set([]);
        this.currentRoot.set('');
        this.tab.set('content');
        return;
      }
      this.tab.set('content');
      if (b.kind === 'scholarship') this.loadScholarshipRoots(b.slug);
    });
  }

  // ── Scholarship loading ──────────────────────────────────────────────
  private loadScholarshipRoots(slug: string): void {
    this.loading.set(true);
    this.api.getScholarshipRoots(slug).pipe(
      catchError(() => of({ slug, rows: [] as ScholarshipRootRow[], total: 0 })),
      takeUntilDestroyed(),
    ).subscribe(r => {
      this.rootRows.set(r.rows);
      const first = r.rows[0]?.root_norm ?? '';
      if (first) this.selectRoot(first);
      else { this.loading.set(false); this.shellView.set(null); }
    });
  }

  selectRoot(root_norm: string): void {
    const b = this.book();
    if (!b) return;
    this.currentRoot.set(root_norm);
    this.tab.set('content');
    if (b.kind === 'scholarship') {
      this.loading.set(true);
      this.api.getScholarshipBySource(b.slug, root_norm).pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      ).subscribe(v => {
        this.shellView.set(v);
        this.loading.set(false);
      });
    }
  }

  // ── Body segmentation: inline Q s:a → clickable pill ────────────────
  bodySegments(text: string | null | undefined): {
    kind: 'text' | 'qref'; value: string; surah?: number; ayah?: number;
  }[] {
    if (!text) return [];
    const RX = /\bQ\.?\s*(\d{1,3})\s*[:\-–]\s*(\d{1,3})\b/g;
    const out: { kind: 'text' | 'qref'; value: string; surah?: number; ayah?: number }[] = [];
    let cur = 0;
    let m: RegExpExecArray | null;
    while ((m = RX.exec(text)) != null) {
      const surah = parseInt(m[1], 10);
      const ayah  = parseInt(m[2], 10);
      if (!(surah >= 1 && surah <= 114 && ayah >= 1)) continue;
      if (m.index > cur) out.push({ kind: 'text', value: text.slice(cur, m.index) });
      out.push({ kind: 'qref', value: m[0], surah, ayah });
      cur = m.index + m[0].length;
    }
    if (cur < text.length) out.push({ kind: 'text', value: text.slice(cur) });
    return out;
  }

  openAyah(surah: number, ayah: number): void {
    if (!surah || !ayah) return;
    this.dismiss();
    this.router.navigate(['/quran/al-quran'], {
      queryParams: { surah, startingVerse: ayah },
    });
  }

  // ── Dismiss ──────────────────────────────────────────────────────────
  dismiss(): void { this.closed.emit(); }
}
