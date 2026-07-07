import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  OnDestroy, Output, inject, input, viewChild,
} from '@angular/core';
import { QuranGsapService } from '../../../shared/services/quran/quran-gsap.service';

/** One run of the semantic arc — arrow runs render gold. */
interface ArcPart { t: string; arrow: boolean; }

/**
 * Normalised morphology-card view-model. Both grids (full-surah morphology and
 * the passage study step) map their own row into this shape, so the card looks
 * and behaves identically everywhere. Pure data — no source logic.
 */
export interface MorphCardVm {
  group: string;                                 // 'noun' | 'verb'
  posLabel: string;                              // "Noun" | "Verb" | "Noun (participle)"
  ref: string;                                   // "44:2"
  isAnchor: boolean;
  feats: { cat: string; ar: string }[];          // case/number/gender/type · tense/voice
  surfaceAr: string;                             // the word as it occurs
  arc: string | null;                            // "separation → clarity"
  rangeText: string | null;                      // compact range of meanings (or gloss)
  waznAr: string | null;
  rootDisplay: string | null;                    // "ب ي ن"
  rootAr: string | null;                         // "بين" (for navigation)
}

/**
 * The morphology word card — a data-driven renderer with a pointer-tracked 3D
 * tilt + parallax and a gold glare (GSAP). Content, feature chips, and the
 * compact 360° synopsis all come from the VM; look-and-feel is fixed here.
 */
