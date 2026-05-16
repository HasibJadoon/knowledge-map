import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import type {
  QrTafsirDisplayBlock,
  QrIraabDisplayBlock,
  QrDisplayMadhab,
  QrDisplayQuranRef,
} from '../../services/quran-research-api.service';
import { IraabTreeViewerComponent } from '../iraab-tree-viewer/iraab-tree-viewer.component';

/**
 * Modern, rich block renderer for the qr_*_book_display_blocks rows.
 *
 * Accepts either a tafsir block or an iʿrāb block (they share most fields).
 * Dispatches on `block_type` and renders a per-type template with distinct
 * visual treatment. Falls back to a generic prose card for unknown types.
 *
 * Used by the multi-scholar tafsir page and the per-group iʿrāb page.
 */
export type AnyDisplayBlock = QrTafsirDisplayBlock | QrIraabDisplayBlock;

interface MadhabChip { label: string; tone: 'theology'; color: string; }
const MADHAB_LABELS: Record<QrDisplayMadhab, string> = {
  sunni: 'سني', maliki: 'مالكي', shafii: 'شافعي', hanbali: 'حنبلي', hanafi: 'حنفي',
  mutazili: 'معتزلي', ashari: 'أشعري', athari: 'أثري',
};
const MADHAB_COLORS: Record<QrDisplayMadhab, string> = {
  sunni: '#4A6E8A', maliki: '#2F7A5C', shafii: '#8E6E1E', hanbali: '#6E4A3A',
  hanafi: '#7A4A8E', mutazili: '#6E588E', ashari: '#B0533A', athari: '#3F6E5A',
};

@Component({
  selector: 'km-display-block',
  standalone: true,
  imports: [CommonModule, IonicModule, IraabTreeViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './display-block.component.html',
  styleUrl: './display-block.component.scss',
})
export class DisplayBlockComponent {
  private readonly router = inject(Router);

  readonly block = input.required<AnyDisplayBlock>();
  /** Compact mode reduces padding + hides secondary chrome; for dense lists. */
  readonly compact = input<boolean>(false);
  /** When true, the renderer trusts and renders `raw_text` HTML (for `markup_tier='full'` sources). */
  readonly allowHtml = input<boolean>(false);

  readonly expanded = signal(false);

  readonly madhabChip = computed<MadhabChip | null>(() => {
    const b = this.block() as QrTafsirDisplayBlock;
    if (!b.madhab) return null;
    return {
      label: MADHAB_LABELS[b.madhab] ?? b.madhab,
      tone: 'theology',
      color: MADHAB_COLORS[b.madhab] ?? '#6E665A',
    };
  });

  readonly previewText = computed(() => {
    const b = this.block();
    const text = b.text_ar ?? '';
    if (this.expanded() || !b.is_long_form || text.length < 800) return text;
    return text.slice(0, 600).replace(/\s+$/, '') + '…';
  });

  readonly statusChipLabel = computed(() => {
    const s = this.block().review_status;
    if (s === 'approved') return 'موثّق';
    if (s === 'needs_review') return 'بانتظار المراجعة';
    if (s === 'ai_candidate') return 'مقترح آلي';
    if (s === 'rejected') return 'مرفوض';
    return 'مؤرشف';
  });

  toggleExpand(): void { this.expanded.update(v => !v); }

  /** Navigate to an ayah ref chip target. UI-side router contract. */
  onRefClick(ref: QrDisplayQuranRef): void {
    if (ref.surah && ref.ayah) {
      this.router.navigate(['/quran/tafseer'], { queryParams: { surah: ref.surah, ayah: ref.ayah } });
    }
  }

  /** Pre-checks for templates (Angular @switch is exhaustive but verbose). */
  readonly hasGrammarTags = computed(() => (this.block().grammar_tags ?? []).length > 0);
  readonly hasNarrationTags = computed(() => {
    const b = this.block() as QrTafsirDisplayBlock;
    return (b.narration_tags ?? []).length > 0;
  });
  readonly hasTheologyTags = computed(() => {
    const b = this.block() as QrTafsirDisplayBlock;
    return (b.theology_tags ?? []).length > 0;
  });
  readonly isnadLinks = computed(() => {
    const meta = this.block().meta as { isnad?: { links?: Array<{ narrator_text: string; position?: number }> } } | undefined;
    return meta?.isnad?.links ?? [];
  });
}
