import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuranResearchApiService } from '../../../../../shared/services/quran/quran-research-api.service';
import type {
  QrIraabDisplaySource,
  QrIraabGroupDisplayPayload,
  QrIraabDisplayBlock,
} from '../../../../../shared/models/quran/qr.models';
import { DisplayBlockComponent } from '../../../../../shared/components/display-block/display-block.component';

interface SourceSection {
  source: QrIraabDisplaySource;
  groups: SectionGroup[];
}

export interface SectionGroup {
  key: string;
  label_ar: string;
  label_en: string;
  heading_block: QrIraabDisplayBlock | null;
  children: QrIraabDisplayBlock[];
  order: number;
}

const SECTION_LABELS: Record<string, { ar: string; en: string; order: number }> = {
  irab:      { ar: 'الإعراب',  en: 'Iʿrāb',                 order: 0 },
  sarf:      { ar: 'الصرف',    en: 'Ṣarf',                  order: 1 },
  balagha:   { ar: 'البلاغة',  en: 'Balāgha',               order: 2 },
  fawaid:    { ar: 'الفوائد',  en: 'Fawāʾid (Insights)',    order: 3 },
  language:  { ar: 'اللغة',     en: 'Language & Etymology', order: 4 },
  dep_graph: { ar: 'الشجرة الإعرابية', en: 'Dependency Tree', order: 9 },
};
function sectionOf(b: QrIraabDisplayBlock): string {
  if (b.block_type === 'irab_card') return 'irab';
  if (b.block_type === 'dependency_graph') return 'dep_graph';
  if (b.block_type === 'heading' && b.block_subtype) return b.block_subtype;
  if (b.block_type === 'sarf_note')      return 'sarf';
  if (b.block_type === 'balagha_note')   return 'balagha';
  if (b.block_type === 'key_insight')    return 'fawaid';
  if (b.block_type === 'language_note')  return 'language';
  if (b.block_subtype) return b.block_subtype;
  return 'irab';
}
function groupBlocksBySection(blocks: QrIraabDisplayBlock[]): SectionGroup[] {
  const byKey = new Map<string, SectionGroup>();
  const ensure = (key: string): SectionGroup => {
    if (byKey.has(key)) return byKey.get(key)!;
    const meta = SECTION_LABELS[key] ?? { ar: key, en: key, order: 99 };
    const g: SectionGroup = { key, label_ar: meta.ar, label_en: meta.en, order: meta.order, heading_block: null, children: [] };
    byKey.set(key, g);
    return g;
  };
  for (const b of blocks) {
    const key = sectionOf(b);
    const g = ensure(key);
    if (b.block_type === 'heading') g.heading_block = b;
    else g.children.push(b);
  }
  for (const g of byKey.values()) g.children.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  return [...byKey.values()].sort((a, b) => a.order - b.order);
}

@Component({
  selector: 'km-iraab-display-page',
  standalone: true,
  imports: [CommonModule, DisplayBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './iraab-display-page.component.html',
  styleUrl: './iraab-display-page.component.scss',
})
export class IraabDisplayPageComponent implements OnInit {
  private readonly api    = inject(QuranResearchApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sources = signal<QrIraabDisplaySource[]>([]);
  readonly payload = signal<QrIraabGroupDisplayPayload | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly surah = signal(2);
  readonly ayah  = signal(3);
  readonly selectedSourceSlug = signal<string | null>(null);

  readonly sections = computed<SourceSection[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const filter = this.selectedSourceSlug();
    const bySource = new Map<string, QrIraabDisplayBlock[]>();
    for (const b of p.blocks) {
      if (filter && b.source_slug !== filter) continue;
      if (!bySource.has(b.source_slug)) bySource.set(b.source_slug, []);
      bySource.get(b.source_slug)!.push(b);
    }
    return p.sources
      .filter(s => bySource.has(s.source_slug))
      .map(s => ({ source: s, groups: groupBlocksBySection(bySource.get(s.source_slug) ?? []) }));
  });

  // Collapse state per (source_slug, section_key).
  readonly collapsed = signal<Set<string>>(new Set());
  isCollapsed(sourceSlug: string, sectionKey: string): boolean {
    return this.collapsed().has(`${sourceSlug}|${sectionKey}`);
  }
  toggleSection(sourceSlug: string, sectionKey: string): void {
    this.collapsed.update(set => {
      const next = new Set(set);
      const k = `${sourceSlug}|${sectionKey}`;
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  readonly groupHeader = computed(() => {
    const p = this.payload();
    if (!p) return '';
    return p.ayah_keys.length > 1
      ? `سورة ${p.surah_no} • مجموعة ${p.ayah_group_key}`
      : `سورة ${p.surah_no} • آية ${p.ayah_no}`;
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.surah.set(parseInt(params.get('surah') ?? '2', 10));
        this.ayah.set(parseInt(params.get('ayah')  ?? '3', 10));
        this.loadPayload();
      });

    this.api.getIraabDisplaySources()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => this.sources.set(res.sources));
  }

  loadPayload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getIraabDisplay(this.surah(), this.ayah())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => { this.payload.set(p); this.loading.set(false); },
        error: e => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
      });
  }

  selectSource(slug: string | null): void { this.selectedSourceSlug.set(slug); }

  navAyah(delta: number): void {
    const next = Math.max(1, this.ayah() + delta);
    this.router.navigate(['/quran/iraab-display'], {
      queryParams: { surah: this.surah(), ayah: next },
    });
  }
}
