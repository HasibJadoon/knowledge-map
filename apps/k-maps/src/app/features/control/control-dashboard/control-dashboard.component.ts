import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';

import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { ControlApiService } from '../control-api.service';
import {
  ControlSnapshot,
  FeatureFlag,
  FeedEvent,
  SubsystemStat,
  SubsystemStatus,
} from '../control.models';

// Glyph per subsystem — kept in the component so the template stays declarative.
const SUBSYSTEM_GLYPHS: Record<string, string> = {
  identity: '⊙',
  workspaces: '⊞',
  sessions: '◉',
  tokens: '⚿',
  access: '⛨',
  policies: '§',
  flags: '⚑',
  review: '⧗',
  signals: '◈',
  people: '☗',
  podcasts: '❋',
  telemetry: '∿',
};

@Component({
  selector: 'km-control-dashboard',
  standalone: true,
  imports: [BackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './control-dashboard.component.html',
  styleUrl: './control-dashboard.component.scss',
})
export class ControlDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(ControlApiService);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;

  readonly snapshot = signal<ControlSnapshot | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly refreshing = signal(false);

  readonly particles = Array.from({ length: 14 }, (_, i) => i);

  private animationContext: gsap.Context | null = null;

  // ── Derived view state ──────────────────────────────────────────────────────

  readonly subsystems = computed<SubsystemStat[]>(
    () => this.snapshot()?.subsystems ?? [],
  );
  readonly flags = computed<FeatureFlag[]>(
    () => this.snapshot()?.feature_flags ?? [],
  );
  readonly feed = computed<FeedEvent[]>(() => this.snapshot()?.feed ?? []);
  readonly health = computed<number>(() => this.snapshot()?.health_index ?? 0);

  readonly healthLabel = computed<string>(() => {
    const h = this.health();
    if (h >= 90) return 'ALL SYSTEMS NOMINAL';
    if (h >= 70) return 'OPERATIONAL';
    if (h >= 50) return 'DEGRADED';
    return 'ATTENTION REQUIRED';
  });

  // Stroke-dashoffset for the SVG health ring (circumference ≈ 2πr, r = 52).
  readonly ringCircumference = 2 * Math.PI * 52;
  readonly ringOffset = computed<number>(
    () => this.ringCircumference * (1 - this.health() / 100),
  );

  readonly alertCount = computed<number>(
    () => this.subsystems().filter((s) => s.status === 'alert').length,
  );
  readonly activeCount = computed<number>(
    () => this.subsystems().filter((s) => s.status === 'active').length,
  );

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    void this.load();
  }

  ngAfterViewInit(): void {
    this.animationContext?.revert();
    this.animationContext = gsap.context(() => {
      gsap.fromTo(
        this.headerRef.nativeElement,
        { opacity: 0, y: -24, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.9,
          ease: 'power3.out',
          clearProps: 'filter',
        },
      );
    }, this.pageRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
  }

  // ── Data ────────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.snapshot.set(await firstValueFrom(this.api.getSnapshot()));
    } catch (e) {
      this.error.set(this.messageFor(e));
    } finally {
      this.loading.set(false);
      this.animateGrid();
    }
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    this.error.set(null);
    try {
      this.snapshot.set(await firstValueFrom(this.api.getSnapshot()));
      this.animateGrid();
    } catch (e) {
      this.error.set(this.messageFor(e));
    } finally {
      this.refreshing.set(false);
    }
  }

  private animateGrid(): void {
    setTimeout(() => {
      const tiles = this.pageRef?.nativeElement.querySelectorAll('.ctl-tile');
      if (tiles && tiles.length) {
        gsap.fromTo(
          tiles,
          { opacity: 0, y: 26, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: 'power3.out',
            stagger: 0.045,
            clearProps: 'transform',
          },
        );
      }
    }, 0);
  }

  private messageFor(e: unknown): string {
    if (e && typeof e === 'object' && 'status' in e) {
      const status = (e as { status?: number }).status;
      if (status === 401 || status === 403) {
        return 'Admin access required to view the control deck.';
      }
    }
    return e instanceof Error ? e.message : 'Failed to reach the core control system.';
  }

  // ── Template helpers ────────────────────────────────────────────────────────

  glyph(key: string): string {
    return SUBSYSTEM_GLYPHS[key] ?? '◇';
  }

  statusClass(status: SubsystemStatus): string {
    return `is-${status}`;
  }

  /** Fill fraction (0–1) for a subsystem's active/total meter. */
  fillFraction(s: SubsystemStat): number {
    if (s.total <= 0) return 0;
    return Math.max(0, Math.min(1, s.active / s.total));
  }

  relativeTime(iso: string): string {
    try {
      const then = new Date(iso).getTime();
      const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
      if (secs < 60) return `${secs}s ago`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  }

  shortRef(ref: string | null): string {
    if (!ref) return '—';
    // CORE:01J… → …last 6 chars, keeps the log compact.
    const tail = ref.slice(-6);
    return ref.includes(':') ? `${ref.split(':')[0]}:${tail}` : tail;
  }
}
