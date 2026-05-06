import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import gsap from 'gsap';
import { QuranApiService } from '../../../shared/services/quran/quran-api.service';
import { mapQrMenuSurahToListItem } from '../../../shared/services/quran/quran-api.mapper';
import { QuranSurahListItemDto } from '../../../shared/models/quran/quran.models';
import {
  SRS_DECKS,
  SrsDeckId,
  SrsDeckMeta,
  SrsQueueFilter,
  SrsQueueItem,
  SrsRating,
  SrsService,
  SrsSummary,
} from '../data/srs.service';

type ReviewLog = {
  id: string;
  prompt: string;
  rating: SrsRating;
  reference: string;
  nextDue: string;
};

type DeckCardVm = SrsDeckMeta & {
  due: number;
  upcoming: number;
  suspended: number;
  mastered: number;
  total: number;
};

type ForecastPoint = {
  label: string;
  count: number;
};

type SrsScreen = 'decks' | 'study' | 'dashboard';

const EMPTY_SUMMARY: SrsSummary = {
  due: 0,
  upcoming: 0,
  suspended: 0,
  total: 0,
};

@Component({
  selector: 'km-srs-home',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './srs-home.component.html',
  styleUrl: './srs-home.component.scss',
})
export class SrsHomeComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly qrApi = inject(QuranApiService);
  private readonly srs = inject(SrsService);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChildren('deckCard') deckCardRefs!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('deckChart') deckChartRef?: ElementRef<SVGSVGElement>;
  @ViewChild('forecastChart') forecastChartRef?: ElementRef<SVGSVGElement>;
  @ViewChild('histogramChart') histogramChartRef?: ElementRef<SVGSVGElement>;
  @ViewChild('reviewCardInner') reviewCardInnerRef?: ElementRef<HTMLElement>;
  @ViewChild('studyCard') studyCardRef?: ElementRef<HTMLElement>;

  readonly decks = SRS_DECKS;
  readonly filters: SrsQueueFilter[] = ['due', 'upcoming', 'all', 'suspended'];
  readonly surahs = signal<QuranSurahListItemDto[]>([]);
  readonly allItems = signal<SrsQueueItem[]>([]);
  readonly summary = signal<SrsSummary>(EMPTY_SUMMARY);
  readonly activeFilter = signal<SrsQueueFilter>('due');
  readonly selectedSurahId = signal<number | null>(null);
  readonly selectedDeckId = signal<SrsDeckId>(SRS_DECKS[0].id);
  readonly currentScreen = signal<SrsScreen>('decks');
  readonly loading = signal(true);
  readonly reviewing = signal(false);
  readonly flipped = signal(false);
  readonly error = signal<string | null>(null);
  readonly sourceMode = signal<'api' | 'demo'>('api');
  readonly recentReviews = signal<ReviewLog[]>([]);

  readonly deckCards = computed<DeckCardVm[]>(() =>
    this.decks.map((deck) => {
      const items = this.allItems().filter((item) => item.deck_id === deck.id);
      return {
        ...deck,
        due: items.filter((item) => item.due_state === 'due').length,
        upcoming: items.filter((item) => item.due_state === 'upcoming').length,
        suspended: items.filter((item) => item.due_state === 'suspended').length,
        mastered: items.filter((item) => item.due_state !== 'suspended' && (item.reps ?? 0) >= 4).length,
        total: items.length,
      };
    }),
  );

  readonly selectedDeck = computed<DeckCardVm>(() => {
    return this.deckCards().find((deck) => deck.id === this.selectedDeckId()) ?? this.deckCards()[0];
  });

  readonly selectedDeckItems = computed(() => {
    return this.sortItems(
      this.allItems().filter((item) => item.deck_id === this.selectedDeckId()),
    );
  });

  readonly visibleDeckItems = computed(() => {
    const items = this.selectedDeckItems();
    if (this.activeFilter() === 'all') {
      return items;
    }
    return items.filter((item) => item.due_state === this.activeFilter());
  });

  readonly currentItem = computed(() => {
    const items = this.visibleDeckItems();
    if (items.length > 0) {
      return items[0];
    }
    if (this.activeFilter() === 'all') {
      return this.selectedDeckItems().find((item) => item.due_state === 'due') ?? this.selectedDeckItems()[0] ?? null;
    }
    return null;
  });

  readonly queueItems = computed(() => {
    const currentId = this.currentItem()?.id ?? null;
    return this.visibleDeckItems().filter((item) => item.id !== currentId);
  });

  readonly selectedSurahLabel = computed(() => {
    const surahId = this.selectedSurahId();
    if (!surahId) {
      return 'All scopes';
    }
    const match = this.surahs().find((surah) => surah.surahNumber === surahId);
    return match ? `${match.surahNumber}. ${match.englishName}` : `Surah ${surahId}`;
  });

  private animationContext: gsap.Context | null = null;
  private cleanupDeckTilts: Array<() => void> = [];
  private cleanupStudyCardTilt: (() => void) | null = null;
  private chartFrameId: number | null = null;

  constructor() {
    this.loadSurahs();
    this.loadQueue();
  }

  ngAfterViewInit(): void {
    this.animationContext = gsap.context(() => {
      gsap.fromTo(
        '.srs__topbar, .srs__error',
        { opacity: 0, y: 26, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: 0.08 },
      );

      gsap.fromTo(
        '.srs-deck',
        { opacity: 0, y: 34, rotateX: -12 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.65, ease: 'power3.out', stagger: 0.06 },
      );

      gsap.fromTo(
        '.srs-stage',
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.72, ease: 'power3.out', stagger: 0.08, delay: 0.16 },
      );
    }, this.pageRef.nativeElement);

    this.attachDeckTilts();
    this.deckCardRefs.changes.subscribe(() => this.attachDeckTilts());
    this.scheduleVisualRefresh();
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
    this.cleanupDeckTilts.forEach((cleanup) => cleanup());
    this.cleanupDeckTilts = [];
    this.cleanupStudyCardTilt?.();
    this.cleanupStudyCardTilt = null;

    if (this.chartFrameId !== null) {
      window.cancelAnimationFrame(this.chartFrameId);
      this.chartFrameId = null;
    }
  }

  back(): void {
    void this.router.navigate(['/home']);
  }

  setScreen(screen: SrsScreen): void {
    if (screen !== 'decks' && this.selectedDeckItems().length === 0) {
      return;
    }
    this.currentScreen.set(screen);
    this.flipped.set(false);
    this.animateReviewCard(false);
    this.scheduleVisualRefresh();
  }

  openSurah(item: SrsQueueItem): void {
    if (!item.surah_id) {
      return;
    }
    void this.router.navigate(['/quran', 'sura', item.surah_id, 'srs']);
  }

  setFilter(filter: SrsQueueFilter): void {
    if (this.activeFilter() === filter) {
      return;
    }
    this.activeFilter.set(filter);
    this.flipped.set(false);
    this.animateReviewCard(false);
    this.scheduleVisualRefresh();
  }

  setSurahFilter(rawValue: string): void {
    const nextValue = rawValue ? Number(rawValue) : null;
    this.selectedSurahId.set(nextValue && Number.isFinite(nextValue) ? nextValue : null);
    this.flipped.set(false);
    this.animateReviewCard(false);
    this.loadQueue();
  }

  selectDeck(deckId: SrsDeckId): void {
    const changed = this.selectedDeckId() !== deckId;
    if (changed) {
      this.selectedDeckId.set(deckId);
      this.flashSelectedDeck();
    }
    this.currentScreen.set('study');
    this.flipped.set(false);
    this.animateReviewCard(false);
    this.scheduleVisualRefresh();
  }

  openStudyScreen(): void {
    if (!this.selectedDeckItems().length) {
      return;
    }
    this.setScreen('study');
  }

  openDashboardScreen(): void {
    if (this.selectedDeckItems().length === 0) {
      return;
    }
    this.setScreen('dashboard');
  }

  toggleCard(): void {
    if (!this.currentItem() || this.reviewing()) {
      return;
    }
    const next = !this.flipped();
    this.flipped.set(next);
    this.animateReviewCard(next);
  }

  rateCurrent(rating: SrsRating): void {
    const item = this.currentItem();
    if (!item || this.reviewing()) {
      return;
    }

    this.reviewing.set(true);
    this.error.set(null);

    this.srs.reviewCard(item, rating).subscribe({
      next: (updatedItem) => {
        const nextItems = this.sortItems(
          this.allItems().map((entry) => (entry.id === item.id ? updatedItem : entry)),
        );

        this.allItems.set(nextItems);
        this.summary.set(this.summarize(nextItems));
        this.recentReviews.update((log) => [
          {
            id: updatedItem.id,
            prompt: item.title,
            rating,
            reference: updatedItem.reference,
            nextDue: this.formatDueDate(updatedItem.due_at),
          },
          ...log,
        ].slice(0, 6));

        this.reviewing.set(false);
        this.flipped.set(false);
        this.animateReviewCard(false);
        this.scheduleVisualRefresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Unable to submit review.');
        this.reviewing.set(false);
      },
    });
  }

  formatDueState(item: SrsQueueItem): string {
    if (item.due_state === 'suspended') {
      return 'Suspended';
    }
    if (!item.due_at) {
      return 'Unscheduled';
    }

    const delta = Math.ceil((new Date(item.due_at).getTime() - Date.now()) / 86400000);
    if (delta <= 0) {
      return 'Due now';
    }
    if (delta === 1) {
      return 'Tomorrow';
    }
    return `In ${delta} days`;
  }

  formatRating(label?: string | null): string {
    if (!label) {
      return 'New';
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  deckMetricLabel(deck: DeckCardVm): string {
    return deck.total === 1 ? 'card' : 'cards';
  }

  trackByItem(_: number, item: SrsQueueItem): string {
    return item.id;
  }

  trackByDeck(_: number, deck: DeckCardVm): string {
    return deck.id;
  }

  private loadSurahs(): void {
    this.qrApi.getMenu().subscribe({
      next: (response) => this.surahs.set(response.data.surahs.map(mapQrMenuSurahToListItem)),
      error: () => this.surahs.set([]),
    });
  }

  private loadQueue(): void {
    this.loading.set(true);
    this.error.set(null);

    this.srs.listQueue('all', this.selectedSurahId()).subscribe({
      next: (response) => {
        const items = this.sortItems(response.items);
        this.allItems.set(items);
        this.summary.set(response.summary);
        this.sourceMode.set(response.source);
        this.ensureSelectedDeck(items);
        this.loading.set(false);
        this.scheduleVisualRefresh();
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Unable to load SRS queue.');
        this.allItems.set([]);
        this.summary.set(EMPTY_SUMMARY);
        this.loading.set(false);
        this.scheduleVisualRefresh();
      },
    });
  }

  private ensureSelectedDeck(items: SrsQueueItem[]): void {
    const current = this.selectedDeckId();
    if (items.some((item) => item.deck_id === current)) {
      return;
    }
    const populated = this.decks.find((deck) => items.some((item) => item.deck_id === deck.id));
    this.selectedDeckId.set(populated?.id ?? this.decks[0].id);
  }

  private summarize(items: SrsQueueItem[]): SrsSummary {
    return {
      due: items.filter((item) => item.due_state === 'due').length,
      upcoming: items.filter((item) => item.due_state === 'upcoming').length,
      suspended: items.filter((item) => item.due_state === 'suspended').length,
      total: items.length,
    };
  }

  private sortItems(items: SrsQueueItem[]): SrsQueueItem[] {
    const deckRank = new Map(this.decks.map((deck, index) => [deck.id, index]));
    const stateRank = { due: 0, upcoming: 1, suspended: 2 } as const;

    return [...items].sort((a, b) => {
      const deckDelta = (deckRank.get(a.deck_id) ?? 0) - (deckRank.get(b.deck_id) ?? 0);
      if (deckDelta !== 0) {
        return deckDelta;
      }

      const stateDelta = stateRank[a.due_state] - stateRank[b.due_state];
      if (stateDelta !== 0) {
        return stateDelta;
      }

      const timeA = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }

  private attachDeckTilts(): void {
    this.cleanupDeckTilts.forEach((cleanup) => cleanup());
    this.cleanupDeckTilts = [];

    this.deckCardRefs.forEach((ref) => {
      const element = ref.nativeElement;
      const onMove = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(element, {
          rotateX: py * -8,
          rotateY: px * 10,
          y: -8,
          duration: 0.35,
          ease: 'power2.out',
          transformPerspective: 1000,
          transformOrigin: 'center',
        });
      };

      const onLeave = () => {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          y: 0,
          duration: 0.45,
          ease: 'power3.out',
        });
      };

      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      this.cleanupDeckTilts.push(() => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  private flashSelectedDeck(): void {
    const selected = this.deckCardRefs.find((ref) => ref.nativeElement.dataset['deckId'] === this.selectedDeckId());
    if (!selected) {
      return;
    }
    gsap.fromTo(
      selected.nativeElement,
      { boxShadow: '0 0 0 rgba(0,0,0,0)' },
      { boxShadow: '0 24px 80px rgba(0,0,0,0.45)', duration: 0.5, ease: 'power2.out' },
    );
  }

  private animateReviewCard(flipped: boolean): void {
    const inner = this.reviewCardInnerRef?.nativeElement;
    if (!inner) {
      return;
    }
    gsap.to(inner, {
      rotateY: flipped ? 180 : 0,
      duration: 0.8,
      ease: 'power3.inOut',
      transformPerspective: 1200,
      overwrite: true,
    });
  }

  private scheduleVisualRefresh(): void {
    if (this.chartFrameId !== null) {
      window.cancelAnimationFrame(this.chartFrameId);
    }

    this.chartFrameId = window.requestAnimationFrame(() => {
      this.chartFrameId = null;
      this.renderDeckChart();
      this.renderForecastChart();
      this.renderHistogramChart();
      this.animateScreenText();
      this.syncStudyCardMotion();
    });
  }

  private renderDeckChart(): void {
    const svg = this.deckChartRef?.nativeElement;
    if (!svg) {
      return;
    }

    const data = this.deckCards();
    const width = 620;
    const height = 300;
    const margin = { top: 20, right: 22, bottom: 18, left: 176 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(
      1,
      ...data.map((deck) => deck.due + deck.upcoming + deck.suspended),
    );

    const root = d3.select(svg);
    root.selectAll('*').remove();
    root.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);
    const y = d3.scaleBand<string>()
      .domain(data.map((deck) => deck.id))
      .range([0, innerHeight])
      .padding(0.28);

    const chart = root.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    data.forEach((deck) => {
      const yPos = y(deck.id) ?? 0;
      const barHeight = y.bandwidth();
      let cursor = 0;

      chart.append('text')
        .attr('x', -18)
        .attr('y', yPos + barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', deck.id === this.selectedDeckId() ? '#f0d78a' : 'rgba(255,255,255,0.76)')
        .attr('font-size', 12)
        .text(deck.shortLabel);

      const segments = [
        { key: 'due', value: deck.due, fill: deck.accent },
        { key: 'upcoming', value: deck.upcoming, fill: 'rgba(255,255,255,0.28)' },
        { key: 'suspended', value: deck.suspended, fill: 'rgba(255,255,255,0.12)' },
      ];

      chart.append('rect')
        .attr('x', 0)
        .attr('y', yPos)
        .attr('width', innerWidth)
        .attr('height', barHeight)
        .attr('rx', barHeight / 2)
        .attr('fill', 'rgba(255,255,255,0.04)');

      for (const segment of segments) {
        if (!segment.value) {
          continue;
        }
        const segmentWidth = x(segment.value);
        chart.append('rect')
          .attr('x', cursor)
          .attr('y', yPos)
          .attr('width', segmentWidth)
          .attr('height', barHeight)
          .attr('rx', barHeight / 2)
          .attr('fill', segment.fill);
        cursor += segmentWidth;
      }

      chart.append('text')
        .attr('x', innerWidth + 10)
        .attr('y', yPos + barHeight / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'rgba(255,255,255,0.56)')
        .attr('font-size', 11)
        .text(`${deck.total} total`);
    });
  }

  private renderForecastChart(): void {
    const svg = this.forecastChartRef?.nativeElement;
    if (!svg) {
      return;
    }

    const data = this.buildForecast();
    const width = 620;
    const height = 300;
    const margin = { top: 18, right: 18, bottom: 30, left: 24 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const root = d3.select(svg);
    root.selectAll('*').remove();
    root.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scalePoint<string>()
      .domain(data.map((point) => point.label))
      .range([0, innerWidth]);
    const y = d3.scaleLinear()
      .domain([0, Math.max(2, d3.max(data, (point) => point.count) ?? 0)])
      .range([innerHeight, 0]);

    const chart = root.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const accent = this.selectedDeck().accent;

    const area = d3.area<ForecastPoint>()
      .x((point) => x(point.label) ?? 0)
      .y0(innerHeight)
      .y1((point) => y(point.count))
      .curve(d3.curveCatmullRom.alpha(0.7));

    const line = d3.line<ForecastPoint>()
      .x((point) => x(point.label) ?? 0)
      .y((point) => y(point.count))
      .curve(d3.curveCatmullRom.alpha(0.7));

    chart.append('path')
      .datum(data)
      .attr('d', area)
      .attr('fill', accent)
      .attr('opacity', 0.18);

    chart.append('path')
      .datum(data)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', accent)
      .attr('stroke-width', 2.4);

    chart.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (point) => x(point.label) ?? 0)
      .attr('cy', (point) => y(point.count))
      .attr('r', 4.5)
      .attr('fill', accent)
      .attr('stroke', '#050505')
      .attr('stroke-width', 2);

    chart.selectAll('text.label')
      .data(data)
      .join('text')
      .attr('x', (point) => x(point.label) ?? 0)
      .attr('y', innerHeight + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.44)')
      .attr('font-size', 11)
      .text((point) => point.label);
  }

  private renderHistogramChart(): void {
    const svg = this.histogramChartRef?.nativeElement;
    if (!svg) {
      return;
    }

    const items = this.selectedDeckItems();
    const bins = [
      { label: '0', count: 0 },
      { label: '1', count: 0 },
      { label: '2', count: 0 },
      { label: '3', count: 0 },
      { label: '4+', count: 0 },
    ];

    items.forEach((item) => {
      const reps = item.reps ?? 0;
      if (reps >= 4) {
        bins[4].count += 1;
      } else {
        bins[reps].count += 1;
      }
    });

    const width = 620;
    const height = 260;
    const margin = { top: 18, right: 16, bottom: 32, left: 26 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const root = d3.select(svg);
    root.selectAll('*').remove();
    root.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scaleBand<string>()
      .domain(bins.map((bin) => bin.label))
      .range([0, innerWidth])
      .padding(0.22);
    const y = d3.scaleLinear()
      .domain([0, Math.max(1, d3.max(bins, (bin) => bin.count) ?? 0)])
      .range([innerHeight, 0]);

    const chart = root.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const accent = this.selectedDeck().accent;

    chart.selectAll('rect')
      .data(bins)
      .join('rect')
      .attr('x', (bin) => x(bin.label) ?? 0)
      .attr('y', (bin) => y(bin.count))
      .attr('width', x.bandwidth())
      .attr('height', (bin) => innerHeight - y(bin.count))
      .attr('rx', 12)
      .attr('fill', accent)
      .attr('opacity', 0.82);

    chart.selectAll('text.count')
      .data(bins)
      .join('text')
      .attr('class', 'count')
      .attr('x', (bin) => (x(bin.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', (bin) => y(bin.count) - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .attr('font-size', 11)
      .text((bin) => bin.count);

    chart.selectAll('text.label')
      .data(bins)
      .join('text')
      .attr('class', 'label')
      .attr('x', (bin) => (x(bin.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', innerHeight + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.44)')
      .attr('font-size', 11)
      .text((bin) => bin.label);
  }

  private buildForecast(): ForecastPoint[] {
    const items = this.selectedDeckItems();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const start = new Date(today.getTime() + index * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const label = start.toLocaleDateString('en', { weekday: 'short' });

      const count = items.filter((item) => {
        if (!item.due_at || item.due_state === 'suspended') {
          return false;
        }
        const due = new Date(item.due_at);
        if (index === 0) {
          return due <= end;
        }
        return due > start && due <= end;
      }).length;

      return { label, count };
    });
  }

  private syncStudyCardMotion(): void {
    const card = this.studyCardRef?.nativeElement;
    if (!card) {
      this.cleanupStudyCardTilt?.();
      this.cleanupStudyCardTilt = null;
      return;
    }

    gsap.killTweensOf(card);
    gsap.set(card, {
      clearProps: 'opacity,visibility,x,y,scale',
      rotateX: 2,
      rotateY: -1.5,
      transformPerspective: 1800,
      transformOrigin: 'center center',
    });
    gsap.fromTo(
      card,
      { opacity: 0, y: 30, rotateX: 6, rotateY: -4, scale: 0.975 },
      { opacity: 1, y: 0, rotateX: 2, rotateY: -1.5, scale: 1, duration: 0.82, ease: 'power3.out', overwrite: true },
    );
    gsap.to(card, {
      y: -4,
      duration: 3.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      overwrite: false,
    });

    this.cleanupStudyCardTilt?.();
    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateX: 2 + py * -6,
        rotateY: -1.5 + px * 8,
        duration: 0.32,
        ease: 'power2.out',
        overwrite: true,
      });
    };
    const onLeave = () => {
      gsap.to(card, {
        rotateX: 2,
        rotateY: -1.5,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: true,
      });
    };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    this.cleanupStudyCardTilt = () => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
    };
  }

  private animateScreenText(): void {
    const page = this.pageRef?.nativeElement;
    if (!page) {
      return;
    }

    const eyebrow = page.querySelector('.srs-intro__eyebrow');
    const title = page.querySelector('.srs-intro__title');
    const subtitle = page.querySelector('.srs-intro__subtitle');
    const navIcons = page.querySelectorAll('.srs-screen-nav__icon');
    const stageBlocks = page.querySelectorAll(
      '.srs-controls, .srs-review__state, .srs-review__actions, .srs-study__queue, .srs-progress__summary, .srs-progress__chart, .srs-trail',
    );
    const deckCards = page.querySelectorAll('.srs-deck');

    if (eyebrow) {
      gsap.fromTo(
        eyebrow,
        { autoAlpha: 0, y: 20, letterSpacing: '0.34em' },
        { autoAlpha: 1, y: 0, letterSpacing: '0.24em', duration: 0.75, ease: 'power3.out', overwrite: true },
      );
    }

    if (title) {
      gsap.fromTo(
        title,
        { autoAlpha: 0, y: 36, filter: 'blur(10px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', overwrite: true },
      );
    }

    if (subtitle) {
      gsap.fromTo(
        subtitle,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.72, ease: 'power3.out', delay: 0.08, overwrite: true },
      );
    }

    if (navIcons.length) {
      gsap.fromTo(
        navIcons,
        { autoAlpha: 0, x: -16, scale: 0.92 },
        { autoAlpha: 1, x: 0, scale: 1, duration: 0.45, ease: 'power2.out', stagger: 0.06, overwrite: true },
      );
    }

    if (deckCards.length) {
      gsap.fromTo(
        deckCards,
        { autoAlpha: 0, y: 28, rotateX: -10 },
        { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.58, ease: 'power3.out', stagger: 0.06, overwrite: true },
      );
    }

    if (stageBlocks.length) {
      gsap.fromTo(
        stageBlocks,
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, delay: 0.06, overwrite: true },
      );
    }
  }

  private formatDueDate(dueAt?: string): string {
    if (!dueAt) {
      return 'Unscheduled';
    }
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dueAt));
  }
}
