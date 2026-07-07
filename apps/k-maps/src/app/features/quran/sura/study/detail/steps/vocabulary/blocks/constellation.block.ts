import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MorphBlockBase } from '../morph-block-base.directive';
import { ConstellationData } from '../morph-block.types';

const KIND_COLOR: Record<string, string> = {
  derived: '#e8c96a', anchor: '#e8c96a', aspect: '#93b8d6', synonym: '#93b8d6', contrast: '#e0645f',
};

@Component({
  selector: 'km-mb-constellation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(block.text)) { <p class="say muted" [dir]="isRtlText() ? 'rtl' : 'ltr'" [innerHTML]="richText(block.text)"></p> }
    @if (constel(); as g) {
      <div class="cst">
        <div class="cst__ring cst__ring--1"></div>
        <div class="cst__ring cst__ring--2"></div>
        <div class="cst__ring cst__ring--3"></div>
        <svg class="cst__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          @for (n of g.nodes; track n.label) {
            <line [attr.x1]="n.x1" [attr.y1]="n.y1" [attr.x2]="n.x2" [attr.y2]="n.y2" [attr.stroke]="n.color" stroke-opacity="0.32" stroke-width="0.5" vector-effect="non-scaling-stroke"/>
          }
        </svg>
        <div class="cst__center">
          <span class="cst__center-word ar">{{ g.centerAr }}</span>
          @if (g.centerRoot) { <span class="cst__center-root ar">{{ g.centerRoot }}</span> }
        </div>
        @for (n of g.nodes; track n.label) {
          <div class="cst__node" [class.l]="!n.right" [style.left.%]="n.xPct" [style.top.%]="n.yPct" [style.--c]="n.color">
            <span class="cst__dot"></span>
            <span class="cst__lab"><b class="ar">{{ n.label }}</b><small>{{ n.en }}</small></span>
          </div>
        }
      </div>
      <div class="cst__legend">
        <span><i style="--c:#e8c96a"></i>same root · مشتقّات</span>
        <span><i style="--c:#93b8d6"></i>aspect · وجوه</span>
        <span><i style="--c:#e0645f"></i>opposite · أضداد</span>
      </div>
    }
  `,
  styles: `
    .cst { position: relative; width: 100%; max-width: 560px; margin: 6px auto 0; aspect-ratio: 1;
      &__ring { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); border-radius: 50%;
        &--1 { width: 92%; height: 92%; border: 1px solid var(--edge2); background: radial-gradient(circle, rgba(201,168,76,.05), transparent 68%); }
        &--2 { width: 68%; height: 68%; border: 1px solid var(--edge); }
        &--3 { width: 44%; height: 44%; border: 1px dashed rgba(201,168,76,.2); } }
      &__lines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
      &__center { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 112px; height: 112px; border-radius: 50%; display: grid; place-items: center; text-align: center; z-index: 3;
        background: radial-gradient(circle at 50% 35%, rgba(201,168,76,.22), rgba(0,0,0,.4));
        box-shadow: 0 0 0 1px var(--golddim), inset 0 0 30px rgba(201,168,76,.14), 0 18px 40px -20px rgba(201,168,76,.5); }
      &__center-word { font-family: var(--quran); font-size: 30px; line-height: 1; color: var(--gold2); text-shadow: 0 3px 18px rgba(201,168,76,.5); }
      &__center-root { display: block; font-family: var(--ar); font-size: 11px; letter-spacing: 4px; color: var(--gold); margin-top: 6px; }
      &__node { position: absolute; display: flex; align-items: center; gap: 7px; z-index: 2; white-space: nowrap; transform: translate(0,-50%);
        &.l { transform: translate(-100%,-50%); flex-direction: row-reverse; text-align: right; }
        .cst__dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--c); box-shadow: 0 0 9px var(--c); }
        .cst__lab { display: flex; flex-direction: column; line-height: 1.2; text-shadow: 0 1px 4px #000;
          b { font-family: var(--ar); font-size: 16px; font-weight: 500; color: var(--c); }
          small { font: 400 9.5px/1.2 var(--en); color: var(--faint); margin-top: 1px; } }
        &.l .cst__lab { align-items: flex-end; } } }
    .cst__legend { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: center; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--edge2);
      span { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: var(--muted); }
      i { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); } }
  `,
})
export class ConstellationBlock extends MorphBlockBase {
  get d(): ConstellationData { return (this.block.data ?? {}) as ConstellationData; }

  constel(): { centerAr: string; centerRoot: string; nodes: { label: string; en: string; color: string; xPct: number; yPct: number; x1: number; y1: number; x2: number; y2: number; right: boolean }[] } {
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
        return {
          label: node.ar ?? node.label ?? '', en: en ?? '', color: KIND_COLOR[node.kind ?? ''] ?? '#e8c96a',
          xPct: +x.toFixed(2), yPct: +y.toFixed(2),
          x1: +x1.toFixed(2), y1: +y1.toFixed(2), x2: +x.toFixed(2), y2: +y.toFixed(2),
          right: Math.cos(ang) >= -0.1,
        };
      }),
    };
  }
}
