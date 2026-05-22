import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudioApiService } from '../../studio-api.service';
import { Participant, SessionRecap, TalkingPoint, formatLabel } from '../../studio.models';

@Component({
  selector: 'km-studio-recap',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="st-page">
      <div class="st-wrap">
        <div class="st-topbar">
          <a class="st-back" routerLink="/studio">← Studio</a>
        </div>

        @if (loading()) {
          <div class="st-state">Loading recap…</div>
        } @else if (error() || !recap()) {
          <div class="st-state">
            <div class="st-state-icon">⚠</div>
            <p>That recap could not be loaded.</p>
          </div>
        } @else if (recap(); as rc) {
          <header class="st-head">
            <h1>{{ rc.episode?.title || 'Episode' }}</h1>
            <div class="st-meta">
              @if (rc.episode) { <span class="st-badge">{{ fmt(rc.episode.format) }}</span> }
              <span>Room {{ rc.room_code }}</span>
              @if (durationLabel()) { <span>· {{ durationLabel() }}</span> }
              @if (dateLabel()) { <span>· {{ dateLabel() }}</span> }
            </div>
            <div class="st-recap-status" [class.st-recap-status--ended]="rc.status === 'ended'">
              {{ rc.status === 'ended' ? 'Session ended' : 'Session still live' }}
            </div>
          </header>

          @for (section of rc.episode?.sections ?? []; track section.id) {
            <div class="st-recap-section">
              <div class="st-recap-section-head">{{ section.heading }}</div>
              @for (point of section.points; track point.id) {
                <div class="st-recap-point">
                  <p>{{ point.text || '—' }}</p>
                  @if (speaker(point); as person) {
                    <span class="st-recap-speaker" [style.color]="person.color">
                      {{ person.display_name }}
                    </span>
                  }
                </div>
              }
              @if (section.points.length === 0) {
                <div class="st-recap-point st-recap-point--empty">No talking points</div>
              }
            </div>
          }
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
    .st-topbar { display: flex; align-items: center; }
    .st-back { color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.85rem; }
    .st-back:hover { color: var(--km-gold, #c9a84c); }

    .st-state {
      padding: 50px 0; text-align: center; color: rgba(255,255,255,0.45);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .st-state-icon { font-size: 2.2rem; opacity: 0.55; }

    .st-head { margin: 22px 0 14px; }
    .st-head h1 {
      margin: 0; font-family: var(--km-font-heading, Georgia, serif);
      font-size: 1.6rem; color: var(--km-text, #fff);
    }
    .st-meta {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      margin-top: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.5);
    }
    .st-badge {
      font-size: 0.66rem; padding: 3px 8px; border-radius: 9px; text-transform: capitalize;
      background: rgba(201,168,76,0.16); color: var(--km-gold, #c9a84c);
    }
    .st-recap-status {
      margin-top: 6px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: rgba(255,255,255,0.45);
    }
    .st-recap-status--ended { color: #5cc94c; }

    .st-recap-section { margin: 14px 0; }
    .st-recap-section-head {
      margin: 0 0 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .st-recap-point {
      padding: 9px 12px; margin-bottom: 6px; border-radius: 9px;
      background: var(--km-surface, #0d0d0d); border-left: 2px solid rgba(201,168,76,0.4);
    }
    .st-recap-point p { margin: 0; font-size: 0.9rem; line-height: 1.45; }
    .st-recap-point--empty {
      color: rgba(255,255,255,0.4); font-style: italic; font-size: 0.82rem;
    }
    .st-recap-speaker {
      display: inline-block; margin-top: 4px; font-size: 0.74rem; font-weight: 600;
    }
  `],
})
export class RecapComponent implements OnInit {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);

  readonly fmt = formatLabel;

  recap = signal<SessionRecap | null>(null);
  loading = signal(true);
  error = signal(false);

  durationLabel = computed(() => {
    const rc = this.recap();
    if (!rc?.started_at || !rc?.ended_at) return '';
    const ms = new Date(rc.ended_at).getTime() - new Date(rc.started_at).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return '';
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  });

  dateLabel = computed(() => {
    const iso = this.recap()?.started_at ?? this.recap()?.ended_at;
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.studio.getRecap(id).subscribe({
      next: (rc) => { this.recap.set(rc); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  speaker(point: TalkingPoint): Participant | null {
    const ep = this.recap()?.episode;
    if (!ep || !point.speaker_ref) return null;
    return ep.participants.find((p) => p.id === point.speaker_ref) ?? null;
  }
}
