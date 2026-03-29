import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';

interface StatCounter {
  label: string;
  key: string;
  value: number;
  target: number;
  display: string;
}

interface FeatureCard {
  glyph: string;
  title: string;
  desc: string;
  route: string;
  tag: string;
}

@Component({
  selector: 'km-worldview-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-home.component.html',
  styleUrl: './worldview-home.component.scss',
})
export class WorldviewHomeComponent implements OnInit, AfterViewInit {
  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('statsRow') statsRowRef!: ElementRef<HTMLElement>;
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly particles = Array.from({ length: 15 }, (_, i) => i);

  readonly stats = signal<StatCounter[]>([
    { label: 'Worldviews', key: 'worldviews', value: 0, target: 0, display: '—' },
    { label: 'Sources', key: 'sources', value: 0, target: 0, display: '—' },
    { label: 'Units', key: 'source_units', value: 0, target: 0, display: '—' },
    { label: 'People', key: 'people', value: 0, target: 0, display: '—' },
  ]);

  readonly cards: FeatureCard[] = [
    {
      glyph: '§',
      title: 'Library',
      desc: 'Source library — books, notes, highlights and distillations across all your reading.',
      route: '/worldview/library',
      tag: 'Sources',
    },
    {
      glyph: '↔',
      title: 'Comparison',
      desc: 'Parallel scripture comparison across traditions — side-by-side tab analysis.',
      route: '/worldview/compare',
      tag: 'Analysis',
    },
    {
      glyph: '⚡',
      title: 'Brainstorm',
      desc: 'Free-form research journal and idea capture — session-based thinking space.',
      route: '/worldview/brainstorm',
      tag: 'Research',
    },
  ];

  ngOnInit(): void {
    void this.loadCounts();
  }

  ngAfterViewInit(): void {
    this.runEntryAnimation();
  }

  private async loadCounts(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/hub/counts`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; counts: Record<string, number> };
      if (!data.ok || !data.counts) return;

      const c = data.counts;
      const current = this.stats();
      const updated = current.map(s => ({
        ...s,
        target: c[s.key] ?? 0,
        display: String(c[s.key] ?? 0),
      }));
      this.stats.set(updated);
      this.animateCounts(updated);
    } catch {
      // silently ignore
    }
  }

  private animateCounts(stats: StatCounter[]): void {
    stats.forEach(stat => {
      if (stat.target === 0) return;
      const el = document.querySelector(`[data-key="${stat.key}"]`);
      if (!el) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: stat.target,
        duration: 1.6,
        ease: 'power2.out',
        delay: 0.6,
        onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString(); },
      });
    });
  }

  private runEntryAnimation(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -28, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', clearProps: 'filter' }
    );

    gsap.fromTo(
      this.statsRowRef.nativeElement.querySelectorAll('.wvh__stat'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.1, delay: 0.3 }
    );

    gsap.fromTo(
      '.wvh__card',
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.6, ease: 'power3.out',
        stagger: 0.12, delay: 0.5,
        clearProps: 'transform',
      }
    );
  }
}
