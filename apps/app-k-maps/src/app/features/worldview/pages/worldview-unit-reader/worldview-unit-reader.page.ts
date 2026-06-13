import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, IonContent, ToastController } from '@ionic/angular';

import { PoemViewComponent } from '../../components/poem-view/poem-view.component';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';

import { WorldviewLibraryApiService } from '../../../../shared/services/worldview/worldview-library-api.service';
import { WvGraphShellComponent } from '../../wv-graph/wv-graph-shell/wv-graph-shell.component';
import { WvIllustrationsComponent } from '../../../../shared/components/wv-illustrations/wv-illustrations.component';

/** One reading block's start/end offset inside a pre-rendered audio track. */
interface AudioTiming {
  blockIndex: number;
  startMs: number;
  endMs: number;
}

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
  // Full unit fields from /worldview/units/:id
  readingBody?: string[] | null;
  readingBlocks?: ReadingBlock[] | null;
  readingSchema?: string | null;
  // Pre-rendered narration: an MP3 URL plus a per-block timing map so the
  // reader can play the recording and highlight block-by-block in sync.
  readingAudioUrl?: string | null;
  readingAudioTimings?: AudioTiming[] | null;
  locatorLabel?: string | null;
  readingMinutes?: number | null;
  documentId?: string | null;
  documentTitle?: string | null;
  documentSummary?: string | null;
  documentJson?: Record<string, unknown> | null;
  documentText?: string | null;
  documentBlocks?: WvDocumentBlock[] | null;
  children?: WvUnit[];
  // Per-section attachments (typed cross-domain refs into the content domain)
  documents?: WvAttachment[] | null;
  content?: WvAttachment[] | null;
  episodes?: WvAttachment[] | null;
  poem?: PoemMeta | null;
}

interface WvAttachment {
  id: string;
  attachment_type?: string | null;
  target_ref?: string | null;
  target_kind?: string | null;
  title?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  thumbnail_url?: string | null;
  media_url?: string | null;
  duration_sec?: number | null;
  locator?: string | null;
  link_role?: string | null;
}

interface WvDocumentBlock {
  id?: string | null;
  order_index?: number | null;
  block_type?: string | null;
  block_level?: number | null;
  text_plain?: string | null;
  content_json?: Record<string, unknown> | null;
  attrs_json?: Record<string, unknown> | null;
  block_kind?: string | null;
  renderer?: string | null;
}

interface ReaderNoteEntry {
  id: string;
  noteKind: string;
  title?: string | null;
  bodyMd: string;
  excerptText?: string | null;
  locator?: string | null;
  createdAt?: string | null;
}

interface ReaderHighlightEntry {
  id: string;
  noteKind: string;
  title?: string | null;
  bodyMd: string;
  excerptText?: string | null;
  locator?: string | null;
  color?: string | null;
  createdAt?: string | null;
  source: 'highlight' | 'note';
}

interface WvGraphApiNode {
  id: string;
  node_type: string;
  title: string;
  text_plain: string;
  summary?: string | null;
  display_label_short?: string | null;
  display_label_medium?: string | null;
  slug?: string | null;
  data_json?: unknown;
  meta_json?: unknown;
  created_at?: string | null;
}

interface WvGraphApiEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  strength?: number | null;
  display_label_short?: string | null;
  display_label_medium?: string | null;
}

interface WvGraphApiEvidenceLink {
  id: string;
  source_type: string;
  source_id: string;
  target_node_id: string;
  relation: string;
  evidence_text?: string | null;
  display_label_short?: string | null;
  display_label_medium?: string | null;
}

interface TocItem {
  unit: WvUnit;
  depth: number;
  numbering: string;
}

interface ReadingBlock {
  type: string; // 'heading' | 'subheading' | 'paragraph' | 'quote' | 'link' | 'separator' | 'callout' | 'image' | 'audio' | 'list' | 'table'
  text?: string;
  speech?: string;        // plain-text projection (used for copy-passage)
  html?: SafeHtml;        // inline-formatted HTML (bold/italic/code/links) for prose blocks
  cite?: string;
  label?: string;
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  level?: number;         // heading depth (1–6)
  ordered?: boolean;      // list ordering
  items?: SafeHtml[];     // list item HTML
  headerRow?: SafeHtml[]; // table header cells
  rows?: SafeHtml[][];    // table body rows
  // Poetry (couplet) blocks
  n?: number;
  lang?: string;
  dir?: string;
  hemistichs?: string[];
  translations?: CoupletLayer[];
  vocab?: { word: string; root?: string; gloss?: string; form?: string }[];
}

interface CoupletLayer {
  lang: string;
  label?: string;
  dir?: string;
  script?: string;
  lines?: string[];
  text?: string;
}

interface PoemMeta {
  form?: string;
  title?: string;
  subtitle?: string;
  poet?: string;
  meter?: string;
  reciter?: string;
  recitationUrl?: string;
  layers?: { lang: string; label?: string }[];
}

type ReaderSheetTab = 'highlights' | 'notes' | 'wv';

// Used only for heuristic fallback classification of flat readingBody[]
type BlockType = 'h1' | 'h2' | 'h3' | 'blockquote' | 'attribution' | 'link' | 'para';
interface ClassifiedBlock { text: string; type: BlockType; url?: string; }

