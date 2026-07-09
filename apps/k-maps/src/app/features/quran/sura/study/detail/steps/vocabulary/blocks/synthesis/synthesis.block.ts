import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockBase } from '../../morph-block-base.directive';
import { SynthesisData } from '../../morph-block.types';

const STRAND_ACCENT: Record<string, string> = {
  lexicon: '#c9a84c', sinai: '#93b8d6', verbal_idiom: '#b3a6f6', tafsir: '#e8c96a',
};

@Component({
  selector: 'km-mb-synthesis',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './synthesis.block.html',
  styleUrl: './synthesis.block.scss',
})
export class SynthesisBlock extends MorphBlockBase {
  get d(): SynthesisData { return (this.block.data ?? {}) as SynthesisData; }

  strands(): any[] {
    return (this.d.strands ?? []).map(s => ({
      ...s, accent: STRAND_ACCENT[s.kind] ?? '#c9a84c',
    }));
  }

  synWeave(): { center: string; output: string; origins: { color: string; concept: string; isUr?: boolean; topPct: string; path: string }[]; producePath: string } {
    const strands = this.strands();
    const W = 600, H = 210, cvx = 0.63 * W, cvy = 0.5 * H, rim = 50;
    const originX = 30, meetX = cvx - rim, exitX = cvx + rim;
    const n = strands.length || 1;
    const origins = strands.map((s, i) => {
      const yf = (i + 0.5) / n, y = yf * H;
      return {
        color: s.accent, concept: (this.lang === 'ur' ? (s.concept_ur || s.concept) : s.concept) || s.en || '',
        isUr: this.lang === 'ur' && !!s.concept_ur, topPct: (yf * 100).toFixed(1) + '%',
        path: `M${originX} ${y.toFixed(1)} C ${(0.34 * W).toFixed(0)} ${y.toFixed(1)}, ${(meetX - 66).toFixed(0)} ${(cvy + (y - cvy) * 0.14).toFixed(1)}, ${meetX.toFixed(0)} ${cvy.toFixed(1)}`,
      };
    });
    const out = typeof this.d.output === 'string' ? this.d.output : this.t(this.d.output);
    return { center: this.heroWord || 'مبين', output: out, origins, producePath: `M${exitX} ${cvy} L ${W} ${cvy}` };
  }
}
