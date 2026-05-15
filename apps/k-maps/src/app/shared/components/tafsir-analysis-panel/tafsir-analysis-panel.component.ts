import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { QrTafsirGroupDisplayPayload, QrTafsirDisplayBlock } from '../../models/quran/qr.models';

interface CountedTag { label: string; count: number; meta?: string; }

/**
 * Tafsir analysis panel — aggregates content signals out of a tafsir
 * display payload to give the reader a quick map of:
 *
 *   • Block-type distribution (isnad, poetry, voice_marker, verse_anchor, …)
 *   • Scholars present in this view + their block counts
 *   • Madhab distribution
 *   • Era distribution (classical / modern)
 *   • Long-form coverage (entries split into paragraph_section blocks)
 *
 * Mirrors the iʿrāb-analysis-panel visual style: dense card-stack with
 * [● dot] + [▾ chevron] + [⊞ expand] + title + count headers.
 */
@Component({
  selector: 'km-tafsir-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tafsir-analysis-panel.component.html',
  styleUrl: './tafsir-analysis-panel.component.scss',
})
export class TafsirAnalysisPanelComponent {
  readonly payload = input<QrTafsirGroupDisplayPayload | null>(null);

  // ── Block type distribution ───────────────────────────────────────────────
  private readonly TYPE_LABELS: Record<string, string> = {
    tafsir_card:        'بطاقات التفسير',
    paragraph_section:  'فقرات مطوّلة',
    isnad:              'سلاسل الإسناد',
    voice_marker:       'علامات الكلام',
    poetry_quote:       'الشواهد الشعرية',
    verse_anchor:       'مراسي الآيات',
    quran_ref_chip:     'إحالات قرآنية',
    hadith_source_chip: 'مصادر الحديث',
    paradigm_chip:      'مدارس كلامية',
    scholar_response:   'ردود علمائية',
  };
  /** Order in which to display block types (most interpretive → most cross-ref). */
  private readonly TYPE_ORDER = [
    'tafsir_card','paragraph_section','isnad','voice_marker','poetry_quote',
    'verse_anchor','paradigm_chip','scholar_response','hadith_source_chip','quran_ref_chip',
  ];
  readonly blockTypes = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks) {
      const t = b.block_type;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return this.TYPE_ORDER
      .filter(t => counts.has(t))
      .map(t => ({ label: this.TYPE_LABELS[t] ?? t, count: counts.get(t)!, meta: t }));
  });

  // ── Scholars present ──────────────────────────────────────────────────────
  readonly scholarsPresent = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, { count: number; label: string }>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (!b.scholar_id) continue;
      const key = b.scholar_id;
      const cur = counts.get(key);
      const label = b.scholar_name_ar ?? b.scholar_id;
      if (cur) cur.count++;
      else counts.set(key, { count: 1, label });
    }
    return [...counts.values()]
      .map(x => ({ label: x.label, count: x.count }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Madhab distribution ───────────────────────────────────────────────────
  private readonly MADHAB_LABELS: Record<string, string> = {
    sunni: 'سني', maliki: 'مالكي', shafii: 'شافعي', hanbali: 'حنبلي',
    hanafi: 'حنفي', mutazili: 'معتزلي', ashari: 'أشعري', athari: 'أثري',
  };
  readonly madhabs = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (!b.madhab) continue;
      counts.set(b.madhab, (counts.get(b.madhab) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ label: this.MADHAB_LABELS[key] ?? key, count, meta: key }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Era distribution ──────────────────────────────────────────────────────
  readonly eras = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (!b.era) continue;
      counts.set(b.era, (counts.get(b.era) ?? 0) + 1);
    }
    const labels: Record<string, string> = { classical: 'كلاسيكي', modern: 'حديث' };
    return [...counts.entries()]
      .map(([key, count]) => ({ label: labels[key] ?? key, count }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Long-form coverage ────────────────────────────────────────────────────
  readonly longFormCoverage = computed<{ count: number; paragraphs: number; scholars: string[] } | null>(() => {
    const p = this.payload();
    if (!p) return null;
    let longCount = 0;
    let paragraphs = 0;
    const scholars = new Set<string>();
    for (const b of p.blocks as QrTafsirDisplayBlock[]) {
      if (b.is_long_form && b.block_type === 'tafsir_card') {
        longCount++;
        if (b.scholar_name_ar) scholars.add(b.scholar_name_ar);
      }
      if (b.block_type === 'paragraph_section') paragraphs++;
    }
    if (longCount === 0 && paragraphs === 0) return null;
    return { count: longCount, paragraphs, scholars: [...scholars] };
  });

  // ── Collapse state ────────────────────────────────────────────────────────
  readonly collapsed = signal<Set<string>>(new Set());
  isCollapsed(key: string): boolean { return this.collapsed().has(key); }
  toggle(key: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  readonly hasAnyContent = computed(() =>
    this.blockTypes().length > 0 ||
    this.scholarsPresent().length > 0 ||
    this.madhabs().length > 0 ||
    this.eras().length > 0 ||
    this.longFormCoverage() !== null,
  );
}
