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
  template: `
    <div class="wvb" #page>

      <!-- Top Bar -->
      <header class="wvb__topbar">
        <a class="wvb__back" [routerLink]="['/worldview']">
          <span>←</span>
          <span>Worldview</span>
        </a>
        <h1 class="wvb__title">Brainstorm</h1>
        <div class="wvb__topbar-spacer"></div>
        <button class="wvb__btn wvb__btn--primary" (click)="openCreateForm()">
          <span>+</span>
          <span>New Session</span>
        </button>
      </header>

      <div class="wvb__body">

        <!-- Left: Session List -->
        <aside class="wvb__sidebar">
          @if (loading()) {
            <div class="wvb__state">
              <span class="wvb__spinner"></span>
              <span>Loading sessions…</span>
            </div>
          } @else if (sessions().length === 0) {
            <div class="wvb__state wvb__state--empty">
              <span class="wvb__empty-glyph">⚡</span>
              <p>No sessions yet</p>
              <button class="wvb__btn wvb__btn--ghost wvb__btn--sm" (click)="openCreateForm()">+ Create one</button>
            </div>
          } @else {
            <ul class="wvb__session-list">
              @for (session of sessions(); track session.id) {
                <li
                  class="wvb__session-item"
                  [class.wvb__session-item--active]="selectedSession()?.id === session.id"
                  (click)="selectSession(session)"
                  (keydown.enter)="selectSession(session)"
                  tabindex="0"
                  role="button"
                >
                  <div class="wvb__session-title">{{ session.title || 'Untitled Session' }}</div>
                  <div class="wvb__session-tags">
                    @if (session.topic) {
                      <span class="wvb__tag wvb__tag--topic">{{ session.topic }}</span>
                    }
                    @if (session.worldview) {
                      <span class="wvb__tag wvb__tag--worldview">{{ session.worldview }}</span>
                    }
                  </div>
                  @if (session.created_at) {
                    <div class="wvb__session-date">{{ formatDate(session.created_at) }}</div>
                  }
                </li>
              }
            </ul>
          }
        </aside>

        <!-- Right: Session Detail / Create Form -->
        <main class="wvb__detail">

          @if (showCreateForm()) {
            <div class="wvb__create-form" #createFormEl>
              <h2 class="wvb__form-title">New Research Session</h2>
              <div class="wvb__form-group">
                <label class="wvb__form-label" for="bs-title">Session Title</label>
                <input
                  id="bs-title"
                  class="wvb__form-input"
                  type="text"
                  placeholder="e.g. Tawhid across traditions"
                  #titleInput
                />
              </div>
              <div class="wvb__form-row">
                <div class="wvb__form-group">
                  <label class="wvb__form-label" for="bs-topic">Topic</label>
                  <input
                    id="bs-topic"
                    class="wvb__form-input"
                    type="text"
                    placeholder="Topic tag"
                    #topicInput
                  />
                </div>
                <div class="wvb__form-group">
                  <label class="wvb__form-label" for="bs-worldview">Worldview</label>
                  <input
                    id="bs-worldview"
                    class="wvb__form-input"
                    type="text"
                    placeholder="Worldview tag"
                    #worldviewInput
                  />
                </div>
              </div>
              <div class="wvb__form-group">
                <label class="wvb__form-label" for="bs-content">Initial Notes</label>
                <textarea
                  id="bs-content"
                  class="wvb__form-textarea"
                  placeholder="Start capturing your ideas…"
                  rows="8"
                  #contentInput
                ></textarea>
              </div>
              <div class="wvb__form-actions">
                <button class="wvb__btn wvb__btn--ghost" (click)="cancelCreate()">Cancel</button>
                <button
                  class="wvb__btn wvb__btn--primary"
                  (click)="createSession(titleInput.value, topicInput.value, worldviewInput.value, contentInput.value)"
                  [disabled]="creating()"
                >
                  @if (creating()) {
                    <span class="wvb__spinner wvb__spinner--sm"></span>
                  }
                  <span>{{ creating() ? 'Saving…' : 'Create Session' }}</span>
                </button>
              </div>
            </div>
          } @else if (selectedSession()) {
            <div class="wvb__session-detail" #sessionDetail>
              <div class="wvb__sd-header">
                <h2 class="wvb__sd-title">{{ selectedSession()!.title || 'Untitled Session' }}</h2>
                <div class="wvb__sd-meta">
                  @if (selectedSession()!.topic) {
                    <span class="wvb__tag wvb__tag--topic">{{ selectedSession()!.topic }}</span>
                  }
                  @if (selectedSession()!.worldview) {
                    <span class="wvb__tag wvb__tag--worldview">{{ selectedSession()!.worldview }}</span>
                  }
                  @if (selectedSession()!.created_at) {
                    <span class="wvb__sd-date">{{ formatDate(selectedSession()!.created_at!) }}</span>
                  }
                </div>
              </div>

              <div class="wvb__sd-rule"></div>

              @if (selectedSession()!.content) {
                <div class="wvb__sd-content">{{ selectedSession()!.content }}</div>
              } @else {
                <div class="wvb__sd-no-content">
                  <span>No content recorded for this session.</span>
                </div>
              }
            </div>
          } @else {
            <div class="wvb__detail-empty">
              <div class="wvb__detail-glyph">⚡</div>
              <h2 class="wvb__detail-empty-title">Research Journal</h2>
              <p class="wvb__detail-empty-desc">Select a session from the list or create a new one to start capturing your ideas.</p>
              <button class="wvb__btn wvb__btn--primary" (click)="openCreateForm()">+ New Session</button>
            </div>
          }

        </main>
      </div>
    </div>
  `,
  styles: [`
    .wvb {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100dvh;
      background: var(--km-bg);
      color: var(--km-text);
      font-family: var(--km-font-body);
      overflow: hidden;

      &__topbar {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 0 1.5rem;
        height: 56px;
        min-height: 56px;
        border-bottom: 1px solid var(--km-border);
        background: rgba(255,255,255,0.02);
        flex-shrink: 0;
      }

      &__back {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.85rem 0.4rem 0.6rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--km-border);
        border-radius: 7px;
        color: var(--km-text-2);
        font-size: 0.73rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        text-decoration: none;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
        flex-shrink: 0;

        &:hover {
          border-color: var(--km-border-gold);
          color: var(--km-gold);
          background: rgba(201,168,76,0.06);
        }
      }

      &__title {
        font-family: var(--km-font-heading);
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: var(--km-gold);
        margin: 0;
      }

      &__topbar-spacer { flex: 1; }

      &__btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.45rem 1rem;
        border-radius: 7px;
        font-family: var(--km-font-body);
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        cursor: pointer;
        border: 1px solid;
        transition: all 0.2s;

        &:disabled { opacity: 0.55; cursor: not-allowed; }

        &--primary {
          background: rgba(201,168,76,0.15);
          border-color: var(--km-border-gold);
          color: var(--km-gold-bright);

          &:hover:not(:disabled) {
            background: rgba(201,168,76,0.22);
            box-shadow: 0 0 16px rgba(201,168,76,0.15);
          }
        }

        &--ghost {
          background: rgba(255,255,255,0.03);
          border-color: var(--km-border);
          color: var(--km-text-2);

          &:hover {
            border-color: var(--km-border-gold);
            color: var(--km-gold);
            background: rgba(201,168,76,0.05);
          }
        }

        &--sm {
          padding: 0.35rem 0.75rem;
          font-size: 0.73rem;
        }
      }

      &__body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      /* Sidebar */
      &__sidebar {
        width: 280px;
        min-width: 280px;
        border-right: 1px solid var(--km-border);
        overflow-y: auto;
        background: rgba(255,255,255,0.012);

        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      }

      &__state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 2.5rem 1.2rem;
        font-size: 0.8rem;
        color: var(--km-text-3);
        text-align: center;

        &--empty { gap: 0.75rem; }
      }

      &__empty-glyph {
        font-size: 2rem;
        opacity: 0.3;
        line-height: 1;
      }

      &__session-list {
        list-style: none;
        margin: 0;
        padding: 0.5rem 0;
      }

      &__session-item {
        padding: 0.9rem 1.2rem;
        cursor: pointer;
        border-left: 2px solid transparent;
        transition: background 0.18s, border-color 0.18s;
        outline: none;

        &:hover { background: rgba(201,168,76,0.04); }

        &--active {
          background: rgba(201,168,76,0.08);
          border-left-color: var(--km-gold);

          .wvb__session-title { color: var(--km-gold-bright); }
        }
      }

      &__session-title {
        font-size: 0.83rem;
        font-weight: 500;
        color: var(--km-text);
        line-height: 1.4;
        margin-bottom: 0.4rem;
        transition: color 0.2s;
      }

      &__session-tags {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        margin-bottom: 0.35rem;
      }

      &__tag {
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        border: 1px solid;

        &--topic {
          color: rgba(201,168,76,0.85);
          border-color: rgba(201,168,76,0.2);
          background: rgba(201,168,76,0.07);
        }

        &--worldview {
          color: rgba(180,160,220,0.85);
          border-color: rgba(180,160,220,0.2);
          background: rgba(180,160,220,0.07);
        }
      }

      &__session-date {
        font-size: 0.65rem;
        color: var(--km-text-3);
      }

      /* Detail Panel */
      &__detail {
        flex: 1;
        overflow-y: auto;

        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      }

      &__detail-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 1rem;
        color: var(--km-text-3);
        text-align: center;
        padding: 2rem;
      }

      &__detail-glyph {
        font-size: 4rem;
        line-height: 1;
        opacity: 0.3;
        margin-bottom: 0.5rem;
      }

      &__detail-empty-title {
        font-family: var(--km-font-heading);
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--km-text-2);
        margin: 0;
      }

      &__detail-empty-desc {
        font-size: 0.83rem;
        color: var(--km-text-3);
        max-width: 320px;
        line-height: 1.6;
        margin: 0;
      }

      /* Session Detail */
      &__session-detail {
        padding: 2.5rem 2.5rem 3rem;
        max-width: 760px;
      }

      &__sd-header {
        margin-bottom: 1.5rem;
      }

      &__sd-title {
        font-family: var(--km-font-heading);
        font-size: clamp(1.4rem, 3vw, 2rem);
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--km-text);
        margin: 0 0 0.75rem;
        line-height: 1.2;
      }

      &__sd-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      &__sd-date {
        font-size: 0.72rem;
        color: var(--km-text-3);
      }

      &__sd-rule {
        height: 1px;
        background: var(--km-border);
        margin-bottom: 1.5rem;
      }

      &__sd-content {
        font-size: 0.88rem;
        color: var(--km-text-2);
        line-height: 1.85;
        white-space: pre-wrap;
      }

      &__sd-no-content {
        font-size: 0.83rem;
        color: var(--km-text-3);
        font-style: italic;
      }

      /* Create Form */
      &__create-form {
        padding: 2.5rem 2.5rem 3rem;
        max-width: 680px;
      }

      &__form-title {
        font-family: var(--km-font-heading);
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--km-text);
        margin: 0 0 2rem;
      }

      &__form-group {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-bottom: 1.25rem;
        flex: 1;
      }

      &__form-row {
        display: flex;
        gap: 1rem;
        margin-bottom: 0;
      }

      &__form-label {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--km-text-3);
      }

      &__form-input, &__form-textarea {
        padding: 0.6rem 0.9rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--km-border);
        border-radius: 8px;
        color: var(--km-text);
        font-family: var(--km-font-body);
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        width: 100%;

        &::placeholder { color: var(--km-text-3); }

        &:focus {
          border-color: var(--km-border-gold);
          box-shadow: 0 0 0 2px rgba(201,168,76,0.1);
        }
      }

      &__form-textarea {
        resize: vertical;
        min-height: 160px;
        line-height: 1.65;
      }

      &__form-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1.5rem;
        justify-content: flex-end;
      }

      /* Spinner */
      &__spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(201,168,76,0.15);
        border-top-color: var(--km-gold);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;

        &--sm {
          width: 12px;
          height: 12px;
          border-width: 1.5px;
        }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
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
