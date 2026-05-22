import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { StudioApiService } from '../../services/studio-api.service';
import { EpisodeSummary, formatLabel } from '../../studio.models';

@Component({
  selector: 'app-episode-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/workbench" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Studio</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="joinSession()" fill="clear" aria-label="Join a session">
            <ion-icon slot="icon-only" name="enter-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="newEpisode()" fill="clear" aria-label="New episode">
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" routerLink="/home" routerDirection="root" aria-label="Home">
            <ion-icon slot="icon-only" name="home-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="km-st-center"><ion-spinner name="dots"></ion-spinner></div>
      } @else if (episodes().length === 0) {
        <div class="km-st-empty">
          <ion-icon name="mic-outline"></ion-icon>
          <p>No episodes yet.</p>
          <p class="km-st-sub">Build a podcast, tutorial or talking-head episode from a template.</p>
          <ion-button size="small" (click)="newEpisode()">New episode</ion-button>
        </div>
      } @else {
        <ion-list lines="none">
          @for (ep of episodes(); track ep.id) {
            <ion-item button detail="true" class="km-st-item" (click)="openEpisode(ep.id)">
              <ion-icon slot="start" name="albums-outline" class="km-st-item-icon"></ion-icon>
              <ion-label>
                <h3>{{ ep.title || 'Untitled Episode' }}</h3>
                <p>{{ fmt(ep.format) }} · {{ ep.status }} · {{ formatDate(ep.updated_at) }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    :host { display: block; }
    ion-content {
      --background: radial-gradient(150% 80% at 50% 0%, #18160f 0%, #0b0a08 56%);
    }
    .km-st-center { display: flex; justify-content: center; padding: 60px 0; }
    .km-st-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 60px 28px; text-align: center; color: var(--ion-color-medium);
    }
    .km-st-empty ion-icon { font-size: 3rem; opacity: 0.4; }
    .km-st-empty p { margin: 0; font-size: 0.92rem; }
    .km-st-empty .km-st-sub { font-size: 0.8rem; opacity: 0.8; }
    .km-st-empty ion-button { margin-top: 12px; }
    .km-st-item {
      --min-height: 62px; --border-radius: 13px;
      --background: linear-gradient(180deg, #221f17 0%, #141310 100%);
      margin: 9px 10px; border-radius: 13px;
      border: 1px solid rgba(255,255,255,0.05);
      box-shadow: 0 9px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .km-st-item-icon { color: #c9a84c; font-size: 1.2rem; }
    .km-st-item h3 { font-weight: 600; }
    .km-st-item p { font-size: 0.74rem; color: var(--ion-color-medium); text-transform: capitalize; }
  `],
})
export class EpisodeListPage implements OnInit {
  private studio = inject(StudioApiService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);

  readonly fmt = formatLabel;

  episodes = signal<EpisodeSummary[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadEpisodes();
  }

  /** Refresh on return from the builder/gallery so renamed/new episodes show. */
  ionViewWillEnter(): void {
    if (!this.loading()) this.loadEpisodes();
  }

  private loadEpisodes(): void {
    this.studio.listEpisodes().subscribe({
      next: (rows) => { this.episodes.set(rows); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  newEpisode(): void {
    this.router.navigate(['/studio/gallery']);
  }

  openEpisode(id: string): void {
    this.router.navigate(['/studio', id]);
  }

  async joinSession(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Join a live session',
      message: 'Enter the room code shared by the host.',
      inputs: [{ name: 'code', type: 'text', placeholder: 'Room code' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Join',
          handler: (data) => {
            const code = String(data?.code ?? '').trim().toUpperCase();
            if (code) this.router.navigate(['/studio/session', code]);
          },
        },
      ],
    });
    await alert.present();
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
