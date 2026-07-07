import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  LucideAngularModule, LUCIDE_ICONS, LucideIconProvider,
  Dna, Ruler, GitFork, Tag, BookOpen, Landmark, Waypoints, Feather, Eye,
  GitCompare, Languages, ListOrdered, TrendingUp, Library, Grid3x3, Sparkles, Orbit,
  Sunrise, Star, Scale, Split, LayoutGrid, KeyRound, Link, Circle, MapPin, Quote,
} from 'lucide-angular';
import { MorphBlockVm, Tri, Lang } from '../../../../../../../shared/services/quran/quran-surah.service';
import { richMarkup } from './morph-rich';

interface RegChip { label: string; cls: string; }

const REG_CHIP: Record<string, RegChip> = {
  linguistic: { label: 'Linguistic', cls: 'reg-ling' },
  modern:     { label: 'Modern',     cls: 'reg-modern' },
  tafsir:     { label: 'Tafsīr',     cls: 'reg-tafsir' },
  quran:      { label: 'Qurʾān',     cls: 'reg-quran' },
  classical:  { label: 'Classical',  cls: 'reg-classical' },
  msa:        { label: 'MSA',        cls: 'reg-msa' },
};

// Registered Lucide pool. The icon *name* comes from the data (block.icon / item.icon);
// this is just the available set — no per-block icon logic in the component.
const LUCIDE_POOL = {
  Dna, Ruler, GitFork, Tag, BookOpen, Landmark, Waypoints, Feather, Eye, GitCompare,
  Languages, ListOrdered, TrendingUp, Library, Grid3x3, Sparkles, Orbit,
  Sunrise, Star, Scale, Split, LayoutGrid, KeyRound, Link, Circle, MapPin, Quote,
};

// usage-map weight (0..3) → dot size / colour / glow
const USAGE_CELL = [
  { size: '0px',  color: 'transparent',         glow: 'none' },
  { size: '8px',  color: 'rgba(201,168,76,.28)', glow: 'none' },
  { size: '12px', color: 'rgba(201,168,76,.6)',  glow: 'none' },
  { size: '15px', color: '#e8c96a',              glow: '0 0 10px rgba(201,168,76,.5)' },
];

// translator reading tag → colour
const READING: Record<string, { fg: string; bd: string }> = {
  partial:   { fg: '#93b8d6', bd: 'rgba(147,184,214,.4)' },
  causative: { fg: '#e8c96a', bd: 'rgba(201,168,76,.4)' },
  both:      { fg: '#b3a6f6', bd: 'rgba(136,120,226,.4)' },
};

// synthesis strand kind → accent
const STRAND_ACCENT: Record<string, string> = {
  lexicon: '#c9a84c', sinai: '#93b8d6', verbal_idiom: '#b3a6f6', tafsir: '#e8c96a',
};

/**
 * Renders ONE typed morphology block in the Morph Display Layer style: an
 * illuminated card with icon · order · title · register chip · collapse chrome,
 * then a type-specific body. Trilingual; Arabic terms stay Arabic. Inline prose
 * supports **key** / ==critical== / → arrow markup. Pure presentation.
 */
@Component({
  selector: 'km-morph-block',
  standalone: true,
  imports: [LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LUCIDE_POOL) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './morph-block.component.html',
  styleUrl: './morph-block.component.scss',
})
export class MorphBlockComponent {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: Lang = 'en';
  @Input() focusSurface: string | null = null;
  @Input() heroWord = '';   // bare lemma, for the synthesis weave centre

  private readonly sanitizer = inject(DomSanitizer);

  collapsed = false;
  toggle(): void { this.collapsed = !this.collapsed; }

  private readonly revealed = new Set<number>();
  isRevealed(i: number): boolean { return this.revealed.has(i); }
  toggleReveal(i: number): void { this.revealed.has(i) ? this.revealed.delete(i) : this.revealed.add(i); }

  t(tri: Tri | null | undefined): string {
    if (!tri) return '';
    return (tri[this.lang] ?? tri.en ?? tri.ar ?? '') as string;
  }
  tr(o: any): string { if (!o) return ''; return o[this.lang] ?? o.en ?? o.ar ?? ''; }
  isRtlText(): boolean { return this.lang !== 'en'; }

  ord(): string { return String(this.block.order ?? 0).padStart(2, '0'); }
  titleEn(): string { return this.block.title.en || this.block.title.ar || this.block.type; }
  bare(s: string | null | undefined): string { return (s ?? '').replace(/[ً-ْٰـ]/g, ''); }
  /** Suppress the generic bordered illustration for blocks that render their own banner/weave. */
  showIllu(): boolean {
    return !!this.block.illustration?.url && this.block.type !== 'master_story' && this.block.type !== 'synthesis';
  }

  /** Icon name (Lucide token) for the block header — from the data. */
  headIcon(): string { return this.block.icon || 'circle'; }

  regChips(): RegChip[] {
    const regs = (this.block.registers && this.block.registers.length)
      ? this.block.registers : (this.block.register ? [this.block.register] : []);
    return regs.map(r => REG_CHIP[r] ?? { label: r, cls: 'reg-ling' });
  }

