import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import gsap from 'gsap';

interface ContainerMeta {
  title_ar?: string;
  level?: string;
  author?: string;
  description?: string;
  word_count?: number;
}

interface ArContainer {
  id: string;
  container_type: string;
  container_key: string;
  title: string;
  meta?: ContainerMeta | null;
}

interface UnitMeta {
  title?: string;
  title_ar?: string;
}

interface ArUnit {
  id: string;
  container_id: string;
  unit_type: string;
  order_index: number;
  start_ref?: string | null;
  end_ref?: string | null;
  text_preview?: string | null;
  meta?: UnitMeta | null;
  container_title?: string;
}

interface ArTask {
  task_id: string;
  unit_id: string;
  task_type: string;
  task_name: string;
  status: string;
  step_no?: number | null;
  task_json?: Record<string, unknown> | null;
}

@Component({
  selector: 'km-arabic-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './arabic-library.component.html',
  styleUrl: './arabic-library.component.scss',
})
export class ArabicLibraryComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  containers = signal<ArContainer[]>([]);
  selectedContainer = signal<ArContainer | null>(null);
  units = signal<ArUnit[]>([]);
  selectedUnit = signal<ArUnit | null>(null);
  tasks = signal<ArTask[]>([]);

  containersLoading = signal(true);
  unitsLoading = signal(false);
  tasksLoading = signal(false);

  readonly skeletons = [1, 2, 3, 4, 5];

  readonly tasksByStatus = computed(() => {
    const all = this.tasks();
    const groups: Record<string, ArTask[]> = {};
    for (const t of all) {
      (groups[t.status] ??= []).push(t);
    }
    return groups;
  });

  readonly STATUS_ORDER = ['draft', 'ai_generated', 'review', 'approved', 'published'];
  readonly STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', ai_generated: 'AI Generated', review: 'In Review',
    approved: 'Approved', published: 'Published', archived: 'Archived',
  };

  ngOnInit(): void {
    this.loadContainers();
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.lib-page', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  }

  private loadContainers(): void {
    this.containersLoading.set(true);
    this.http.get<any>(`${this.base}/ar/containers?limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.containers.set(res.results ?? []);
        }
        this.containersLoading.set(false);
        this.cdr.markForCheck();
        gsap.fromTo('.container-item',
          { opacity: 0, x: -12 },
          { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
        );
      },
      error: () => { this.containersLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  selectContainer(c: ArContainer): void {
    if (this.selectedContainer()?.id === c.id) return;
    this.selectedContainer.set(c);
    this.selectedUnit.set(null);
    this.units.set([]);
    this.tasks.set([]);
    this.unitsLoading.set(true);

    this.http.get<any>(`${this.base}/ar/units?container_id=${c.id}&limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) this.units.set(res.results ?? []);
        this.unitsLoading.set(false);
        this.cdr.markForCheck();
        gsap.fromTo('.unit-item',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
        );
      },
      error: () => { this.unitsLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  selectUnit(u: ArUnit): void {
    if (this.selectedUnit()?.id === u.id) { this.selectedUnit.set(null); this.tasks.set([]); return; }
    this.selectedUnit.set(u);
    this.tasks.set([]);
    this.tasksLoading.set(true);

    this.http.get<any>(`${this.base}/ar/tasks?unit_id=${u.id}&limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) this.tasks.set(res.results ?? []);
        this.tasksLoading.set(false);
        this.cdr.markForCheck();
        gsap.fromTo('.task-item',
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: 'power2.out' }
        );
      },
      error: () => { this.tasksLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  unitLabel(u: ArUnit): string {
    return u.meta?.title ?? u.meta?.title_ar ?? u.unit_type;
  }

  containerArabicTitle(c: ArContainer): string {
    return c.meta?.title_ar ?? '';
  }

  typeColor(t: string): string {
    const map: Record<string, string> = {
      literature: 'gold', poetry: 'purple', classical: 'ember',
      grammar: 'blue', balagha: 'purple', podcast: 'sage',
    };
    return map[t] ?? 'default';
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      draft: 'dim', ai_generated: 'blue', review: 'amber',
      approved: 'sage', published: 'gold',
    };
    return m[s] ?? 'dim';
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
