import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { StudioApiService } from '../../services/studio-api.service';
import { Participant, SessionRecap, TalkingPoint, formatLabel } from '../../studio.models';

@Component({
  selector: 'app-recap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/studio" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Recap</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="km-rc-center"><ion-spinner name="dots"></ion-spinner></div>
      } @else if (error() || !recap()) {
        <div class="km-rc-center">
          <ion-icon name="alert-circle-outline" class="km-rc-bigicon"></ion-icon>
          <p>That recap could not be loaded.</p>
        </div>
      } @else if (recap(); as rc) {
        <div class="km-rc-head">
          <h1>{{ rc.episode?.title || 'Episode' }}</h1>
          @if (rc.episode) {
            <ion-badge class="km-rc-badge">{{ fmt(rc.episode.format) }}</ion-badge>
          }
          <div class="km-rc-meta">
            <span>Room {{ rc.room_code }}</span>
            @if (durationLabel()) { <span>· {{ durationLabel() }}</span> }
            @if (dateLabel()) { <span>· {{ dateLabel() }}</span> }
          </div>
          <div class="km-rc-status" [class.km-rc-status--ended]="rc.status === 'ended'">
            {{ rc.status === 'ended' ? 'Session ended' : 'Session still live' }}
          </div>
        </div>

        @for (section of rc.episode?.sections ?? []; track section.id) {
          <div class="km-rc-section">
            <div class="km-rc-section-head">{{ section.heading }}</div>
            @for (point of section.points; track point.id) {
              <div class="km-rc-point">
                <p>{{ point.text || '—' }}</p>
                @if (speaker(point); as person) {
                  <span class="km-rc-speaker" [style.color]="person.color">
                    {{ person.display_name }}
                  </span>
                }
              </div>
            }
            @if (section.points.length === 0) {
              <div class="km-rc-point km-rc-point--empty">No talking points</div>
            }
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    :host { display: block; }
    ion-content {
      --background: radial-gradient(150% 80% at 50% 0%, #18160f 0%, #0b0a08 56%);
    }
    .km-rc-center {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 60px 24px; color: var(--ion-color-medium); text-align: center;
    }
    .km-rc-bigicon { font-size: 3rem; opacity: 0.45; }

    .km-rc-head { padding: 18px 16px 8px; }
    .km-rc-head h1 { margin: 0; font-size: 1.3rem; font-weight: 600; }
    .km-rc-badge {
      --background: rgba(201,168,76,0.18); --color: #c9a84c;
      text-transform: capitalize; margin-top: 6px;
    }
    .km-rc-meta {
      display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px;
      font-size: 0.78rem; color: var(--ion-color-medium);
    }
    .km-rc-status {
      margin-top: 6px; font-size: 0.68rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: var(--ion-color-medium);
    }
    .km-rc-status--ended { color: #5cc94c; }

    .km-rc-section { padding: 6px 16px 10px; }
    .km-rc-section-head {
      margin: 12px 0 6px; font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase; color: #c9a84c;
    }
    .km-rc-point {
      padding: 10px 13px; margin-bottom: 7px; border-radius: 10px;
      background: linear-gradient(180deg, #201e16 0%, #131210 100%);
      border: 1px solid rgba(255,255,255,0.05);
      border-left: 2px solid rgba(201,168,76,0.5);
      box-shadow: 0 7px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .km-rc-point p { margin: 0; font-size: 0.9rem; line-height: 1.45; }
    .km-rc-point--empty { color: var(--ion-color-medium); font-style: italic; font-size: 0.82rem; }
    .km-rc-speaker {
      display: inline-block; margin-top: 4px; font-size: 0.74rem; font-weight: 600;
    }
  `],
})
export class RecapPage implements OnInit {
  private studio = inject(StudioApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

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
      next: (rc) => { this.recap.set(rc); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.error.set(true); this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  speaker(point: TalkingPoint): Participant | null {
    const ep = this.recap()?.episode;
    if (!ep || !point.speaker_ref) return null;
    return ep.participants.find((p) => p.id === point.speaker_ref) ?? null;
  }
}
