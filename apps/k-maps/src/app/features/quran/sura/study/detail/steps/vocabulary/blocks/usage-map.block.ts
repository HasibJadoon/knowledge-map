import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { UsageMapData } from '../morph-block.types';

const USAGE_CELL = [
  { size: '0px',  color: 'transparent',         glow: 'none' },
  { size: '8px',  color: 'rgba(201,168,76,.28)', glow: 'none' },
  { size: '12px', color: 'rgba(201,168,76,.6)',  glow: 'none' },
  { size: '15px', color: '#e8c96a',              glow: '0 0 10px rgba(201,168,76,.5)' },
];

@Component({
  selector: 'km-mb-usage-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    @if (usageMap(); as um) {
      <div class="umap" [style.--cols]="um.axes.length">
        <div class="umap__cell umap__corner"></div>
        @for (ax of um.axes; track ax.en) { <div class="umap__cell umap__ax"><span class="ar">{{ ax.ar }}</span><small>{{ ax.en }}</small></div> }
        @for (row of um.rows; track row.ref) {
          <div class="umap__cell umap__rl"><b>{{ row.ref }}</b><small class="ar">{{ row.label }}</small></div>
          @for (c of row.cells; track $index) {
            <div class="umap__cell umap__dot"><span [style.width]="c.size" [style.height]="c.size" [style.background]="c.color" [style.box-shadow]="c.glow"></span></div>
          }
        }
      </div>
    }
  `,
  styles: `
    .umap { display: grid; grid-template-columns: 120px repeat(var(--cols, 6), minmax(56px, 1fr)); gap: 0; overflow-x: auto;
      &__cell { border-bottom: 1px solid var(--edge2); }
      &__corner, &__ax { border-bottom: 1px solid var(--edge); }
      &__ax { padding: 0 4px 10px; text-align: center; .ar { display: block; font-size: 13px; color: var(--gold2); } small { display: block; font: 600 8.5px/1.1 var(--mono); text-transform: uppercase; color: var(--muted); margin-top: 3px; } }
      &__rl { display: flex; flex-direction: column; justify-content: center; padding: 10px 8px; b { font: 600 11px/1 var(--mono); color: var(--ink); } small { font-size: 10.5px; color: var(--faint); margin-top: 2px; } }
      &__dot { display: grid; place-items: center; padding: 10px 0; span { border-radius: 50%; } } }
  `,
})
export class UsageMapBlock extends MorphBlockBase {
  get d(): UsageMapData { return (this.block.data ?? {}) as UsageMapData; }

  usageMap(): { axes: { ar: string; en: string }[]; rows: { ref: string; label: string; cells: typeof USAGE_CELL[number][] }[] } {
    const axes = this.d.axes ?? [];
    const n = axes.length || 6;
    const rows = (this.d.rows ?? []).map(row => ({
      ref: row.ref, label: row.label,
      cells: Array.from({ length: n }, (_, i) => USAGE_CELL[Math.max(0, Math.min(3, (row.weights ?? [])[i] | 0))]),
    }));
    return { axes, rows };
  }
}
