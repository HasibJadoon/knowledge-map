import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { QrIraabGroupDisplayPayload, QrIraabDisplayBlock } from '../../models/quran/qr.models';

interface CountedTag { label: string; count: number; }

/**
 * Iʿrāb analysis panel — aggregates morphology/syntax signals out of the
 * display payload to give the reader a quick overview of:
 *
 *   • Grammar roles      (نعت, خبر, فاعل, مفعول به…)
 *   • Grammatical cases  (مرفوع, منصوب, مجرور, مبني, مجزوم)
 *   • Maḥall types       (في محل رفع/نصب/جر, لا محل لها…)
 *   • Word coverage      (count of distinct target words analyzed)
 *   • Section coverage   (per-source completeness across irab/sarf/balagha)
 *
 * Sits alongside the references panel as the second extendable side panel.
 */
@Component({
  selector: 'km-iraab-analysis-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './iraab-analysis-panel.component.html',
  styleUrl: './iraab-analysis-panel.component.scss',
})
export class IraabAnalysisPanelComponent {
  readonly payload = input<QrIraabGroupDisplayPayload | null>(null);

  // Vocabulary buckets — match what the parser harvests into grammar_tags
  private readonly CASE_VOCAB = new Set(['مرفوع', 'منصوب', 'مجرور', 'مبني', 'مجزوم']);
  private readonly MAHALL_VOCAB_PREFIX = ['في محل', 'لا محل لها'];
  private readonly ROLE_KEYWORDS = [
    'فاعل', 'مفعول به', 'مبتدأ', 'خبر', 'نعت', 'بدل', 'حال', 'ظرف',
    'جار ومجرور', 'صلة الموصول', 'حرف جر', 'حرف عطف', 'حرف نصب', 'حرف نفي',
    'اسم موصول', 'فعل مضارع', 'فعل ماض', 'فعل أمر', 'ضمير متصل', 'ضمير منفصل',
    'الأفعال الخمسة',
  ];

  readonly cases = computed<CountedTag[]>(() => this.bucketGrammarTags(t => this.CASE_VOCAB.has(t)));
  readonly mahalTypes = computed<CountedTag[]>(() =>
    this.bucketGrammarTags(t => this.MAHALL_VOCAB_PREFIX.some(p => t.startsWith(p))),
  );
  readonly roles = computed<CountedTag[]>(() => this.bucketGrammarTags(t => this.ROLE_KEYWORDS.includes(t)));

  /** Distinct target words analyzed across all irab_card blocks. */
  readonly wordCoverage = computed<{ total: number; unique: number; words: string[] }>(() => {
    const p = this.payload();
    if (!p) return { total: 0, unique: 0, words: [] };
    const all: string[] = [];
    const set = new Set<string>();
    for (const b of p.blocks as QrIraabDisplayBlock[]) {
      if (b.block_type !== 'irab_card' || !b.word_text) continue;
      all.push(b.word_text);
      set.add(b.word_text);
    }
    return { total: all.length, unique: set.size, words: [...set].slice(0, 24) };
  });

  /** Section coverage across blocks for the selected source(s). */
  readonly sectionCoverage = computed<CountedTag[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks as QrIraabDisplayBlock[]) {
      const key = this.sectionKey(b);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const labels: Record<string, string> = {
      irab: 'الإعراب', sarf: 'الصرف', balagha: 'البلاغة', fawaid: 'الفوائد',
      language: 'اللغة', dep_graph: 'الشجرة الإعرابية',
    };
    return ['irab','sarf','balagha','fawaid','language','dep_graph']
      .filter(k => counts.has(k))
      .map(k => ({ label: labels[k], count: counts.get(k)! }));
  });

  // ── Section collapse state ────────────────────────────────────────────────
  readonly collapsed = signal<Set<string>>(new Set());
  isCollapsed(key: string): boolean { return this.collapsed().has(key); }
  toggle(key: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /** Are any signals present? Used to render empty state. */
  readonly hasAnyContent = computed(() =>
    this.cases().length > 0 ||
    this.mahalTypes().length > 0 ||
    this.roles().length > 0 ||
    this.wordCoverage().unique > 0 ||
    this.sectionCoverage().length > 0,
  );

  // ── helpers ────────────────────────────────────────────────────────────────
  private bucketGrammarTags(match: (t: string) => boolean): CountedTag[] {
    const p = this.payload();
    if (!p) return [];
    const counts = new Map<string, number>();
    for (const b of p.blocks) {
      for (const t of (b.grammar_tags ?? [])) {
        if (match(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  private sectionKey(b: QrIraabDisplayBlock): string | null {
    if (b.block_type === 'irab_card') return 'irab';
    if (b.block_type === 'dependency_graph') return 'dep_graph';
    if (b.block_type === 'sarf_note') return 'sarf';
    if (b.block_type === 'balagha_note') return 'balagha';
    if (b.block_type === 'key_insight') return 'fawaid';
    if (b.block_type === 'language_note') return 'language';
    if (b.block_type === 'heading' && b.block_subtype) return b.block_subtype;
    return null;
  }
}
