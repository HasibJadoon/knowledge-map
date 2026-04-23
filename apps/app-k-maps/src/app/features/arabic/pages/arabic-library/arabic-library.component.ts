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
import { environment } from '../../../../../environments/environment';
import gsap from 'gsap';
import { StatusPillComponent } from '../../../../shared/components/status-pill/status-pill.component';

interface ContainerMeta {
  title_ar?: string;
  level?: string;
  author?: string;
  description?: string;
}

interface ArContainer {
  id: string;
  container_type: string;
  container_key: string;
  title: string;
  meta?: ContainerMeta | null;
}

@Component({
  selector: 'km-arabic-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatusPillComponent],
  templateUrl: './arabic-library.component.html',
  styleUrl: './arabic-library.component.scss',
})
export class ArabicLibraryComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  containers = signal<ArContainer[]>([]);
  loading = signal(true);
  activeTypeFilter = signal<string>('all');
  groupByType = signal(false);

  readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  // Quran is a separate section — excluded from Arabic Hub
  private readonly nonQuranContainers = computed(() =>
    this.containers().filter(c => c.container_type !== 'quran')
  );

  readonly containerTypes = computed(() => {
    const types = new Set(this.nonQuranContainers().map(c => c.container_type));
    return ['all', ...Array.from(types)];
  });

  readonly filteredContainers = computed(() => {
    const f = this.activeTypeFilter();
    return f === 'all'
      ? this.nonQuranContainers()
      : this.nonQuranContainers().filter(c => c.container_type === f);
  });

  readonly groupedContainers = computed(() => {
    if (!this.groupByType()) return null;
    const groups: Record<string, ArContainer[]> = {};
    for (const c of this.filteredContainers()) {
      (groups[c.container_type] ??= []).push(c);
    }
    return groups;
  });

  readonly objectKeys = Object.keys;

  ngOnInit(): void {
    this.http.get<any>(`${this.base}/ar/containers?limit=100`).subscribe({
      next: (res) => {
        if (res?.ok) this.containers.set(res.results ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => {
          gsap.fromTo('.c-card',
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.055, ease: 'power2.out' }
          );
        });
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  ngAfterViewInit(): void {
    gsap.fromTo('.lib-page', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }

  openContainer(c: ArContainer): void {
    this.router.navigate(['/arabic/library', c.id]);
  }

  containerAr(c: ArContainer): string {
    return c.meta?.title_ar ?? '';
  }

  typeIcon(t: string): string {
    const m: Record<string, string> = {
      book: '📖', literature: '📖', story: '📖', poetry: '✒', classical: '📜',
      podcast: '🎙', podcast_episode: '🎙', video: '▶', video_series: '▶',
    };
    return m[t] ?? '📁';
  }

  typeLabel(t: string): string {
    const m: Record<string, string> = {
      book: 'Book', literature: 'Literature', story: 'Story', poetry: 'Poetry',
      classical: 'Classical', podcast: 'Podcast', podcast_episode: 'Podcast',
      video: 'Video', video_series: 'Series',
    };
    return m[t] ?? t;
  }

  typeColor(t: string): string {
    const m: Record<string, string> = {
      book: 'gold', literature: 'gold', story: 'gold', poetry: 'purple',
      classical: 'ember', podcast: 'sage', podcast_episode: 'sage',
      video: 'blue', video_series: 'blue',
    };
    return m[t] ?? '';
  }

  levelColor(l?: string): string {
    const m: Record<string, string> = { A1: 'sage', A2: 'sage', B1: 'gold', B2: 'amber', C1: 'ember', C2: 'ember' };
    return l ? (m[l] ?? '') : '';
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