@Component({
  selector: 'km-morph-word-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="wcard" #cardEl type="button" [attr.data-group]="card().group" (click)="open.emit()">
      <span class="wcard__accent"></span>

      <div class="wcard__inner">

        <!-- header: POS badge · wazn · ayah ref -->
        <div class="wcard__head" data-depth="0.35">
          <span class="wcard__pos">{{ card().posLabel }}</span>
          @if (card().waznAr) { <span class="wcard__wazn" dir="rtl">{{ card().waznAr }}</span> }
          <span class="wcard__ref">{{ card().ref }}</span>
          @if (card().isAnchor) { <span class="wcard__anchor" title="Root anchor">✦</span> }
        </div>

        <!-- grammatical-feature chips -->
        @if (card().feats.length) {
          <div class="wcard__feats" data-depth="0.6">
            @for (f of card().feats; track f.cat) {
              <span class="feat feat--{{ f.cat }}" dir="rtl">{{ f.ar }}</span>
            }
          </div>
        }

        <!-- the word, as it occurs -->
        <div class="wcard__word" dir="rtl" data-depth="1">{{ card().surfaceAr }}</div>

        <!-- compact 360° synopsis: semantic arc + range of meanings -->
        @if (card().arc) {
          <div class="wcard__synth" data-depth="0.5">
            <span class="wcard__360">◍ 360°</span>
            <span class="wcard__arc">
              @for (p of arcParts(card().arc!); track $index) {
                <span [class.arrow]="p.arrow">{{ p.t }}</span>
              }
            </span>
            @if (card().rangeText) { <span class="wcard__range">{{ card().rangeText }}</span> }
          </div>
        } @else if (card().rangeText) {
          <div class="wcard__range wcard__range--solo" data-depth="0.5">{{ card().rangeText }}</div>
        }

        <!-- footer: root -->
        <div class="wcard__foot" data-depth="0.3">
          @if (card().rootDisplay) {
            <span
              class="wcard__root"
              dir="rtl"
              role="link"
              tabindex="0"
              title="Open root page"
              (click)="onRoot($event)"
              (keydown.enter)="onRoot($event)"
            >{{ card().rootDisplay }}</span>
          }
        </div>

      </div>

      <span class="wcard__glare" aria-hidden="true"></span>
    </button>
  `,
  styles: `
    :host { display: block; perspective: 1000px; }

    .wcard {
      position: relative; overflow: hidden; cursor: pointer; width: 100%; direction: ltr;
      border: 1px solid var(--edge, rgba(255,255,255,.08)); border-radius: 14px;
      background:
        linear-gradient(180deg, rgba(201,168,76,.05), rgba(20,20,20,0) 48%),
        linear-gradient(180deg, var(--panel, #141414), #101018);
      text-align: left; font-family: var(--en, 'Poppins', system-ui, sans-serif);
      transform-style: preserve-3d; transition: border-color .18s; will-change: transform;

      &:focus-visible { outline: 2px solid var(--golddim, #7a6432); outline-offset: 2px; }

      &__accent { position: absolute; inset: 0 auto 0 0; width: 3px; z-index: 3; background: var(--muted, rgba(255,255,255,.55)); opacity: .55; }
      &[data-group='noun'] &__accent { background: var(--noun, #5fc99a); }
      &[data-group='verb'] &__accent { background: var(--verb, #a78bfa); }

      &__inner { position: relative; z-index: 2; transform-style: preserve-3d; display: flex; flex-direction: column; gap: 9px; min-height: 100%; padding: 12px 15px 13px; }
      &__glare { position: absolute; inset: 0; z-index: 4; opacity: 0; pointer-events: none; border-radius: inherit; }

      &__head { display: flex; align-items: center; gap: 8px; }
      &__pos { font: 600 8.5px/1.4 var(--en); letter-spacing: .07em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; white-space: nowrap;
        color: var(--noun, #5fc99a); border: 1px solid rgba(127,181,143,.35); background: rgba(127,181,143,.14); }
      &[data-group='verb'] &__pos { color: var(--verb, #a78bfa); border-color: rgba(136,120,226,.35); background: rgba(136,120,226,.14); }
      &__ref { margin-left: auto; font: 400 9.5px/1 var(--mono, ui-monospace, monospace); letter-spacing: .06em; color: var(--faint, rgba(255,255,255,.32)); }
      &__anchor { color: var(--indigo2, #b3a6f6); font-size: 12px; }

      &__feats { display: flex; flex-wrap: wrap; gap: 4px; }

      &__word { font-family: var(--ar, 'AmiriQuran', 'Amiri', serif); font-size: 31px; line-height: 1.5; color: var(--ink, rgba(255,255,255,.92)); direction: rtl; text-align: right; margin-top: 2px; }

      &__synth { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding-top: 9px; border-top: 1px solid var(--edge2, rgba(255,255,255,.05)); }
      &__360 { display: inline-flex; align-items: center; gap: 4px; font: 700 8px/1 var(--mono); letter-spacing: .1em; color: var(--gold2, #e8c96a); border: 1px solid var(--golddim, #7a6432); border-radius: 999px; padding: 3px 7px; }
      &__arc { font: 600 13px/1.35 var(--en); color: var(--ink, rgba(255,255,255,.92));
        .arrow { color: var(--gold2, #e8c96a); font-weight: 800; padding: 0 5px; font-size: 1.15em; } }

      &__range { font: italic 400 11.5px/1.5 var(--en); color: var(--muted, rgba(255,255,255,.55));
        &--solo { padding-top: 9px; border-top: 1px solid var(--edge2, rgba(255,255,255,.05)); font-size: 12px; } }

      &__foot { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 9px; border-top: 1px solid var(--edge2, rgba(255,255,255,.05)); }
      &__wazn { font-family: var(--ar); font-size: 13px; color: var(--gold, #c9a84c); direction: rtl; opacity: .9; }
      &__root { margin-left: auto; font-family: var(--ar); font-size: 15px; letter-spacing: .18em; color: var(--gold2, #e8c96a); cursor: pointer; direction: rtl;
        border-bottom: 1px dashed var(--golddim, #7a6432); padding-bottom: 1px; transition: color .15s, border-color .15s;
        &:hover { color: #fff; border-bottom-color: var(--gold2, #e8c96a); }
        &:focus-visible { outline: 2px solid var(--golddim); outline-offset: 2px; } }
    }

    .feat {
      font-family: var(--ar, 'Amiri', serif); font-size: 12.5px; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 4px 7px; border-radius: 8px; white-space: nowrap;
      border: 1px solid var(--edge2, rgba(255,255,255,.05)); color: var(--ink2, rgba(255,255,255,.74)); background: rgba(255,255,255,.03);

      &--status, &--tense { color: var(--gold2, #e8c96a); border-color: rgba(201,168,76,.42); background: rgba(201,168,76,.10); }
      &--number, &--voice { color: #93b8d6; border-color: rgba(147,184,214,.38); background: rgba(147,184,214,.10); }
      &--gender { color: #7fb58f; border-color: rgba(127,181,143,.38); background: rgba(127,181,143,.10); }
      &--type { color: var(--indigo2, #b3a6f6); border-color: rgba(136,120,226,.42); background: rgba(136,120,226,.12); }
      &--state { color: #d9a9b8; border-color: rgba(217,169,184,.4); background: rgba(217,169,184,.10); }
    }

    @media (prefers-reduced-motion: reduce) {
      :host { perspective: none; }
      .wcard { transform: none !important; }
    }
  `,
})
export class MorphWordCardComponent implements AfterViewInit, OnDestroy {
  private readonly gsap = inject(QuranGsapService);

  readonly card = input.required<MorphCardVm>();
  @Output() open = new EventEmitter<void>();
  @Output() openRoot = new EventEmitter<void>();

  private readonly cardEl = viewChild<ElementRef<HTMLElement>>('cardEl');
  private cleanup: (() => void) | null = null;

  ngAfterViewInit(): void {
    const el = this.cardEl()?.nativeElement;
    if (!el) return;
    this.gsap.reveal3dCards([el]);
    this.cleanup = this.gsap.setup3dCard(el);
  }

  ngOnDestroy(): void { this.cleanup?.(); }

  /** Split the semantic arc into runs, flagging arrows so they render gold. */
  arcParts(arc: string): ArcPart[] {
    return String(arc)
      .split(/\s*(→|←|⟶|⟵)\s*/)
      .filter(s => s.length)
      .map(s => ({ t: s, arrow: /^[→←⟶⟵]$/.test(s) }));
  }

  onRoot(e: Event): void { e.stopPropagation(); this.openRoot.emit(); }
}
