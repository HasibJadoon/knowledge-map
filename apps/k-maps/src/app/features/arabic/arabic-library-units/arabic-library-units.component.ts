import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, NgZone,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import gsap from 'gsap';

interface ArContainer {
  id: string; container_type: string; title: string;
  meta?: { title_ar?: string; level?: string; author?: string } | null;
}
interface ArUnit {
  id: string; container_id: string; unit_type: string; order_index: number;
  start_ref?: string | null; end_ref?: string | null;
  text_preview?: string | null; full_text?: string | null;
  meta?: { title?: string; title_ar?: string } | null;
}
interface ArTask {
  task_id: string; unit_id: string; task_type: string;
  task_name: string; status: string;
}
interface WordPopup { word: string; x: number; y: number; }
interface CaptureBar { text: string; x: number; y: number; }
type Mode = 'read' | 'listen' | 'watch' | 'capture';

@Component({
  selector: 'km-arabic-library-units',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './arabic-library-units.component.html',
  styleUrl: './arabic-library-units.component.scss',
})
export class ArabicLibraryUnitsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);
  private zone = inject(NgZone);
  private readonly base = environment.apiBase;

  // ── Data
  container = signal<ArContainer | null>(null);
  units = signal<ArUnit[]>([]);
  selectedUnit = signal<ArUnit | null>(null);
  tasks = signal<ArTask[]>([]);

  // ── Loading
  unitsLoading = signal(true);
  unitTextLoading = signal(false);
  tasksLoading = signal(false);

  // ── Interaction
  activeMode = signal<Mode>('read');
  diacriticsOn = signal(true);
  fontSize = signal(1.22);
  srsOpen = signal(false);

  // ── Overlays
  wordPopup = signal<WordPopup | null>(null);
  captureBar = signal<CaptureBar | null>(null);
  captureToast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Draggable split (read area / tasks)
  readAreaHeightPct = signal(62); // percent of right panel for reading
  private isDragging = false;
  private dragStartY = 0;
  private dragStartPct = 0;

  readonly skeletons = [1, 2, 3, 4, 5];
  readonly STATUS_ORDER = ['draft', 'ai_generated', 'review', 'approved', 'published'];

  // ── Derived
  readonly fullText = computed(() => {
    const u = this.selectedUnit();
    return u?.full_text ?? u?.text_preview ?? null;
  });

  readonly readWords = computed(() => {
    const t = this.fullText();
    if (!t) return [];
    return t.trim().split(/\s+/).filter(Boolean);
  });

  readonly tasksByStatus = computed(() => {
    const g: Record<string, ArTask[]> = {};
    for (const t of this.tasks()) (g[t.status] ??= []).push(t);
    return g;
  });

  readonly unitProgress = computed(() => {
    const total = this.tasks().length;
    if (!total) return 0;
    const done = this.tasks().filter(t => t.status === 'published' || t.status === 'approved').length;
    return Math.round((done / total) * 100);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/arabic/library']); return; }

    // Load units for this container
    this.http.get<any>(`${this.base}/ar/units?container_id=${id}&limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.units.set(res.results ?? []);
          // derive container from first unit or a parallel request
          if (res.results?.length) {
            const u = res.results[0];
            this.container.set({
              id: u.container_id,
              container_type: 'literature',
              title: u.container_title ?? '',
              meta: null,
            });
          }
        }
        this.unitsLoading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          gsap.fromTo('.u-row',
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
          );
        });
      },
      error: () => { this.unitsLoading.set(false); this.cdr.markForCheck(); },
    });

    // Also load container details
    this.http.get<any>(`${this.base}/ar/containers?limit=100`).subscribe({
      next: (res) => {
        const found = (res.results ?? []).find((c: any) => c.id === id);
        if (found) { this.container.set(found); this.cdr.markForCheck(); }
      },
    });
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.removeDragListeners();
  }

  // ── Unit selection
  selectUnit(u: ArUnit): void {
    if (this.selectedUnit()?.id === u.id) return;
    this.selectedUnit.set(u);
    this.tasks.set([]);
    this.wordPopup.set(null);
    this.captureBar.set(null);

    // Load full text
    this.unitTextLoading.set(true);
    this.http.get<any>(`${this.base}/ar/units/${u.id}`).subscribe({
      next: (res) => {
        if (res?.ok && res.result) {
          this.selectedUnit.update(prev => prev
            ? { ...prev, full_text: res.result.full_text }
            : prev
          );
        }
        this.unitTextLoading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          gsap.fromTo('.read-area',
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: 'power2.out' }
          );
        });
      },
      error: () => { this.unitTextLoading.set(false); this.cdr.markForCheck(); },
    });

    // Load tasks
    this.tasksLoading.set(true);
    this.http.get<any>(`${this.base}/ar/tasks?unit_id=${u.id}&limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) this.tasks.set(res.results ?? []);
        this.tasksLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.tasksLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Mode
  setMode(mode: Mode): void {
    this.activeMode.set(mode);
    this.wordPopup.set(null);
    this.captureBar.set(null);
  }

  adjustFont(delta: number): void {
    this.fontSize.update(v => Math.max(1, Math.min(1.8, +(v + delta * 0.1).toFixed(2))));
  }

  // ── Drag resizer
  startDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    this.dragStartY = event.clientY;
    this.dragStartPct = this.readAreaHeightPct();
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    this.zone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onDragMove);
      document.addEventListener('mouseup', this.onDragEnd);
    });
  }

  private onDragMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const panel = this.el.nativeElement.querySelector('.right-panel');
    if (!panel) return;
    const panelH = panel.offsetHeight;
    const delta = e.clientY - this.dragStartY;
    const deltaPct = (delta / panelH) * 100;
    const newPct = Math.max(25, Math.min(80, this.dragStartPct + deltaPct));
    this.zone.run(() => {
      this.readAreaHeightPct.set(Math.round(newPct));
      this.cdr.markForCheck();
    });
  };

  private onDragEnd = () => {
    this.isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.removeDragListeners();
  };

  private removeDragListeners(): void {
    document.removeEventListener('mousemove', this.onDragMove);
    document.removeEventListener('mouseup', this.onDragEnd);
  }

  // ── Word popup
  onWordClick(event: MouseEvent, word: string): void {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top - 10;
    x = Math.min(x, window.innerWidth - 250);
    x = Math.max(x, 10);
    this.wordPopup.set({ word, x, y });
    this.cdr.markForCheck();
    setTimeout(() => {
      gsap.fromTo('.word-popup',
        { opacity: 0, y: 5, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.17, ease: 'power2.out' }
      );
    });
  }

  saveWord(): void {
    const p = this.wordPopup();
    if (p) this.showToast(p.word, 'word');
    this.wordPopup.set(null);
  }

  // ── Selection capture
  onReadAreaMouseUp(): void {
    if (this.activeMode() !== 'read') return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = Math.min(rect.left + rect.width / 2 - 100, window.innerWidth - 220);
      const y = rect.top - 46;
      this.captureBar.set({ text: sel.toString().trim(), x, y });
      this.cdr.markForCheck();
      setTimeout(() => {
        gsap.fromTo('.capture-bar',
          { opacity: 0, y: 5 },
          { opacity: 1, y: 0, duration: 0.15, ease: 'power2.out' }
        );
      });
    }, 10);
  }

  captureAs(type: 'word' | 'phrase' | 'sentence'): void {
    const bar = this.captureBar();
    if (bar) this.showToast(bar.text, type);
    this.captureBar.set(null);
    window.getSelection()?.removeAllRanges();
  }

  toggleSrs(): void {
    const next = !this.srsOpen();
    this.srsOpen.set(next);
    if (next) {
      setTimeout(() => {
        gsap.fromTo('.srs-card',
          { opacity: 0, scale: 0.88 },
          { opacity: 1, scale: 1, duration: 0.2, stagger: 0.04, ease: 'back.out(2)' }
        );
      });
    }
  }

  private showToast(text: string, type: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.captureToast.set(`Saved ${type}: ${text.slice(0, 30)}`);
    this.cdr.markForCheck();
    setTimeout(() => {
      gsap.fromTo('.capture-toast',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
      );
    });
    this.toastTimer = setTimeout(() => {
      gsap.to('.capture-toast', {
        opacity: 0, y: 8, duration: 0.25, ease: 'power2.in',
        onComplete: () => { this.captureToast.set(null); this.cdr.markForCheck(); }
      });
    }, 2400);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.word-popup') && !t.closest('.w-span')) this.wordPopup.set(null);
    if (!t.closest('.capture-bar')) {
      this.captureBar.set(null);
      window.getSelection()?.removeAllRanges();
    }
  }

  // ── Helpers
  unitLabel(u: ArUnit): string {
    return u.meta?.title_ar ?? u.meta?.title ?? u.unit_type;
  }

  containerTitle(): string {
    return this.container()?.meta?.title_ar ?? this.container()?.title ?? '';
  }

  typeIcon(t: string): string {
    const m: Record<string, string> = {
      book: '📖', literature: '📖', story: '📖', poetry: '✒', classical: '📜',
      podcast: '🎙', podcast_episode: '🎙', video: '▶', video_series: '▶',
    };
    return m[t] ?? '📖';
  }

  isMedia(): boolean {
    const t = this.container()?.container_type ?? '';
    return ['podcast', 'podcast_episode', 'video', 'video_series'].includes(t);
  }

  taskTypeLabel(t: string): string {
    const m: Record<string, string> = {
      reading: 'Reading', comprehension: 'Comprehension', vocabulary: 'Vocab',
      reaction: 'Reaction', grammar_concepts: 'Grammar', morphology: 'Morphology',
    };
    return m[t] ?? t;
  }

  taskTypeColor(t: string): string {
    const m: Record<string, string> = {
      reading: 'blue', comprehension: 'sage', vocabulary: 'gold',
      reaction: 'purple', grammar_concepts: 'blue', morphology: 'ember',
    };
    return m[t] ?? '';
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      draft: 'dim', ai_generated: 'blue', review: 'amber', approved: 'sage', published: 'gold',
    };
    return m[s] ?? 'dim';
  }

  back(): void {
    this.router.navigate(['/arabic/library']);
  }
}
