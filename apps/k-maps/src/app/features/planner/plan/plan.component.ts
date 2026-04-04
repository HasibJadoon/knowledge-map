import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import type { CaptureDomain, CaptureItem, PlannerAccordionNote, PlannerPlanState, PlannerSection } from '../models/planner.models';

type ActionChipId = 'wv' | 'arabic' | 'english' | 'quran' | 'srs';

interface ActionChip {
  id: ActionChipId;
  label: string;
  glyph: string;
  accent: string;
}

@Component({
  selector: 'km-plan',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
})
export class PlanComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) items: CaptureItem[] = [];
  @Input({ required: true }) weekLabel = '';
  @Input() selectedItem: CaptureItem | null = null;
  @Input() planEditorDraft: PlannerPlanState | null = null;
  @Input() planEditorTitle = '';
  @Input() planEditorBusy = false;

  @Output() itemOpened = new EventEmitter<string>();
  @Output() closeRequested = new EventEmitter<void>();
  @Output() titleChanged = new EventEmitter<string>();
  @Output() summaryChanged = new EventEmitter<string>();
  @Output() sectionChanged = new EventEmitter<{ index: number; key: keyof PlannerSection; value: string }>();
  @Output() noteChanged = new EventEmitter<{ index: number; value: string }>();
  @Output() sectionAdded = new EventEmitter<void>();
  @Output() pushToFeed = new EventEmitter<void>();
  @Output() pushToKanban = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();
  @Output() archive = new EventEmitter<void>();
  @Output() chipClicked = new EventEmitter<ActionChipId>();

  @ViewChild('paneEl') paneEl?: ElementRef<HTMLElement>;
  @ViewChild('backdropEl') backdropEl?: ElementRef<HTMLElement>;
  @ViewChild('gridWrapEl') gridWrapEl?: ElementRef<HTMLElement>;
  @ViewChild('gridEl') gridEl?: ElementRef<HTMLElement>;
  @ViewChildren('cardEl') cardEls?: QueryList<ElementRef<HTMLElement>>;

  private cdr = inject(ChangeDetectorRef);
  private paneOpen = false;
  private paneCollapsed = false;
  private selectedCardEl: HTMLElement | null = null;

  readonly activeChip = signal<ActionChipId | null>(null);
  readonly openAccordions = signal<Set<string>>(new Set());

  readonly domainLabels: Record<CaptureDomain, string> = {
    arabic_media: 'Arabic Media',
    arabic_linguistics: 'Arabic Linguistics',
    quranic_concepts: 'Quranic Concepts',
    worldview: 'Worldview',
    english_expression: 'English Expression',
  };

  readonly actionChips: ActionChip[] = [
    { id: 'quran', label: 'Quran', glyph: '◇', accent: 'rgba(201,168,76,0.9)' },
    { id: 'arabic', label: 'Arabic', glyph: 'ع', accent: 'rgba(109,155,235,0.9)' },
    { id: 'english', label: 'English', glyph: '✦', accent: 'rgba(181,176,167,0.7)' },
    { id: 'wv', label: 'WV', glyph: '◆', accent: 'rgba(139,92,246,0.9)' },
    { id: 'srs', label: 'SRS', glyph: '↻', accent: 'rgba(52,185,150,0.9)' },
  ];

  ngAfterViewInit(): void {
    this.animateGridEntrance();
  }

  ngOnDestroy(): void {
    this.resetCardPositions();
  }

  private animateGridEntrance(): void {
    const cards = this.cardEls?.toArray().map(r => r.nativeElement) ?? [];
    if (cards.length) {
      gsap.fromTo(cards, { opacity: 0, y: 18 }, {
        opacity: 1, y: 0, duration: 0.38, stagger: 0.045, ease: 'power2.out',
      });
    }
  }

  private resetCardPositions(): void {
    const cards = this.cardEls?.toArray().map(r => r.nativeElement) ?? [];
    if (cards.length) gsap.set(cards, { clearProps: 'all' });
  }

  selectCard(item: CaptureItem, cardEl: HTMLElement): void {
    this.selectedCardEl = cardEl;
    this.itemOpened.emit(item.id);
    this.paneCollapsed = false;

    // Brief card flash
    gsap.fromTo(cardEl, { scale: 0.97 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });

    this.cdr.detectChanges(); // ensure pane + backdrop are in DOM

    const pane     = this.paneEl?.nativeElement;
    const backdrop = this.backdropEl?.nativeElement;
    const grid     = this.gridWrapEl?.nativeElement;

    // Backdrop
    if (backdrop) {
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }

    // Grid dims and scales slightly
    if (grid) {
      gsap.to(grid, { scale: 0.985, opacity: 0.45, duration: 0.35, ease: 'power2.out' });
    }

    if (pane && !this.paneOpen) {
      this.paneOpen = true;
      gsap.fromTo(pane,
        { x: '-100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.42, ease: 'expo.out' }
      );
    } else if (pane) {
      // Already open — content morph
      gsap.fromTo(pane, { opacity: 0.7, y: -8 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' });
    }
  }

  closePane(): void {
    const pane     = this.paneEl?.nativeElement;
    const backdrop = this.backdropEl?.nativeElement;
    const grid     = this.gridWrapEl?.nativeElement;

    if (grid) gsap.to(grid, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.inOut' });
    if (backdrop) gsap.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power2.in' });

    if (pane) {
      gsap.to(pane, { x: '-100%', opacity: 0, duration: 0.3, ease: 'expo.in',
        onComplete: () => { this.paneOpen = false; this.paneCollapsed = false; this.closeRequested.emit(); this.cdr.markForCheck(); }
      });
    } else {
      this.paneOpen = false;
      this.paneCollapsed = false;
      this.closeRequested.emit();
    }

    if (this.selectedCardEl) {
      gsap.to(this.selectedCardEl, { scale: 1, duration: 0.2, ease: 'power2.out' });
      this.selectedCardEl = null;
    }
  }

  collapsePane(): void {
    const pane = this.paneEl?.nativeElement;
    if (!pane || this.paneCollapsed) return;
    this.paneCollapsed = true;
    gsap.to(pane, { width: '3rem', duration: 0.32, ease: 'expo.inOut' });
    // restore grid
    const grid = this.gridWrapEl?.nativeElement;
    if (grid) gsap.to(grid, { scale: 1, opacity: 1, duration: 0.28, ease: 'power2.out' });
    const backdrop = this.backdropEl?.nativeElement;
    if (backdrop) gsap.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power2.in' });
  }

  expandPane(): void {
    const pane = this.paneEl?.nativeElement;
    if (!pane || !this.paneCollapsed) return;
    this.paneCollapsed = false;
    gsap.to(pane, { width: 'min(40%, 28rem)', duration: 0.35, ease: 'expo.out' });
    const grid = this.gridWrapEl?.nativeElement;
    if (grid) gsap.to(grid, { scale: 0.985, opacity: 0.45, duration: 0.28, ease: 'power2.out' });
    const backdrop = this.backdropEl?.nativeElement;
    if (backdrop) gsap.to(backdrop, { opacity: 1, duration: 0.25, ease: 'power2.out' });
  }

  get isPaneCollapsed(): boolean { return this.paneCollapsed; }

  selectChip(id: ActionChipId): void {
    this.activeChip.set(this.activeChip() === id ? null : id);
    this.chipClicked.emit(id);
  }

  toggleAccordion(note: PlannerAccordionNote): void {
    const next = new Set(this.openAccordions());
    if (next.has(note.id)) { next.delete(note.id); } else { next.add(note.id); }
    this.openAccordions.set(next);
  }

  isAccordionOpen(note: PlannerAccordionNote): boolean {
    return this.openAccordions().has(note.id);
  }

  summary(item: CaptureItem): string {
    return item.payload.plan_state?.summary || item.compact_context || item.note || item.quote || '';
  }

  stageLabel(item: CaptureItem): string {
    if (item.payload.plan_state?.pushed_to_kanban_at || item.payload.plan_state?.pushed_to_feed_at) return 'Ready';
    if (item.stage === 'review' || item.stage === 'done') return 'Refining';
    return 'Draft';
  }

  formatTime(val: string): string {
    try {
      return new Date(val).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return val; }
  }

  isSelected(id: string): boolean {
    return this.selectedItem?.id === id;
  }
}
