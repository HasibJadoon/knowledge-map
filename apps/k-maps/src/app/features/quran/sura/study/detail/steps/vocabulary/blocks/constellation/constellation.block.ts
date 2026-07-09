import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { ConstellationData } from '../../morph-block.types';

const KIND_COLOR: Record<string, string> = {
  derived: '#e8c96a', anchor: '#e8c96a', aspect: '#93b8d6', synonym: '#93b8d6', contrast: '#e0645f',
};

@Component({
  selector: 'km-mb-constellation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './constellation.block.html',
  styleUrl: './constellation.block.scss',
})
export class ConstellationBlock extends MorphBlockBase {
  get d(): ConstellationData { return (this.block.data ?? {}) as ConstellationData; }

  constel(): { centerAr: string; centerRoot: string; nodes: { label: string; en: string; isUr?: boolean; color: string; xPct: number; yPct: number; x1: number; y1: number; x2: number; y2: number; right: boolean }[] } {
    const data = this.d;
    const nodes = data.nodes ?? [];
    const c: any = data.center;
    const RAD: Record<number, number> = { 1: 27, 2: 41 };
    const inner = 13;
    return {
      centerAr: (c && typeof c === 'object' ? c.ar : c) ?? '',
      centerRoot: (c && typeof c === 'object' ? c.root : '') ?? '',
      nodes: nodes.map(node => {
        const ang = (node.angle ?? 0) * Math.PI / 180;
        const r = RAD[node.ring ?? 0] ?? 34;
        const x = 50 + r * Math.cos(ang), y = 50 + r * Math.sin(ang);
        const x1 = 50 + inner * Math.cos(ang), y1 = 50 + inner * Math.sin(ang);
        const en = this.lang === 'ur' ? (node.ur || node.en) : node.en;
        const isUr = this.lang === 'ur' && !!node.ur;
        return {
          label: node.ar ?? node.label ?? '', en: en ?? '', isUr, color: KIND_COLOR[node.kind ?? ''] ?? '#e8c96a',
          xPct: +x.toFixed(2), yPct: +y.toFixed(2),
          x1: +x1.toFixed(2), y1: +y1.toFixed(2), x2: +x.toFixed(2), y2: +y.toFixed(2),
          right: Math.cos(ang) >= -0.1,
        };
      }),
    };
  }
}
