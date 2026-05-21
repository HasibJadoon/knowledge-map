import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface PlaceholderData {
  label: string;
  tag: string;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-content-placeholder',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/content"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ data.label }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="km-placeholder-page">
      <div class="km-placeholder">
        <div class="km-placeholder__icon-wrap">
          <ion-icon [name]="data.icon" aria-hidden="true"></ion-icon>
        </div>
        <span class="km-placeholder__tag">{{ data.tag }}</span>
        <h1 class="km-placeholder__title">{{ data.label }}</h1>
        <p class="km-placeholder__desc">{{ data.desc }}</p>
        <span class="km-placeholder__badge">Coming soon</span>
      </div>
    </ion-content>
  `,
  styles: [`
    .km-placeholder-page {
      --background: var(--km-bg, #0d0d0d);
    }

    .km-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 10px;
      min-height: 100%;
      padding: 32px 28px;
      box-sizing: border-box;
    }

    .km-placeholder__icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      margin-bottom: 6px;
      border-radius: 20px;
      background: rgba(201,168,76,0.08);
      border: 1px solid rgba(201,168,76,0.18);
    }

    .km-placeholder__icon-wrap ion-icon {
      font-size: 2.1rem;
      color: #c9a84c;
    }

    .km-placeholder__tag {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(201,168,76,0.7);
    }

    .km-placeholder__title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
    }

    .km-placeholder__desc {
      margin: 0;
      max-width: 320px;
      font-size: 0.85rem;
      line-height: 1.5;
      color: rgba(255,255,255,0.4);
    }

    .km-placeholder__badge {
      margin-top: 14px;
      padding: 7px 14px;
      font-size: 0.66rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
    }
  `],
})
export class ContentPlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  readonly data = this.route.snapshot.data as PlaceholderData;
}
