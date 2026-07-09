import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { UsageMapData } from '../../morph-block.types';

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
  templateUrl: './usage-map.block.html',
  styleUrl: './usage-map.block.scss',
})
export class UsageMapBlock extends MorphBlockBase {
  get d(): UsageMapData { return (this.block.data ?? {}) as UsageMapData; }

  usageMap(): { axes: { ar: string; en: string; ur?: string }[]; rows: { ref: string; label: string; cells: typeof USAGE_CELL[number][] }[] } {
    const axes = this.d.axes ?? [];
    const n = axes.length || 6;
    const rows = (this.d.rows ?? []).map(row => ({
      ref: row.ref, label: row.label,
      cells: Array.from({ length: n }, (_, i) => USAGE_CELL[Math.max(0, Math.min(3, (row.weights ?? [])[i] | 0))]),
    }));
    return { axes, rows };
  }
}
