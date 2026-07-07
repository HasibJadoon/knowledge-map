import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** One TOC entry — mirrors a rendered block, scrolls to it. */
export interface TocItem { ord: string; title: string; titleAr: string; domId: string; hot: boolean; }

/** Register filter option, derived from the blocks actually present. */
export interface RegOption { key: string; label: string; }

/**
 * Presentational TOC rail for the Morph Display Layer — register filter plus
 * collapsible Core / Temporal sections. Pure renderer; emits register changes,
 * section toggles, and scroll-to requests.
 */
@Component({
  selector: 'km-morph-toc-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="mw-toc">
      <div class="mw-toc__head">
        <span class="mw-toc__title">The Word's Story</span>
        <span class="mw-toc__title-ar ar">قصة الكلمة</span>
      </div>

      @if (regOptions.length > 1) {
        <div class="mw-toc__reg">
          @for (r of regOptions; track r.key) {
            <button [class.on]="reg === r.key" (click)="setReg.emit(r.key)">{{ r.label }}</button>
          }
        </div>
      }

      <nav class="mw-toc__nav">
        <div class="mw-toc__sec mw-toc__sec--core" (click)="toggleCore.emit()">
          <span class="dot"></span><span class="lbl">Core · static</span>
          <span class="chev" [class.closed]="!coreOpen">▾</span>
        </div>
        @if (coreOpen) {
          @for (t of tocCore; track t.domId) {
            <button class="mw-toc__item" [class.hot]="t.hot" (click)="scrollTo.emit(t.domId)">
              <span class="n">{{ t.ord }}</span>
              <span class="tx"><span class="en">{{ t.title }}</span><span class="ar">{{ t.titleAr }}</span></span>
            </button>
          }
        }

        @if (tocTemporal.length) {
          <div class="mw-toc__sec mw-toc__sec--temp" (click)="toggleCtx.emit()">
            <span class="dot"></span><span class="lbl">Temporal · context</span>
            <span class="chev" [class.closed]="!ctxOpen">▾</span>
          </div>
          @if (ctxOpen) {
            @for (t of tocTemporal; track t.domId) {
              <button class="mw-toc__item" [class.hot]="t.hot" (click)="scrollTo.emit(t.domId)">
                <span class="n">{{ t.ord }}</span>
                <span class="tx"><span class="en">{{ t.title }}</span><span class="ar">{{ t.titleAr }}</span></span>
              </button>
            }
          }
        }
      </nav>
    </aside>
  `,
  styles: `
    :host { display: block; }

    .mw-toc {
      flex: 0 0 268px; display: flex; flex-direction: column; overflow: hidden;
      border-inline-end: 1px solid var(--edge); background: var(--g2);

      &__head { padding: 18px 20px 12px; border-bottom: 1px solid var(--edge2); }
      &__title { display: block; font: 600 11px/1 var(--head); letter-spacing: .22em; text-transform: uppercase; color: var(--gold); }
      &__title-ar { display: block; font-size: 12px; color: var(--faint); margin-top: 5px; }

      &__reg {
        display: flex; gap: 5px; flex-wrap: wrap; padding: 12px 14px; border-bottom: 1px solid var(--edge2);
        button {
          font: 600 10px/1 var(--en); letter-spacing: .03em; cursor: pointer; padding: 6px 10px; border-radius: 999px;
          border: 1px solid var(--edge); color: var(--muted); background: transparent;
          &.on { border-color: var(--golddim); color: var(--gold2); background: rgba(201,168,76,.08); }
        }
      }

      &__nav { overflow-y: auto; padding: 9px 8px 24px; display: flex; flex-direction: column; gap: 1px; }

      &__sec {
        display: flex; align-items: center; gap: 7px; padding: 10px 11px 7px; cursor: pointer; user-select: none;
        .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
        .lbl { font: 600 9px/1 var(--mono); letter-spacing: .15em; text-transform: uppercase; }
        .chev { margin-inline-start: auto; font-size: 11px; transition: transform .18s; &.closed { transform: rotate(-90deg); } }
        &--core { margin-top: 2px; .dot { background: var(--gold); } .lbl, .chev { color: var(--gold); } }
        &--temp { margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--edge2); .dot { background: var(--sky); } .lbl, .chev { color: var(--sky); } }
      }

      &__item {
        display: flex; align-items: center; gap: 11px; text-align: left; padding: 9px 11px; border-radius: 7px;
        cursor: pointer; color: var(--ink2); border: 1px solid transparent; background: none;
        .n { flex: none; width: 26px; height: 26px; display: grid; place-items: center;
             font: 600 10px/1 var(--mono); color: var(--muted); border: 1px solid var(--edge); border-radius: 50%; }
        .tx { display: flex; flex-direction: column; min-width: 0; }
        .en { font: 600 12.5px/1.2 var(--head); letter-spacing: .03em; }
        .ar { font-size: 11px; color: var(--faint); margin-top: 1px; }
        &:hover { background: rgba(255,255,255,.03); }
        &.hot { color: var(--gold2); border-color: rgba(201,168,76,.22); background: rgba(201,168,76,.05); .n { color: var(--gold2); border-color: var(--golddim); } }
      }
    }
  `,
})
export class MorphTocRailComponent {
  @Input() tocCore: TocItem[] = [];
  @Input() tocTemporal: TocItem[] = [];
  @Input() regOptions: RegOption[] = [];
  @Input() reg = 'all';
  @Input() coreOpen = true;
  @Input() ctxOpen = true;
  @Output() setReg = new EventEmitter<string>();
  @Output() toggleCore = new EventEmitter<void>();
  @Output() toggleCtx = new EventEmitter<void>();
  @Output() scrollTo = new EventEmitter<string>();
}