@Component({
  selector: 'app-worldview-unit-reader',
  standalone: true,
  imports: [CommonModule, IonicModule, WvGraphShellComponent, WvIllustrationsComponent, PoemViewComponent],
  templateUrl: './worldview-unit-reader.page.html',
  styleUrl: './worldview-unit-reader.page.scss',
})
export class WorldviewUnitReaderPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly libraryApi = inject(WorldviewLibraryApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toastController = inject(ToastController);
  readonly copied = signal(false);
  // Pre-rendered narration playback (plain HTMLAudioElement — no live TTS).
  private audio: HTMLAudioElement | null = null;
  readonly audioPlaying = signal(false);
  readonly audioBlock = signal(-1);
  private sheetDragPointerId: number | null = null;
  private sheetDragStartY = 0;
  private sheetDragStartExpanded = false;
  private removeSheetDragListeners: (() => void) | null = null;

  @ViewChild('readerEl') readerEl?: ElementRef<HTMLElement>;
  @ViewChild('headerEl') headerEl?: ElementRef<HTMLElement>;
  @ViewChild('summaryEl') summaryEl?: ElementRef<HTMLElement>;
  @ViewChild('proseEl') proseEl?: ElementRef<HTMLElement>;
  @ViewChild('subEl') subEl?: ElementRef<HTMLElement>;
  @ViewChild('tocSheetEl') tocSheetEl?: ElementRef<HTMLElement>;
  @ViewChild('contentRef') contentRef?: IonContent;

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly source = signal<WvSource | null>(null);
  readonly allUnits = signal<WvUnit[]>([]);
  readonly loading = signal(true);
  readonly tocOpen = signal(false);
  readonly sheetExpanded = signal(false);
  readonly sheetTab = signal<ReaderSheetTab>('highlights');
  readonly readerNotes = signal<ReaderNoteEntry[]>([]);
  readonly readerHighlights = signal<ReaderHighlightEntry[]>([]);
  readonly worldviewNodes = signal<WvGraphApiNode[]>([]);
  readonly worldviewEdges = signal<WvGraphApiEdge[]>([]);
  readonly worldviewEvidenceLinks = signal<WvGraphApiEvidenceLink[]>([]);
  readonly skeletons = [1, 2, 3, 4, 5, 6];
  readonly sheetTabs: { id: ReaderSheetTab; label: string; icon: string }[] = [
    { id: 'highlights', label: 'Highlights', icon: 'sparkles-outline' },
    { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
    { id: 'wv', label: 'Worldview', icon: 'git-network-outline' },
  ];

  readonly rootUnits = computed(() => buildUnitTree(this.allUnits()));
  readonly unitsById = computed(() => new Map(this.allUnits().map((u) => [u.id, u] as const)));
  readonly tocItems = computed(() => flattenUnits(this.rootUnits()));

  readonly unit = computed(() => this.unitsById().get(this.unitId()) ?? null);

  readonly children = computed(() => {
    const u = this.unit();
    if (!u) return [];
    return sortUnits(this.allUnits().filter((x) => x.parent_unit_id === u.id));
  });

  // Per-section attachments
  readonly unitDocuments = computed(() => this.unit()?.documents ?? []);
  readonly unitContent = computed(() => this.unit()?.content ?? []);
  readonly unitEpisodes = computed(() => this.unit()?.episodes ?? []);

  // Poetry
  readonly poem = computed<PoemMeta | null>(() => this.unit()?.poem ?? null);
  readonly isPoem = computed(() => this.blocks().some((b) => b.type === 'couplet'));
  readonly couplets = computed(() => this.blocks().filter((b) => b.type === 'couplet'));
  readonly poemLayers = computed(() => {
    const declared = this.poem()?.layers;
    if (declared?.length) return declared;
    // derive from the couplets themselves
    const seen = new Map<string, { lang: string; label?: string }>();
    for (const b of this.blocks()) {
      for (const t of b.translations ?? []) {
        if (!seen.has(t.lang)) seen.set(t.lang, { lang: t.lang, label: t.label });
      }
    }
    return [...seen.values()];
  });
  readonly hiddenLayers = signal<Set<string>>(new Set());
  isLayerOn(lang: string): boolean { return !this.hiddenLayers().has(lang); }
  toggleLayer(lang: string): void {
    this.hiddenLayers.update((set) => {
      const next = new Set(set);
      if (next.has(lang)) { next.delete(lang); } else { next.add(lang); }
      return next;
    });
  }
  visibleTranslations(block: ReadingBlock): CoupletLayer[] {
    return (block.translations ?? []).filter((t) => this.isLayerOn(t.lang));
  }
  openRecitation(): void {
    const url = this.poem()?.recitationUrl;
    if (url && typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
  }
  toPersianNum(n?: number): string {
    if (n == null) return '';
    return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  }

  readonly parentChapter = computed(() => {
    const u = this.unit();
    if (!u) return null;
    let current = this.unitsById().get(u.id) ?? u;
    while (current.parent_unit_id) {
      const parent = this.unitsById().get(current.parent_unit_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  });

  readonly summaryBlocks = computed(() =>
    splitParagraphs(this.unit()?.summary ?? this.unit()?.documentSummary ?? '').map((para) => this.inlineHtml(para)),
  );

  // Use structured readingBlocks when available, fall back to heuristic classification
  readonly blocks = computed((): ReadingBlock[] => {
    const u = this.unit();
    if (!u) return [];

    if (u.documentBlocks?.length) {
      const normalized = this.mapDocumentBlocksToReadingBlocks(u.documentBlocks);
      if (normalized.length) {
        return normalized;
      }
    }

    // Prefer rich structured blocks (readingBlocks JSON) from the API. These
    // are stored plain (text + markdown emphasis markers, string list/table
    // cells); hydrate them into the same render-ready shape as parsed markdown
    // so headings, emphasis, lists and tables all render from the JSON.
    if (u.readingBlocks?.length) {
      return u.readingBlocks.map((block) => this.hydrateReadingBlock(block));
    }

    // Markdown body (headings, lists, quotes, tables, inline formatting) is the
    // richest authored form — parse it into real blocks so nothing leaks as raw
    // syntax (## , **bold**, > quote, - list, | table |).
    const markdownSource = (u.text_excerpt ?? u.description_md ?? '').trim();
    if (looksLikeMarkdown(markdownSource)) {
      const parsed = this.parseMarkdownToBlocks(markdownSource);
      if (parsed.length) {
        return parsed;
      }
    }

    // Fall back: classify flat readingBody[] or body_preview
    const raw: string[] = u.readingBody?.filter(Boolean) ?? (() => {
      const lines = [
        ...splitParagraphs(u.body_preview ?? ''),
        ...splitParagraphs(u.anchor_text ?? ''),
      ];
      return lines.filter((b, i) => lines.indexOf(b) === i);
    })();

    return classifyBlocks(raw).map((b): ReadingBlock => ({
      type: b.type === 'h1' ? 'heading'
          : b.type === 'h2' || b.type === 'h3' ? 'subheading'
          : b.type === 'blockquote' ? 'quote'
          : b.type === 'attribution' ? 'cite-line'
          : b.type === 'link' ? 'link'
          : 'paragraph',
      text: b.text,
      href: (b as { url?: string }).url,
    }));
  });

  readonly currentTocIndex = computed(() => {
    const id = this.unitId();
    const idx = this.tocItems().findIndex((item) => item.unit.id === id);
    return idx < 0 ? 0 : idx;
  });

  readonly readProgressPercent = computed(() => {
    const total = this.tocItems().length;
    if (total <= 1) return 0;
    return Math.round((this.currentTocIndex() / (total - 1)) * 100);
  });

  readonly prevUnit = computed(() => {
    const idx = this.currentTocIndex();
    return idx > 0 ? (this.tocItems()[idx - 1]?.unit ?? null) : null;
  });

  readonly nextUnit = computed(() => {
    const items = this.tocItems();
    const idx = this.currentTocIndex();
    return idx < items.length - 1 ? (items[idx + 1]?.unit ?? null) : null;
  });

  readonly highlightEntries = computed(() =>
    [...this.readerHighlights()].sort((left, right) => this.compareCreatedAt(left.createdAt, right.createdAt)),
  );

  readonly noteEntries = computed(() =>
    [...this.readerNotes()].sort((left, right) => this.compareCreatedAt(left.createdAt, right.createdAt)),
  );

  readonly wvEntries = computed(() =>
    [...this.worldviewNodes()].sort((left, right) => this.compareCreatedAt(left.created_at, right.created_at)),
  );

  readonly kicker = computed(() => {
    const u = this.unit();
    const chapter = this.parentChapter();
    if (u && chapter && chapter.id !== u.id) {
      return `${this.unitTypeLabel(chapter.unit_type)} · ${this.unitTitle(chapter)}`;
    }
    const src = this.source();
    if (!src) return 'Worldview Source';
    if (src.people?.length) return src.people.map((p) => p.display_name).filter(Boolean).join(' · ');
    return src.creator ?? src.subtitle ?? 'Worldview Source';
  });

  ngOnInit(): void {
    const sourceId = this.route.snapshot.paramMap.get('sourceId') ?? '';
    const unitId = this.route.snapshot.paramMap.get('unitId') ?? '';
    this.sourceId.set(sourceId);
    this.unitId.set(unitId);
    if (!sourceId || !unitId) { this.loading.set(false); return; }
    void this.load(sourceId, unitId);
  }

  ngAfterViewInit(): void {
    // Animations run after data loads
  }

  ngOnDestroy(): void {
    this.stopSheetDrag();
    this.teardownAudio();
  }

  private async load(sourceId: string, unitId: string): Promise<void> {
    try {
      // Source + all units (for TOC/nav), full unit content, and reader
      // annotations are loaded in parallel; a failure of one does not abort the rest.
      const [sourceDetail, unitDetail, annotations] = await Promise.all([
        firstValueFrom(this.libraryApi.getSource(sourceId)).catch(() => null),
        firstValueFrom(this.libraryApi.getUnit(unitId)).catch(() => null),
        firstValueFrom(this.libraryApi.getUnitAnnotations(unitId)).catch(() => null),
      ]);

      if (sourceDetail?.id) {
        const { units, ...source } = sourceDetail;
        this.source.set(this.normalizeSource(source));
        this.allUnits.set((units ?? []).map((unit) => this.normalizeUnitSummary(unit)));
      }

      if (unitDetail?.id) {
        const normalizedResult = this.normalizeUnitDetail(this.normalizeUnitSummary(unitDetail));
        // Merge full unit data into allUnits so the computed unit() signal picks it up
        this.allUnits.update((units) => {
          const idx = units.findIndex((u) => u.id === normalizedResult.id);
          if (idx >= 0) {
            const updated = [...units];
            updated[idx] = { ...updated[idx], ...normalizedResult };
            return updated;
          }
          // Unit not in list yet — add it
          return [...units, normalizedResult];
        });
      }

      if (annotations) {
        this.readerNotes.set(this.normalizeNotes(annotations.notes));
        this.readerHighlights.set(this.normalizeHighlights(annotations.highlights ?? annotations.annotations));
        this.worldviewNodes.set(this.normalizeWvNodesPayload(annotations.wv));
        this.worldviewEdges.set(this.normalizeWvEdgesPayload(annotations.wv_node_edges));
        this.worldviewEvidenceLinks.set(this.normalizeWvEvidenceLinksPayload(annotations.wv_evidence_links));
      }
    } catch { /* ignore */ } finally {
      this.loading.set(false);
      requestAnimationFrame(() => requestAnimationFrame(() => this.animate()));
    }
  }

  private animate(): void {
    setTimeout(() => {
      const header = this.headerEl?.nativeElement;
      const summary = this.summaryEl?.nativeElement;
      const prose = this.proseEl?.nativeElement;
      if (!header) return;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // 1. Kicker + title fade up
      const kicker = header.querySelector('.reading__kicker');
      const title = header.querySelector('.reading__title');
      const rule = header.querySelector('.reading__rule');
      const meta = header.querySelector('.reading__meta');

      if (kicker) tl.fromTo(kicker, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
      if (title)  tl.fromTo(title,  { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.42 }, '-=0.18');
      if (rule)   tl.fromTo(rule,   { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.48, ease: 'power3.inOut', transformOrigin: 'left' }, '-=0.22');
      if (meta)   tl.fromTo(meta,   { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.28 }, '-=0.2');

      // 2. Summary paragraphs stagger
      if (summary) {
        const paras = summary.querySelectorAll('.summary__para');
        if (paras.length) {
          tl.fromTo(paras,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.36, stagger: 0.09, ease: 'power2.out' },
            '-=0.1'
          );
        }
      }

      // 3. First screen of prose blocks — staggered fade + slide
      if (prose) {
        const firstBlocks = Array.from(
          prose.querySelectorAll<HTMLElement>(
            '.prose-heading-wrap, .prose-para, .prose-quote, .prose-link, .prose-callout, .prose-media, .prose-sep'
          )
        ).slice(0, 8); // only first 8 blocks (what's roughly above the fold)

        if (firstBlocks.length) {
          tl.fromTo(firstBlocks,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.34, stagger: 0.06, ease: 'power2.out' },
            '-=0.12'
          );
        }

        // Animate first h1-line separately with a draw effect
        const firstH1Line = prose.querySelector('.prose-h1-line');
        if (firstH1Line) {
          tl.fromTo(firstH1Line,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.55, ease: 'power3.inOut', transformOrigin: 'left' },
            '-=0.5' // overlap with block animation
          );
        }
      }

      // 4. Observe remaining heading lines as user scrolls
      this.observeHeadingLines(prose);
    }, 80);
  }

  private observeHeadingLines(prose: HTMLElement | undefined): void {
    if (!prose) return;
    const lines = prose.querySelectorAll<HTMLElement>('.prose-h1-line, .prose-h2-line');
    if (!lines.length) return;

    // Set initial state for all lines (first may already be animated)
    gsap.set(lines, { scaleX: 0, transformOrigin: 'left' });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const line = entry.target as HTMLElement;
          const isH1 = line.classList.contains('prose-h1-line');
          gsap.to(line, {
            scaleX: 1,
            duration: isH1 ? 0.55 : 0.4,
            ease: 'power3.inOut',
            transformOrigin: 'left',
          });
          observer.unobserve(line);
        }
      });
    }, { threshold: 0.5 });

    lines.forEach((line) => observer.observe(line));
  }

  goToUnit(unitId: string): void {
    this.teardownAudio();
    void this.router.navigate(['/worldview', 'library', this.sourceId(), 'read', unitId]);
    void this.contentRef?.scrollToTop(0);
  }

  // ── Audio narration (pre-rendered MP3) ──────────────────────────────────────

  /** The unit's pre-rendered narration track, if one exists. */
  readonly audioTrack = computed(() => {
    const u = this.unit();
    const url = u?.readingAudioUrl?.trim();
    const timings = u?.readingAudioTimings;
    return url ? { url, timings: timings ?? [] } : null;
  });

  /** Play / pause the pre-rendered narration; highlight follows the audio. */
  toggleAudio(): void {
    const track = this.audioTrack();
    if (!track || typeof Audio === 'undefined') return;

    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      return;
    }
    if (!this.audio) {
      const el = new Audio(track.url);
      el.preload = 'auto';
      el.addEventListener('play', () => this.audioPlaying.set(true));
      el.addEventListener('pause', () => this.audioPlaying.set(false));
      el.addEventListener('ended', () => { this.audioPlaying.set(false); this.audioBlock.set(-1); });
      el.addEventListener('timeupdate', () => this.syncAudioHighlight());
      this.audio = el;
    }
    void this.audio.play().catch(() => this.audioPlaying.set(false));
  }

  private syncAudioHighlight(): void {
    const timings = this.audioTrack()?.timings;
    if (!this.audio || !timings?.length) return;
    const ms = this.audio.currentTime * 1000;
    let active = -1;
    for (const t of timings) {
      if (ms >= t.startMs) active = t.blockIndex; else break;
    }
    if (active !== this.audioBlock()) this.audioBlock.set(active);
  }

  private teardownAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.audioPlaying.set(false);
    this.audioBlock.set(-1);
  }

  // ── Copy passage ────────────────────────────────────────────────────────────

  /** Plain-text projection of the whole reading passage (title + body). */
  private passagePlainText(): string {
    const lines: string[] = [];
    const title = this.unitTitle(this.unit());
    if (title) lines.push(title, '');
    for (const block of this.blocks()) {
      const text = (block.speech ?? block.text ?? '').trim();
      if (text) { lines.push(this.stripMarkdown(text)); continue; }
      if (block.items?.length) {
        for (const item of block.items) lines.push('• ' + this.stripMarkdown(String(item)));
      }
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** Copy the full passage to the clipboard with a brief confirmation. */
  async copyPassage(): Promise<void> {
    const text = this.passagePlainText();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
      const toast = await this.toastController.create({
        message: 'Passage copied',
        duration: 1400,
        position: 'bottom',
        cssClass: 'ur-copy-toast',
      });
      await toast.present();
    } catch {
      const toast = await this.toastController.create({
        message: 'Could not copy passage',
        duration: 1600,
        position: 'bottom',
      });
      await toast.present();
    }
  }

  openGraphPage(): void {
    if (!this.sourceId() || !this.unitId()) return;
    void this.router.navigate(['/worldview', 'library', this.sourceId(), 'graph', this.unitId()]);
  }

  goBack(): void {
    void this.router.navigate(['/worldview', 'library', this.sourceId()]);
  }

  openToc(): void {
    this.sheetExpanded.set(false);
    this.sheetTab.set(this.defaultSheetTab());
    this.tocOpen.set(true);
    requestAnimationFrame(() => {
      const sheet = this.tocSheetEl?.nativeElement;
      if (sheet) {
        gsap.fromTo(sheet, { y: '100%', opacity: 0.4 }, { y: '0%', opacity: 1, duration: 0.38, ease: 'expo.out' });
      }
    });
  }

  closeToc(): void {
    this.stopSheetDrag();
    const sheet = this.tocSheetEl?.nativeElement;
    if (sheet) {
      gsap.to(sheet, {
        y: '100%', opacity: 0, duration: 0.26, ease: 'expo.in',
        onComplete: () => {
          this.sheetExpanded.set(false);
          this.tocOpen.set(false);
        },
      });
    } else {
      this.sheetExpanded.set(false);
      this.tocOpen.set(false);
    }
  }

  selectFromToc(unitId: string): void {
    this.closeToc();
    setTimeout(() => this.goToUnit(unitId), 160);
  }

  setSheetTab(tab: ReaderSheetTab): void {
    this.sheetTab.set(tab);
    // WV graph needs full height — auto-expand sheet
    if (tab === 'wv') {
      this.sheetExpanded.set(true);
    }
  }

  toggleSheetExpanded(): void {
    this.sheetExpanded.update((expanded) => !expanded);
  }

  startSheetDrag(event: PointerEvent): void {
    if (this.sheetDragPointerId !== null) return;

    event.preventDefault();
    this.stopSheetDrag();
    this.sheetDragPointerId = event.pointerId;
    this.sheetDragStartY = event.clientY;
    this.sheetDragStartExpanded = this.sheetExpanded();

    const onPointerUp = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== this.sheetDragPointerId) return;

      const delta = pointerEvent.clientY - this.sheetDragStartY;
      if (delta <= -36) {
        this.sheetExpanded.set(true);
      } else if (delta >= 36) {
        this.sheetExpanded.set(false);
      } else {
        this.sheetExpanded.set(this.sheetDragStartExpanded);
      }

      this.stopSheetDrag();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    this.removeSheetDragListeners = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      }
    };
  }

  formatDuration(seconds?: number | null): string {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  openAttachment(att: WvAttachment): void {
    const url = att.media_url?.trim();
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    }
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

  unitTypeLabel(type?: string | null): string {
    const map: Record<string, string> = {
      chapter: 'Chapter', section: 'Section', part: 'Part',
      preface: 'Preface', introduction: 'Introduction',
      appendix: 'Appendix', conclusion: 'Conclusion', verse: 'Verse',
    };
    return map[(type ?? '').toLowerCase()] ?? 'Unit';
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
      lecture: 'sage', podcast: 'sage', video: 'blue', scripture: 'gold', report: 'purple',
    };
    return map[(type ?? '').toLowerCase()] ?? '';
  }

  childSummary(unit: WvUnit): string {
    return unit.summary?.trim() || this.unitRef(unit) || 'Open this section.';
  }

  tabCount(tab: ReaderSheetTab): number {
    switch (tab) {
      case 'highlights':
        return this.highlightEntries().length;
      case 'notes':
        return this.noteEntries().length;
      case 'wv':
        return this.worldviewNodes().length;
    }
  }

  noteKindLabel(kind: string): string {
    const labels: Record<string, string> = {
      highlight: 'Highlight',
      quote: 'Highlight',
      reflection: 'Reflection',
      question: 'Question',
      insight: 'Insight',
      claim_seed: 'Claim',
      worldview: 'Worldview',
      summary: 'Summary',
      observation: 'Observation',
      reference: 'Reference',
      todo: 'Todo',
      idea: 'Idea',
    };

    return labels[kind] ?? kind.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatNoteDate(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  tocMeta(unit: WvUnit): string {
    return [this.unitTypeLabel(unit.unit_type), this.unitRef(unit)].filter(Boolean).join(' · ');
  }

  readingMinutes(unit: WvUnit | null | undefined): string {
    if (unit?.readingMinutes) return `${unit.readingMinutes} min read`;
    const text = [unit?.summary, unit?.documentText, unit?.body_preview, unit?.anchor_text].filter(Boolean).join(' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (!words) return 'Quick read';
    return `${Math.max(1, Math.round(words / 180))} min read`;
  }

  // ── Markdown → reading blocks ─────────────────────────────────────────────
  // A compact CommonMark-subset parser covering everything authored content
  // uses: ATX headings, horizontal rules, blockquotes, ordered/unordered
  // lists, pipe tables, and inline bold/italic/code/links. Anything else is a
  // paragraph. Output feeds the same styled block renderer as structured data.
  private parseMarkdownToBlocks(md: string): ReadingBlock[] {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const blocks: ReadingBlock[] = [];
    let para: string[] = [];

    const flushPara = () => {
      if (para.length) {
        const text = para.join(' ').replace(/\s+/g, ' ').trim();
        if (text) blocks.push({ type: 'paragraph', text, html: this.inlineHtml(text), speech: this.stripMarkdown(text) });
        para = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Blank line → paragraph boundary
      if (!trimmed) { flushPara(); continue; }

      // Horizontal rule (---, ***, ___, ----- …)
      if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        flushPara();
        blocks.push({ type: 'separator' });
        continue;
      }

      // ATX heading
      const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushPara();
        const level = heading[1].length;
        const text = heading[2].replace(/\s*#+\s*$/, '').trim();
        blocks.push({
          type: level >= 3 ? 'subheading' : 'heading',
          level,
          text,
          html: this.inlineHtml(text),
          speech: this.stripMarkdown(text),
        });
        continue;
      }

      // Blockquote (consecutive > lines)
      if (/^\s*>/.test(line)) {
        flushPara();
        const quote: string[] = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        i--;
        const text = quote.join(' ').replace(/\s+/g, ' ').trim();
        blocks.push({ type: 'quote', text, html: this.inlineHtml(text), speech: this.stripMarkdown(text) });
        continue;
      }

      // Pipe table: header row followed by a |---|---| delimiter row
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        flushPara();
        const headerCells = this.splitTableRow(lines[i]);
        const headerRow = headerCells.map((c) => this.inlineHtml(c));
        i += 2; // skip header + delimiter
        const rows: SafeHtml[][] = [];
        const speechParts: string[] = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
          const cells = this.splitTableRow(lines[i]);
          rows.push(cells.map((c) => this.inlineHtml(c)));
          speechParts.push(cells.map((c) => this.stripMarkdown(c)).join(', '));
          i++;
        }
        i--;
        blocks.push({ type: 'table', headerRow, rows, speech: this.stripMarkdown(headerCells.join(', ')) + '. ' + speechParts.join('. ') });
        continue;
      }

      // Lists (unordered - * + or ordered 1. 2. …)
      const isUl = /^\s*[-*+]\s+/.test(line);
      const isOl = /^\s*\d+[.)]\s+/.test(line);
      if (isUl || isOl) {
        flushPara();
        const items: SafeHtml[] = [];
        const itemTexts: string[] = [];
        const ordered = isOl;
        while (i < lines.length) {
          const li = lines[i];
          const m = ordered ? li.match(/^\s*\d+[.)]\s+(.*)$/) : li.match(/^\s*[-*+]\s+(.*)$/);
          if (m) {
            items.push(this.inlineHtml(m[1].trim()));
            itemTexts.push(this.stripMarkdown(m[1].trim()));
            i++;
          } else if (/^\s+\S/.test(li) && items.length) {
            // continuation line of the previous item
            i++;
          } else {
            break;
          }
        }
        i--;
        blocks.push({ type: 'list', ordered, items, speech: itemTexts.join('. ') });
        continue;
      }

      // Otherwise accumulate into the current paragraph
      para.push(trimmed);
    }

    flushPara();
    return blocks;
  }

  /** Turn a stored (plain-text) readingBlock into a render-ready block:
   *  inline emphasis becomes SafeHtml; list/table cells are hydrated too. */
  private hydrateReadingBlock(block: ReadingBlock): ReadingBlock {
    const rawText = typeof block.text === 'string' ? block.text : '';
    const rawItems = Array.isArray(block.items) ? (block.items as unknown as string[]) : null;
    const rawHeader = Array.isArray(block.headerRow) ? (block.headerRow as unknown as string[]) : null;
    const rawRows = Array.isArray(block.rows) ? (block.rows as unknown as string[][]) : null;

    return {
      ...block,
      html: block.html ?? (rawText ? this.inlineHtml(rawText) : undefined),
      items: rawItems ? rawItems.map((i) => this.inlineHtml(i)) : block.items,
      headerRow: rawHeader ? rawHeader.map((c) => this.inlineHtml(c)) : block.headerRow,
      rows: rawRows ? rawRows.map((r) => r.map((c) => this.inlineHtml(c))) : block.rows,
      speech:
        block.speech ??
        this.stripMarkdown(
          rawText ||
            (rawItems ? rawItems.join('. ') : '') ||
            (rawHeader ? [rawHeader.join(', '), ...(rawRows ?? []).map((r) => r.join(', '))].join('. ') : ''),
        ),
    };
  }

  private splitTableRow(line: string): string[] {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
  }

  /** Escape HTML, then render inline markdown (code, links, bold, italic). */
  private inlineHtml(text: string): SafeHtml {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Protect inline code spans first so their contents are not re-parsed.
    // The sentinel uses a private-use code point so it never collides with
    // real text (numbers, symbols) before the spans are restored at the end.
    const SENT = '';
    const codeSpans: string[] = [];
    html = html.replace(/`([^`]+)`/g, (_m, code: string) => {
      codeSpans.push(`<code>${code}</code>`);
      return `${SENT}${codeSpans.length - 1}${SENT}`;
    });

    html = html
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?![\w_])/g, '$1<em>$2</em>');

    html = html.replace(new RegExp(`${SENT}(\\d+)${SENT}`, 'g'), (_m, n: string) => codeSpans[Number(n)] ?? '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** Plain-text projection of markdown for previews/snippets. */
  stripMarkdown(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#*_>`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeUnitDetail(unit: WvUnit): WvUnit {
    return {
      ...unit,
      documentId: this.readTrimmed(unit.documentId),
      documentTitle: this.readTrimmed(unit.documentTitle),
      documentSummary: this.readTrimmed(unit.documentSummary),
      documentJson: this.asRecord(unit.documentJson),
      documentText: this.readTrimmed(unit.documentText),
      documentBlocks: this.normalizeDocumentBlocksPayload(unit.documentBlocks),
      readingBody: Array.isArray(unit.readingBody)
        ? unit.readingBody.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim())
        : null,
      readingBlocks: this.normalizeReadingBlocksPayload(unit.readingBlocks),
      readingAudioUrl: this.readTrimmed(unit.readingAudioUrl),
      readingAudioTimings: this.normalizeAudioTimingsPayload(unit.readingAudioTimings),
    };
  }

  private normalizeAudioTimingsPayload(value: unknown): AudioTiming[] | null {
    if (!Array.isArray(value)) return null;
    const timings = value
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object' && !Array.isArray(e))
      .map((e) => ({
        blockIndex: Number(e['blockIndex']),
        startMs: Number(e['startMs']),
        endMs: Number(e['endMs']),
      }))
      .filter((t) => Number.isFinite(t.blockIndex) && Number.isFinite(t.startMs));
    return timings.length ? timings : null;
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

  private normalizeUnitSummary(unit: WvUnit): WvUnit {
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
      readingBody: unit.readingBody ?? splitParagraphs(unit.text_excerpt ?? unit.description_md ?? ''),
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

  private normalizeReadingBlocksPayload(value: unknown): ReadingBlock[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value.filter(
      (entry): entry is ReadingBlock => !!entry && typeof entry === 'object' && !Array.isArray(entry),
    );
  }

  private normalizeDocumentBlocksPayload(value: unknown): WvDocumentBlock[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value.filter(
      (entry): entry is WvDocumentBlock => !!entry && typeof entry === 'object' && !Array.isArray(entry),
    );
  }

  private mapDocumentBlocksToReadingBlocks(blocks: WvDocumentBlock[]): ReadingBlock[] {
    return blocks
      .map((block) => this.mapDocumentBlockToReadingBlock(block))
      .filter((entry): entry is ReadingBlock => entry !== null);
  }

  private mapDocumentBlockToReadingBlock(block: WvDocumentBlock): ReadingBlock | null {
    const blockType = this.readTrimmed(block.block_type)?.toLowerCase() ?? 'paragraph';
    const blockKind = this.readTrimmed(block.block_kind)?.toLowerCase() ?? null;
    const renderer = this.readTrimmed(block.renderer)?.toLowerCase() ?? null;
    const blockLevel = typeof block.block_level === 'number' ? block.block_level : null;
    const text = this.readTrimmed(block.text_plain) ?? '';
    const attrs = this.asRecord(block.attrs_json) ?? {};
    const content = this.asRecord(block.content_json) ?? {};
    const link = this.resolveDocumentBlockLink(attrs, content);
    const media = this.resolveDocumentBlockMedia(attrs, content);
    const cite = this.readTrimmed(attrs['cite']) ?? this.readTrimmed(content['cite']);
    const source = media.src ?? link.href;
    const normalizedType = this.normalizeDocumentBlockType(blockType, blockKind, renderer, blockLevel);
    const displayText = text || media.title || media.alt || link.label || source || '';

    if (normalizedType !== 'separator' && !displayText && !source) {
      return null;
    }

    return {
      type: normalizedType,
      text: normalizedType === 'separator' ? undefined : displayText,
      cite: cite ?? undefined,
      label: link.label ?? undefined,
      href: normalizedType === 'image' ? media.src ?? undefined : source ?? undefined,
      src: normalizedType === 'image' || normalizedType === 'audio' ? source ?? undefined : undefined,
      alt: media.alt ?? undefined,
      title: media.title ?? undefined,
    };
  }

  private normalizeDocumentBlockType(
    blockType: string,
    blockKind: string | null,
    renderer: string | null,
    blockLevel: number | null,
  ): ReadingBlock['type'] {
    if (renderer === 'audio' || blockKind === 'audio') {
      return 'audio';
    }

    if (blockType === 'heading') {
      return (blockLevel ?? 1) > 1 ? 'subheading' : 'heading';
    }

    switch (blockKind ?? blockType) {
      case 'link':
      case 'quote':
      case 'separator':
      case 'callout':
      case 'image':
        return (blockKind ?? blockType) as ReadingBlock['type'];
      default:
        break;
    }

    if (blockType === 'divider') {
      return 'separator';
    }

    return 'paragraph';
  }

  private resolveDocumentBlockLink(
    attrs: Record<string, unknown>,
    content: Record<string, unknown>,
  ): { href: string | null; label: string | null } {
    const contentAttrs = this.asRecord(content['attrs']) ?? {};
    const href = this.readTrimmed(attrs['href'])
      ?? this.readTrimmed(contentAttrs['href']);
    const label = this.readTrimmed(attrs['label'])
      ?? this.readTrimmed(attrs['title'])
      ?? this.readTrimmed(contentAttrs['label'])
      ?? this.readTrimmed(contentAttrs['title']);

    if (href) {
      return { href, label };
    }

    const nodeContent = Array.isArray(content['content']) ? content['content'] : [];
    let derivedHref: string | null = null;
    let derivedLabel = '';

    for (const node of nodeContent) {
      const row = this.asRecord(node);
      if (!row || row['type'] !== 'text') {
        continue;
      }

      const nodeText = typeof row['text'] === 'string' ? row['text'] : '';
      derivedLabel += nodeText;

      const marks = Array.isArray(row['marks']) ? row['marks'] : [];
      for (const mark of marks) {
        const markRow = this.asRecord(mark);
        if (!markRow || markRow['type'] !== 'link') {
          continue;
        }
        const markAttrs = this.asRecord(markRow['attrs']) ?? {};
        const markHref = this.readTrimmed(markAttrs['href']);
        if (markHref) {
          derivedHref = markHref;
          break;
        }
      }
    }

    return {
      href: derivedHref,
      label: this.readTrimmed(derivedLabel),
    };
  }

  private resolveDocumentBlockMedia(
    attrs: Record<string, unknown>,
    content: Record<string, unknown>,
  ): { src: string | null; alt: string | null; title: string | null } {
    const contentAttrs = this.asRecord(content['attrs']) ?? {};

    return {
      src: this.readTrimmed(attrs['src'])
        ?? this.readTrimmed(contentAttrs['src'])
        ?? this.readTrimmed(attrs['href'])
        ?? this.readTrimmed(contentAttrs['href']),
      alt: this.readTrimmed(attrs['alt']) ?? this.readTrimmed(contentAttrs['alt']),
      title: this.readTrimmed(attrs['title'])
        ?? this.readTrimmed(contentAttrs['title'])
        ?? this.readTrimmed(attrs['label'])
        ?? this.readTrimmed(contentAttrs['label']),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private readTrimmed(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private defaultSheetTab(): ReaderSheetTab {
    for (const tab of this.sheetTabs) {
      if (this.tabCount(tab.id) > 0) {
        return tab.id;
      }
    }

    return 'highlights';
  }

  private stopSheetDrag(): void {
    this.removeSheetDragListeners?.();
    this.removeSheetDragListeners = null;
    this.sheetDragPointerId = null;
  }

  private compareCreatedAt(left?: string | null, right?: string | null): number {
    const leftTs = left ? Date.parse(left) : 0;
    const rightTs = right ? Date.parse(right) : 0;
    return leftTs - rightTs;
  }

  private normalizeNotes(value: unknown): ReaderNoteEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((note) => ({
        id: typeof note['id'] === 'string' ? note['id'] : '',
        noteKind: typeof note['note_kind'] === 'string' ? note['note_kind'] : 'reflection',
        title: typeof note['title'] === 'string' ? note['title'] : null,
        bodyMd: typeof note['body_md'] === 'string' ? note['body_md'] : '',
        excerptText: typeof note['excerpt_text'] === 'string' ? note['excerpt_text'] : null,
        locator: typeof note['locator'] === 'string' ? note['locator'] : null,
        createdAt: typeof note['created_at'] === 'string' ? note['created_at'] : null,
      }))
      .filter((note) => !!note.id && !!note.bodyMd);
  }

  private normalizeHighlights(value: unknown): ReaderHighlightEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((highlight) => ({
        id: typeof highlight['id'] === 'string' ? highlight['id'] : '',
        noteKind: typeof highlight['note_kind'] === 'string' ? highlight['note_kind'] : 'highlight',
        title: typeof highlight['title'] === 'string' ? highlight['title'] : null,
        bodyMd: typeof highlight['body_md'] === 'string' ? highlight['body_md'] : '',
        excerptText: typeof highlight['excerpt_text'] === 'string' ? highlight['excerpt_text'] : null,
        locator: typeof highlight['locator'] === 'string' ? highlight['locator'] : null,
        color: typeof highlight['color'] === 'string' ? highlight['color'] : null,
        createdAt: typeof highlight['created_at'] === 'string' ? highlight['created_at'] : null,
        source: (highlight['source'] === 'note' ? 'note' : 'highlight') as 'note' | 'highlight',
      }))
      .filter((highlight) => !!highlight.id && !!highlight.bodyMd);
  }

  private normalizeWvNodesPayload(value: unknown): WvGraphApiNode[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((node) => ({
        id: String(node['id'] ?? ''),
        node_type: String(node['node_type'] ?? 'insight'),
        title: String(node['title'] ?? ''),
        text_plain: String(node['text_plain'] ?? ''),
        summary: (node['summary'] as string | null) ?? null,
        display_label_short: (node['display_label_short'] as string | null) ?? null,
        display_label_medium: (node['display_label_medium'] as string | null) ?? null,
        slug: (node['slug'] as string | null) ?? null,
        data_json: node['data_json'] ?? null,
        meta_json: node['meta_json'] ?? null,
        created_at: (node['created_at'] as string | null) ?? null,
      }));
  }

  private normalizeWvEdgesPayload(value: unknown): WvGraphApiEdge[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((edge) => ({
        id: String(edge['id'] ?? ''),
        from_node_id: String(edge['from_node_id'] ?? ''),
        to_node_id: String(edge['to_node_id'] ?? ''),
        relation_type: String(edge['relation_type'] ?? 'related_to'),
        strength: (edge['strength'] as number | null) ?? null,
        display_label_short: (edge['display_label_short'] as string | null) ?? null,
        display_label_medium: (edge['display_label_medium'] as string | null) ?? null,
      }));
  }

  private normalizeWvEvidenceLinksPayload(value: unknown): WvGraphApiEvidenceLink[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
      .map((link) => ({
        id: String(link['id'] ?? ''),
        source_type: String(link['source_type'] ?? ''),
        source_id: String(link['source_id'] ?? ''),
        target_node_id: String(link['target_node_id'] ?? ''),
        relation: String(link['relation'] ?? ''),
        evidence_text: (link['evidence_text'] as string | null) ?? null,
        display_label_short: (link['display_label_short'] as string | null) ?? null,
        display_label_medium: (link['display_label_medium'] as string | null) ?? null,
      }));
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
  for (const unit of units) byId.set(unit.id, { ...unit, children: [] });
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

function looksLikeMarkdown(value: string): boolean {
  if (!value) return false;
  return (
    /^#{1,6}\s+/m.test(value) ||   // headings
    /^\s*>/m.test(value) ||         // blockquotes
    /^\s*[-*+]\s+/m.test(value) ||  // unordered lists
    /^\s*\d+[.)]\s+/m.test(value) || // ordered lists
    /^\s*([-*_])(?:\s*\1){2,}\s*$/m.test(value) || // horizontal rules
    /\*\*[^*]+\*\*/.test(value) ||  // bold
    /\|.*\|/.test(value)            // tables
  );
}

function splitParagraphs(value: string): string[] {
  return value.split(/\n{2,}|\n/).map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function classifyBlocks(blocks: string[]): ClassifiedBlock[] {
  return blocks.map((raw, i): ClassifiedBlock => {
    const text = raw.trim();

    // ── URL / link block ──────────────────────────────────────────
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const label = text.replace(/\s*[-–—]?\s*https?:\/\/[^\s]+/, '').trim();
      return { text: label || text, type: 'link', url: urlMatch[0] };
    }

    const words = text.split(/\s+/).length;
    const endsWithPunct = /[.!?]$/.test(text);
    const prev = i > 0 ? blocks[i - 1]?.trim() ?? '' : '';
    const next = i < blocks.length - 1 ? blocks[i + 1]?.trim() ?? '' : '';
    const prevWords = prev.split(/\s+/).length;
    const nextWords = next.split(/\s+/).length;
    const nextEnds = /[.!?]$/.test(next);

    // ── Attribution line (author, Book — short, follows a long block) ─
    // Pattern: short, no period, previous block was long (quote)
    if (words <= 12 && !endsWithPunct && prevWords > 18) {
      return { text, type: 'attribution' };
    }

    // ── Headings ──────────────────────────────────────────────────
    if (words <= 4 && !endsWithPunct) return { text, type: 'h1' };

    if (words <= 9 && !endsWithPunct) {
      // If next block is a long para → section heading
      // If next block is short+no period → probably just a label
      return { text, type: nextWords > 15 ? 'h2' : 'h3' };
    }

    // ── Blockquote (longer text, next block is attribution) ───────
    const nextIsAttrib = nextWords <= 12 && !nextEnds && nextWords > 0;
    if (nextIsAttrib && words > 10) return { text, type: 'blockquote' };

    return { text, type: 'para' };
  });
}
