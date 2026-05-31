import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';

import {
  WorldviewLibraryApiService,
  WvReadingSession,
  WvReadingSessionPatch,
} from '../../../../shared/services/worldview/worldview-library-api.service';

interface WvSource {
  id: string;
  source_type?: string | null;
  title: string;
  subtitle?: string | null;
  creator?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  published_year?: number | null;
  language?: string | null;
  source_domain?: string | null;
  meta_json?: string | Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  people?: Array<{ id: string; display_name?: string | null; role?: string | null }> | null;
}

interface WvUnit {
  id: string;
  source_id: string;
  parent_unit_id?: string | null;
  parent_id?: string | null;
  unit_type?: string | null;
  title?: string | null;
  order_index?: number | null;
  unit_index?: number | null;
  start_ref?: string | null;
  end_ref?: string | null;
  anchor_text?: string | null;
  summary?: string | null;
  body_preview?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  text_excerpt?: string | null;
  description_md?: string | null;
  children?: WvUnit[];
}

interface TocItem {
  unit: WvUnit;
  depth: number;
  numbering: string;
}

@Component({
  selector: 'app-worldview-library-units',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './worldview-library-units.page.html',
  styleUrl: './worldview-library-units.page.scss',
})
export class WorldviewLibraryUnitsPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryApi = inject(WorldviewLibraryApiService);

  @ViewChild('heroEl') heroEl?: ElementRef<HTMLElement>;
  @ViewChild('tocEl') tocEl?: ElementRef<HTMLElement>;

  readonly sourceId = signal('');
  readonly selectedUnitId = signal('');
  readonly source = signal<WvSource | null>(null);
  readonly units = signal<WvUnit[]>([]);
  readonly loading = signal(true);
  readonly skeletons = [1, 2, 3, 4];

  // Reading session state
  readonly session = signal<WvReadingSession | null>(null);
  readonly sessionBusy = signal(false);

  readonly rootUnits = computed(() => buildUnitTree(this.units()));
  readonly chapterCount = computed(() => this.rootUnits().length);
  readonly unitsById = computed(() => new Map(this.units().map((unit) => [unit.id, unit] as const)));
  readonly tocItems = computed(() => flattenUnits(this.rootUnits()));

  /** The unit the active session is currently parked on, if any. */
  readonly sessionUnit = computed(() => {
    const unitId = this.session()?.source_unit_id;
    return unitId ? this.unitsById().get(unitId) ?? null : null;
  });

  /** True when there is a resumable (active or paused) session. */
  readonly hasOpenSession = computed(() => {
    const status = this.session()?.status;
    return status === 'active' || status === 'paused';
  });

  ngOnInit(): void {
    const sourceId = this.route.snapshot.paramMap.get('id') ?? '';
    this.sourceId.set(sourceId);
    if (!sourceId) {
      this.loading.set(false);
      return;
    }
    void this.load(sourceId);
  }

  ngAfterViewInit(): void {
    // Entrance animations run once data is loaded (polled via rAF)
  }

  private runEntranceAnimation(): void {
    // Use a stable timeout so Angular finishes rendering before GSAP touches the DOM
    setTimeout(() => {
      const hero = this.heroEl?.nativeElement;
      const toc = this.tocEl?.nativeElement;
      if (!hero && !toc) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (hero) {
        tl.fromTo(hero, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45 });
      }
      if (toc) {
        tl.fromTo(toc, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.22');
        const rows = toc.querySelectorAll('.toc-row');
        if (rows.length) {
          tl.fromTo(rows, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.28, stagger: 0.03 }, '-=0.18');
        }
      }
    }, 80);
  }

  private async load(id: string): Promise<void> {
    try {
      const detail = await firstValueFrom(this.libraryApi.getSource(id));
      if (detail?.id) {
        const { units, ...source } = detail;
        this.source.set(this.normalizeSource(source));
        this.units.set((units ?? []).map((unit) => this.normalizeUnit(unit)));
        await this.loadSession(id);
      }
    } catch {
      // ignore — the empty state covers a failed load
    } finally {
      this.loading.set(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.runEntranceAnimation());
      });
    }
  }

  selectUnit(unitId: string): void {
    // Park the active session on the chapter being opened (fire-and-forget).
    void this.parkSessionOn(unitId);
    void this.router.navigate(['/worldview', 'library', this.sourceId(), 'read', unitId]);
  }

  // ── Reading session ──────────────────────────────────────────────────────────

  private async loadSession(sourceId: string): Promise<void> {
    try {
      this.session.set(await firstValueFrom(this.libraryApi.getActiveSession(sourceId)));
    } catch {
      this.session.set(null);
    }
  }

  /** The first chapter (used as the default start position). */
  private firstUnit(): WvUnit | null {
    return this.tocItems()[0]?.unit ?? null;
  }

  /** Start a fresh reading session anchored to the first chapter. */
  async startSession(): Promise<void> {
    const src = this.source();
    if (!src || this.sessionBusy()) return;
    this.sessionBusy.set(true);
    try {
      const start = this.firstUnit();
      const created = await firstValueFrom(
        this.libraryApi.createSession({
          source_id: src.id,
          source_unit_id: start?.id ?? null,
          title: `Reading: ${src.title}`,
          focus_mode: 'deep_read',
          last_position: start ? this.unitRef(start) || null : null,
        }),
      );
      if (created) this.session.set(created);
    } catch {
      // leave UI as-is on failure
    } finally {
      this.sessionBusy.set(false);
    }
  }

  /** Open the chapter the session is parked on (or the first chapter). */
  resumeSession(): void {
    const unitId = this.session()?.source_unit_id ?? this.firstUnit()?.id;
    if (unitId) this.selectUnit(unitId);
  }

  async pauseSession(): Promise<void> {
    await this.patchSession({ status: 'paused' });
  }

  async completeSession(): Promise<void> {
    await this.patchSession({ status: 'completed', ended_at: new Date().toISOString() });
  }

  private async patchSession(fields: Omit<WvReadingSessionPatch, 'id'>): Promise<void> {
    const current = this.session();
    if (!current || this.sessionBusy()) return;
    this.sessionBusy.set(true);
    try {
      const updated = await firstValueFrom(
        this.libraryApi.updateSession({ id: current.id, ...fields }),
      );
      if (updated) this.session.set(updated);
    } catch {
      // ignore
    } finally {
      this.sessionBusy.set(false);
    }
  }

  /** Move an open session's position to a chapter without blocking navigation. */
  private async parkSessionOn(unitId: string): Promise<void> {
    const current = this.session();
    if (!current || !this.hasOpenSession()) return;
    if (current.source_unit_id === unitId) return;
    const unit = this.unitsById().get(unitId);
    try {
      const updated = await firstValueFrom(
        this.libraryApi.updateSession({
          id: current.id,
          source_unit_id: unitId,
          last_position: unit ? this.unitRef(unit) || null : null,
          status: 'active',
        }),
      );
      if (updated) this.session.set(updated);
    } catch {
      // ignore — navigation already proceeded
    }
  }

  sessionStatusLabel(): string {
    switch (this.session()?.status) {
      case 'active':    return 'In progress';
      case 'paused':    return 'Paused';
      case 'completed': return 'Completed';
      default:          return '';
    }
  }

  sessionChapterLabel(): string {
    const unit = this.sessionUnit();
    if (unit) return this.unitTitle(unit);
    const pos = this.session()?.last_position;
    return pos ? `Position ${pos}` : 'Not started';
  }


  typeIcon(type?: string | null): string {
    const map: Record<string, string> = {
      book: '📚', article: '📰', essay: '✍', paper: '🧾',
      lecture: '🎓', podcast: '🎙', video: '▶', scripture: '✧',
      report: '▣', document: '◎', other: '◎',
    };
    return map[(type ?? '').toLowerCase()] ?? '◎';
  }

  typeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'Book', article: 'Article', essay: 'Essay', paper: 'Paper',
      lecture: 'Lecture', podcast: 'Podcast', video: 'Video',
      scripture: 'Scripture', report: 'Report', document: 'Document',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Source';
  }

  typeColor(type?: string | null): string {
    const map: Record<string, string> = {
      book: 'gold', article: 'blue', essay: 'ember', paper: 'purple',
      lecture: 'sage', podcast: 'sage', video: 'blue',
      scripture: 'gold', report: 'purple', document: '',
    };
    return map[(type ?? '').toLowerCase()] ?? '';
  }

  unitTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      chapter: 'Chapter', section: 'Section', part: 'Part',
      preface: 'Preface', introduction: 'Introduction',
      appendix: 'Appendix', conclusion: 'Conclusion', verse: 'Verse',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Unit';
  }

  sourcePeopleLine(): string {
    const src = this.source();
    if (!src) return '';
    if (src.people?.length) {
      return src.people.map((p) => p.display_name).filter(Boolean).join(' · ');
    }
    return src.creator ?? '';
  }

  sourceMetaLine(): string {
    const src = this.source();
    if (!src) return '';
    return [src.publisher, src.publication_year ?? src.published_year, src.language?.toUpperCase(), src.source_domain]
      .filter(Boolean).join(' · ');
  }

  unitTitle(unit: WvUnit | null | undefined): string {
    return unit?.title?.trim() || unit?.anchor_text?.trim() || 'Untitled unit';
  }

  unitRef(unit: WvUnit | null | undefined): string {
    if (!unit) return '';
    if (unit.start_ref && unit.end_ref && unit.start_ref !== unit.end_ref) {
      return `${unit.start_ref} – ${unit.end_ref}`;
    }
    return unit.start_ref || unit.end_ref || '';
  }

  tocMeta(unit: WvUnit): string {
    return [this.unitTypeLabel(unit.unit_type), this.unitRef(unit)].filter(Boolean).join(' · ');
  }

  readingMinutes(unit: WvUnit | null | undefined): string {
    const text = [unit?.summary, unit?.body_preview, unit?.anchor_text].filter(Boolean).join(' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (!words) return 'Quick read';
    return `${Math.max(1, Math.round(words / 180))} min read`;
  }

  private normalizeSource(source: WvSource): WvSource {
    const meta = this.parseMeta(source.meta ?? source.meta_json);
    return {
      ...source,
      meta,
      creator: source.creator ?? (typeof meta?.['creator'] === 'string' ? meta['creator'] as string : null),
      publication_year: source.publication_year ?? source.published_year ?? null,
    };
  }

  private normalizeUnit(unit: WvUnit): WvUnit {
    const pageStart = unit.start_ref ?? (unit.page_start != null ? `p. ${unit.page_start}` : null);
    const pageEnd = unit.end_ref ?? (unit.page_end != null ? `p. ${unit.page_end}` : null);
    return {
      ...unit,
      parent_unit_id: unit.parent_unit_id ?? unit.parent_id ?? null,
      order_index: unit.order_index ?? unit.unit_index ?? null,
      start_ref: pageStart,
      end_ref: pageEnd,
      anchor_text: unit.anchor_text ?? unit.text_excerpt ?? null,
      summary: unit.summary ?? unit.description_md ?? null,
      body_preview: unit.body_preview ?? unit.text_excerpt ?? unit.description_md ?? null,
    };
  }

  private parseMeta(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string') return null;
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function sortUnits(units: WvUnit[]): WvUnit[] {
  return [...units].sort((l, r) => {
    const d = (l.order_index ?? 0) - (r.order_index ?? 0);
    if (d !== 0) return d;
    return (l.title ?? l.anchor_text ?? '').localeCompare(r.title ?? r.anchor_text ?? '');
  });
}

function buildUnitTree(units: WvUnit[]): WvUnit[] {
  const byId = new Map<string, WvUnit>();
  for (const unit of units) {
    byId.set(unit.id, { ...unit, children: [] });
  }
  const roots: WvUnit[] = [];
  for (const unit of byId.values()) {
    if (unit.parent_unit_id) {
      const parent = byId.get(unit.parent_unit_id);
      if (parent) { parent.children = [...(parent.children ?? []), unit]; continue; }
    }
    roots.push(unit);
  }
  const sortTree = (items: WvUnit[]): WvUnit[] =>
    sortUnits(items).map((item) => ({ ...item, children: sortTree(item.children ?? []) }));
  return sortTree(roots);
}

function flattenUnits(units: WvUnit[], depth = 0, prefix: number[] = []): TocItem[] {
  return units.reduce<TocItem[]>((items, unit, index) => {
    const numbering = [...prefix, index + 1];
    items.push({ unit, depth, numbering: numbering.join('.') });
    items.push(...flattenUnits(unit.children ?? [], depth + 1, numbering));
    return items;
  }, []);
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}|\n/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
