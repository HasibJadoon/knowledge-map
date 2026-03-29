import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';

interface Workspace {
  id: string;
  name: string;
  type: string;
  description: string;
  member_count?: number;
  created_at?: string;
  status?: string;
}

@Component({
  selector: 'km-workspace-home',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-home.component.html',
  styleUrl: './workspace-home.component.scss',
})
export class WorkspaceHomeComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;

  readonly workspaces = signal<Workspace[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly particles = Array.from({ length: 12 }, (_, i) => i);

  ngOnInit(): void {
    void this.load();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -24, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: 'power3.out', clearProps: 'filter' }
    );
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${environment.apiBase}/workspaces?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; workspaces: Workspace[] };
      this.workspaces.set(data.workspaces ?? []);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load workspaces');
    } finally {
      this.loading.set(false);
      // Stagger cards after data loads
      setTimeout(() => {
        const cards = document.querySelectorAll('.wh__card');
        if (cards.length > 0) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 32, scale: .95 },
            { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'power3.out', stagger: .08, clearProps: 'transform' }
          );
        }
      }, 0);
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/landing');
  }

  goToHub(): void {
    void this.router.navigateByUrl('/hub/workspace/workspaces');
  }

  openWorkspace(id: string): void {
    void this.router.navigate(['/workspace', id]);
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
