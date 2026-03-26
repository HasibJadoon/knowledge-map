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

interface BrainstormSession {
  id: number | string;
  title?: string;
  topic?: string;
  worldview?: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'km-worldview-brainstorm',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldview-brainstorm.component.html',
  styleUrl: './worldview-brainstorm.component.scss',
})
export class WorldviewBrainstormComponent implements OnInit, AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly sessions = signal<BrainstormSession[]>([]);
  readonly selectedSession = signal<BrainstormSession | null>(null);
  readonly showCreateForm = signal(false);

  ngOnInit(): void {
    void this.loadSessions();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.pageRef.nativeElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
  }

  selectSession(session: BrainstormSession): void {
    this.selectedSession.set(session);
    this.showCreateForm.set(false);
  }

  openCreateForm(): void {
    this.showCreateForm.set(true);
    this.selectedSession.set(null);
  }

  cancelCreate(): void {
    this.showCreateForm.set(false);
  }

  async createSession(title: string, topic: string, worldview: string, content: string): Promise<void> {
    if (!title.trim()) return;
    this.creating.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), topic: topic.trim() || undefined, worldview: worldview.trim() || undefined, content: content.trim() || undefined }),
      });
      if (!res.ok) { this.creating.set(false); return; }
      const data = await res.json() as { ok: boolean; session: BrainstormSession };
      if (data.ok && data.session) {
        this.sessions.update(list => [data.session, ...list]);
        this.selectedSession.set(data.session);
        this.showCreateForm.set(false);
      }
    } catch {
      // silently ignore
    } finally {
      this.creating.set(false);
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  private async loadSessions(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/brainstorm?limit=30`);
      if (!res.ok) { this.loading.set(false); return; }
      const data = await res.json() as { ok: boolean; sessions: BrainstormSession[] };
      if (data.ok && Array.isArray(data.sessions)) {
        this.sessions.set(data.sessions);
      }
    } catch {
      // silently ignore
    } finally {
      this.loading.set(false);
    }
  }
}