  /** usage_map projection: axes + rows of weighted dots. */
  usageMap(): { axes: any[]; rows: Array<{ ref: string; label: string; cells: typeof USAGE_CELL[number][] }> } {
    const d = this.block.data ?? {};
    const axes = d.axes ?? [];
    const n = axes.length || 6;
    const rows = (d.rows ?? []).map((row: any) => ({
      ref: row.ref, label: row.label,
      cells: Array.from({ length: n }, (_, i) => USAGE_CELL[Math.max(0, Math.min(3, (row.weights ?? [])[i] | 0))]),
    }));
    return { axes, rows };
  }

  /** translator renderings with reading-tag colours. */
  renderings(): any[] {
    return (this.block.data?.renderings ?? []).map((r: any) => {
      const tag = (r.reading || 'partial').toLowerCase();
      const c = READING[tag] ?? READING['partial'];
      return { ...r, reading: (r.reading || '').toUpperCase(), fg: c.fg, bd: c.bd };
    });
  }

  /** synthesis strands with per-source accent + rtl badge detection. */
  strands(): any[] {
    return (this.block.data?.strands ?? []).map((s: any) => ({
      ...s, accent: STRAND_ACCENT[s.kind] ?? '#c9a84c',
      badgeRtl: /[؀-ۿ]/.test(s.badge || ''),
    }));
  }

  /** occurrences items (each = one context tile). */
  occItems(): any[] { return this.block.data?.items ?? []; }

  /** Rich inline prose: **key** → gold, ==critical== → pink, → ← ⟶ → glowing
   *  connectors, embedded Arabic → Amiri gold. Returns sanitized HTML. */
  rich(str: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.richHtml(str ?? ''));
  }
  richText(tri: Tri | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.richHtml(this.t(tri)));
  }

  private richHtml(str: string): string { return richMarkup(str, this.lang); }

  private norm(s: string): string {
    return s.replace(/[ً-ْٰـ۝]/g, '').replace(/[آأإٱ]/g, 'ا');
  }
  ayahParts(text: string | null | undefined, surface: string | null | undefined): { t: string; hit: boolean }[] {
    if (!text) return [];
    if (!surface) return [{ t: text, hit: false }];
    const bare = this.norm(surface);
    return text.split(/(\s+)/).map(tok => {
      const tb = this.norm(tok);
      return { t: tok, hit: tb.length > 1 && (tb === bare || tb.includes(bare) || bare.includes(tb)) };
    });
  }
  arNum(n: number | null | undefined): string {
    return (n ?? '').toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  private readonly KIND_COLOR: Record<string, string> = {
    derived: '#e8c96a', anchor: '#e8c96a', aspect: '#93b8d6', synonym: '#93b8d6', contrast: '#e0645f',
  };

  /** Word constellation — center {ar,root} + nodes placed by data angle/ring/kind. */
  constel(data: any): {
    centerAr: string; centerRoot: string;
    nodes: Array<{ label: string; en: string; color: string; xPct: number; yPct: number; x1: number; y1: number; x2: number; y2: number; right: boolean }>;
  } {
    const nodes = (data?.nodes ?? []) as any[];
    const c = data?.center;
    const RAD: Record<number, number> = { 1: 27, 2: 41 };
    const inner = 13;
    return {
      centerAr: (c && typeof c === 'object' ? c.ar : c) ?? '',
      centerRoot: (c && typeof c === 'object' ? c.root : '') ?? '',
      nodes: nodes.map(node => {
        const ang = (node.angle ?? 0) * Math.PI / 180;
        const r = RAD[node.ring] ?? 34;
        const x = 50 + r * Math.cos(ang), y = 50 + r * Math.sin(ang);
        const x1 = 50 + inner * Math.cos(ang), y1 = 50 + inner * Math.sin(ang);
        const en = this.lang === 'ur' ? (node.ur || node.en) : node.en;
        return {
          label: node.ar ?? node.label ?? '', en: en ?? '', color: this.KIND_COLOR[node.kind] ?? '#e8c96a',
          xPct: +x.toFixed(2), yPct: +y.toFixed(2),
          x1: +x1.toFixed(2), y1: +y1.toFixed(2), x2: +x.toFixed(2), y2: +y.toFixed(2),
          right: Math.cos(ang) >= -0.1,
        };
      }),
    };
  }

  /** Synthesis weave — N source strands converge into one reading (live SVG). */
  synWeave(): {
    center: string; output: string;
    origins: Array<{ color: string; concept: string; topPct: string; path: string }>;
    producePath: string;
  } {
    const strands = this.strands();
    const W = 600, H = 210, cvx = 0.63 * W, cvy = 0.5 * H, rim = 50;
    const originX = 30, meetX = cvx - rim, exitX = cvx + rim;
    const n = strands.length || 1;
    const origins = strands.map((s, i) => {
      const yf = (i + 0.5) / n, y = yf * H;
      return {
        color: s.accent, concept: s.concept || s.en || '', topPct: (yf * 100).toFixed(1) + '%',
        path: `M${originX} ${y.toFixed(1)} C ${(0.34 * W).toFixed(0)} ${y.toFixed(1)}, ${(meetX - 66).toFixed(0)} ${(cvy + (y - cvy) * 0.14).toFixed(1)}, ${meetX.toFixed(0)} ${cvy.toFixed(1)}`,
      };
    });
    return {
      center: this.heroWord || 'مبين',
      output: this.block.data?.output ?? '',
      origins,
      producePath: `M${exitX} ${cvy} L ${W} ${cvy}`,
    };
  }
}
