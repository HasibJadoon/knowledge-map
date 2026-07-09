import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** One TOC entry — mirrors a rendered block, scrolls to it. */
export interface TocItem { ord: string; title: string; titleAr: string; domId: string; hot: boolean; isUr?: boolean; }

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
  templateUrl: './morph-toc-rail.component.html',
  styleUrl: './morph-toc-rail.component.scss',
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
