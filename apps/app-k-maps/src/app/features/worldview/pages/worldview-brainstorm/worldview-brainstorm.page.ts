import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';

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
  selector: 'app-worldview-brainstorm',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink],
  templateUrl: './worldview-brainstorm.page.html',
  styleUrl: './worldview-brainstorm.page.scss',
})
export class WorldviewBrainstormPage implements OnInit {
  @ViewChild('titleInput') titleInputRef!: ElementRef<HTMLIonInputElement>;

  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly sessions = signal<BrainstormSession[]>([]);
  readonly selected = signal<BrainstormSession | null>(null);
  readonly showForm = signal(false);

  draft = { title: '', topic: '', worldview: '', content: '' };

  ngOnInit(): void {
    void this.loadSessions();
  }

  selectSession(session: BrainstormSession): void {
    this.selected.set(session);
    this.showForm.set(false);
  }

  openCreateForm(): void {
    this.showForm.set(true);
    this.selected.set(null);
    this.draft = { title: '', topic: '', worldview: '', content: '' };
  }

  cancelCreate(): void {
    this.showForm.set(false);
  }

  async saveSession(): Promise<void> {
    if (!this.draft.title.trim()) return;
    this.creating.set(true);
    try {
      const res = await fetch(`${environment.apiBase}/wv/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: this.draft.title.trim(),
          topic: this.draft.topic.trim() || undefined,
          worldview: this.draft.worldview.trim() || undefined,
          content: this.draft.content.trim() || undefined,
        }),
      });
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; session: BrainstormSession };
      if (data.ok && data.session) {
        this.sessions.update(list => [data.session, ...list]);
        this.selected.set(data.session);
        this.showForm.set(false);
      }
    } catch {
      // silently ignore
    } finally {
      this.creating.set(false);
    }
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  private async loadSessions(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.apiBase}/wv/brainstorm?limit=30`);
      if (!res.ok) return;
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
