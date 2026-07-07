import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MorphBlockVm, Tri, Lang } from '../../../../../../../shared/services/quran/quran-surah.service';

interface RegChip { label: string; cls: string; }

const REG_CHIP: Record<string, RegChip> = {
  linguistic: { label: 'Linguistic', cls: 'reg-ling' },
  modern:     { label: 'Modern',     cls: 'reg-modern' },
  tafsir:     { label: 'Tafsīr',     cls: 'reg-tafsir' },
  quran:      { label: 'Qurʾān',     cls: 'reg-quran' },
  classical:  { label: 'Classical',  cls: 'reg-classical' },
  msa:        { label: 'MSA',        cls: 'reg-msa' },
};

// SVG icon glyph per block type (design's _icon set). viewBox 0 0 24 24.
const D = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="1.3" fill="currentColor"/>`;
const ICONS: Record<string, string> = {
  root_dna:      '<circle cx="12" cy="6" r="3"/><path d="M12 9v4M12 13l-4 5M12 13l4 5M12 13v5"/>',
  sarf:          '<path d="M4 8h16M4 12h16M4 16h16M9 6v12"/>',
  derivations:   '<path d="M6 12h5M11 12l6-5M11 12l6 5M11 7v10"/>',
  irab:          '<path d="M4 7h10l4 5-4 5H4z"/>' + D(8, 12),
  lexicon:       '<path d="M12 6c-2-1.5-5-1.5-7 0v11c2-1.5 5-1.5 7 0M12 6c2-1.5 5-1.5 7 0v11c-2-1.5-5-1.5-7 0M12 6v11"/>',
  synthesis:     '<circle cx="9" cy="10" r="4"/><circle cx="15" cy="10" r="4"/><circle cx="12" cy="15" r="4"/>',
  balagha:       '<path d="M8 7c-2 1-3 3-3 6h4V7zM17 7c-2 1-3 3-3 6h4V7z"/>',
  metaphor:      '<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.2"/>',
  kindred:       '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  translators:   '<path d="M4 7h7M7 7v10M4 17h6M14 9l4 8M18 9l3 8M15.2 14h5.6"/>',
  occurrences:   '<path d="M8 7h12M8 12h12M8 17h12"/>' + D(4.5, 7) + D(4.5, 12) + D(4.5, 17),
  development:   '<path d="M4 18l5-5 4 3 7-8M20 8h-4M20 8v4"/>',
  tafsir:        '<path d="M7 5h10v14l-5-3-5 3zM9.5 9h5M9.5 12h5"/>',
  usage_map:     D(8, 8) + D(12, 8) + D(16, 8) + D(8, 12) + D(12, 12) + D(16, 12) + D(8, 16) + D(12, 16) + D(16, 16),
  master_story:  '<path d="M12 4l2 5 5 .5-4 3.5 1.5 5-4.5-3-4.5 3 1.5-5-4-3.5 5-.5z"/>',
  constellation: '<circle cx="12" cy="12" r="1.3" fill="currentColor"/><path d="M12 12L12 5M12 12L18 16M12 12L6 16"/>',
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './morph-block.component.html',
  styleUrl: './morph-block.component.scss',
})
export class MorphBlockComponent {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: Lang = 'en';
  @Input() focusSurface: string | null = null;

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
  /** Suppress the generic bordered illustration for blocks that render their own banner. */
  showIllu(): boolean { return !!this.block.illustration?.url && this.block.type !== 'master_story'; }

  iconSvg(): SafeHtml {
    const paths = ICONS[this.block.type] ?? '<circle cx="12" cy="12" r="3"/>';
    const svg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block">${paths}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

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

  private esc(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  }
  private richHtml(str: string): string {
    if (!str) return '';
    const arCount = (str.match(/[؀-ۿ]/g) || []).length;
    const latCount = (str.match(/[A-Za-z]/g) || []).length;
    const arP = this.lang === 'ar' || arCount > latCount;
    const seg = (text: string, mode: 'plain' | 'key' | 'crit'): string => {
      const tok = /([؀-ۿ](?:[؀-ۿ]|\s(?=[؀-ۿ]))*)|([←→⟶])/g;
      let out = '', last = 0, m: RegExpExecArray | null;
      const wrap = (t: string) => {
        const e = this.esc(t);
        if (mode === 'crit') return `<b class="rc">${e}</b>`;
        if (mode === 'key') return `<b class="rk">${e}</b>`;
        return e;
      };
      while ((m = tok.exec(text))) {
        if (m.index > last) out += wrap(text.slice(last, m.index));
        if (m[1]) {
          out += (arP && mode === 'plain') ? this.esc(m[1]) : `<span dir="rtl" class="ra ${mode}">${this.esc(m[1])}</span>`;
        } else if (m[2]) {
          out += `<span class="rarrow ${mode}">${m[2]}</span>`;
        }
        last = tok.lastIndex;
      }
      if (last < text.length) out += wrap(text.slice(last));
      return out;
    };
    const mk = /(==)([^=]+)==|(\*\*)([^*]+)\*\*/g;
    let out = '', last = 0, m: RegExpExecArray | null;
    while ((m = mk.exec(str))) {
      if (m.index > last) out += seg(str.slice(last, m.index), 'plain');
      out += m[1] === '==' ? seg(m[2], 'crit') : seg(m[4], 'key');
      last = mk.lastIndex;
    }
    if (last < str.length) out += seg(str.slice(last), 'plain');
    return out;
  }

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

  /** Word constellation — center + orbiting nodes on a ring (design look). */
  constel(data: any): {
    center: string;
    nodes: Array<{ label: string; en: string; color: string; xPct: number; yPct: number; x1: number; y1: number; x2: number; y2: number; right: boolean }>;
  } {
    const nodes = (data?.nodes ?? []) as any[];
    const n = Math.max(1, nodes.length);
    const inner = 13;
    return {
      center: data?.center ?? '',
      nodes: nodes.map((node, i) => {
        const ang = (-90 + (i * 360) / n) * Math.PI / 180;
        const r = node.kind === 'anchor' ? 24 : 39;
        const x = 50 + r * Math.cos(ang), y = 50 + r * Math.sin(ang);
        const x1 = 50 + inner * Math.cos(ang), y1 = 50 + inner * Math.sin(ang);
        const en = this.lang === 'ur' ? (node.ur || node.en) : node.en;
        return {
          label: node.label, en: en ?? '', color: this.KIND_COLOR[node.kind] ?? '#e8c96a',
          xPct: +x.toFixed(2), yPct: +y.toFixed(2),
          x1: +x1.toFixed(2), y1: +y1.toFixed(2), x2: +x.toFixed(2), y2: +y.toFixed(2),
          right: Math.cos(ang) >= -0.1,
        };
      }),
    };
  }
}
