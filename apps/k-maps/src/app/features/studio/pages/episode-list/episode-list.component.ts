import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioApiService } from '../../studio-api.service';
import { EpisodeSummary, formatLabel } from '../../studio.models';

@Component({
  selector: 'km-studio-episode-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="st-page">
      <div class="st-wrap">
        <div class="st-topbar">
          <a class="st-back" routerLink="/home">← Home</a>
          <div class="st-actions">
            <button type="button" class="st-btn" (click)="joinSession()">Join session</button>
            <button type="button" class="st-btn st-btn--gold" (click)="newEpisode()">
              ＋ New episode
            </button>
          </div>
        </div>

        <header class="st-head">
          <h1>Studio</h1>
          <p>Build podcast, tutorial and talking-head episodes, then run them live.</p>
        </header>

        @if (loading()) {
          <div class="st-state">Loading episodes…</div>
        } @else if (episodes().length === 0) {
          <div class="st-empty">
            <div class="st-empty-glyph">♪</div>
            <p>No episodes yet.</p>
            <button type="button" class="st-btn st-btn--gold" (click)="newEpisode()">
              Create your first episode
            </button>
          </div>
        } @else {
          <ul class="st-list">
            @for (ep of episodes(); track ep.id) {
              <li class="st-card" (click)="openEpisode(ep.id)">
                <div class="st-card-main">
                  <h3>{{ ep.title || 'Untitled Episode' }}</h3>
                  <p>{{ fmt(ep.format) }} · {{ formatDate(ep.updated_at) }}</p>
                </div>
                <span class="st-status st-status--{{ ep.status }}">{{ ep.status }}</span>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: [`
    .st-page {
      min-height: 100dvh; background: var(--km-bg, #080808);
      color: var(--km-text, rgba(255,255,255,0.92));
      font-family: var(--km-font-body, system-ui, sans-serif); overflow-y: auto;
    }
    .st-wrap { max-width: 720px; margin: 0 auto; padding: 20px 20px 60px; }
    .st-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .st-back {
      color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.85rem;
    }
    .st-back:hover { color: var(--km-gold, #c9a84c); }
    .st-actions { display: flex; gap: 8px; }

    .st-btn {
      padding: 8px 14px; border-radius: 9px; font-size: 0.84rem; cursor: pointer;
      background: rgba(255,255,255,0.06); color: var(--km-text, #fff);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .st-btn:hover { border-color: rgba(201,168,76,0.5); }
    .st-btn--gold {
      background: var(--km-gold, #c9a84c); color: #14110b; font-weight: 600;
      border-color: var(--km-gold, #c9a84c);
    }

    .st-head { margin: 26px 0 18px; }
    .st-head h1 {
      margin: 0; font-family: var(--km-font-heading, Georgia, serif);
      font-size: 1.8rem; color: var(--km-gold, #c9a84c);
    }
    .st-head p { margin: 6px 0 0; color: rgba(255,255,255,0.5); font-size: 0.9rem; }

    .st-state { padding: 50px 0; text-align: center; color: rgba(255,255,255,0.45); }
    .st-empty {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 56px 20px; text-align: center;
    }
    .st-empty-glyph { font-size: 2.6rem; color: rgba(201,168,76,0.5); }
    .st-empty p { margin: 0; color: rgba(255,255,255,0.55); }

    .st-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .st-card {
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      padding: 14px 16px; border-radius: 12px; cursor: pointer;
      background: var(--km-surface, #0d0d0d); border: 1px solid rgba(255,255,255,0.07);
    }
    .st-card:hover { border-color: rgba(201,168,76,0.4); }
    .st-card-main h3 { margin: 0; font-size: 0.98rem; font-weight: 600; }
    .st-card-main p {
      margin: 3px 0 0; font-size: 0.76rem; color: rgba(255,255,255,0.45);
      text-transform: capitalize;
    }
    .st-status {
      font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 3px 9px; border-radius: 10px; color: rgba(255,255,255,0.6);
      background: rgba(255,255,255,0.06);
    }
    .st-status--live { color: #5cc94c; background: rgba(92,201,76,0.12); }
    .st-status--done { color: var(--km-gold, #c9a84c); background: rgba(201,168,76,0.12); }
  `],
})
export class EpisodeListComponent implements OnInit {
  private studio = inject(StudioApiService);
  private router = inject(Router);

  readonly fmt = formatLabel;

  episodes = signal<EpisodeSummary[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.studio.listEpisodes().subscribe({
      next: (rows) => { this.episodes.set(rows); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  newEpisode(): void {
    this.router.navigate(['/studio/gallery']);
  }

  openEpisode(id: string): void {
    this.router.navigate(['/studio', id]);
  }

  joinSession(): void {
    const code = window.prompt('Enter the room code shared by the host:');
    const clean = (code ?? '').trim().toUpperCase();
    if (clean) this.router.navigate(['/studio/session', clean]);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }
}
