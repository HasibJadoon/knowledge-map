import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface ContentSection {
  label: string;
  glyph: string;
  desc: string;
  tag: string;
  route: string[];
}

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/workbench"></ion-back-button>
        </ion-buttons>
        <ion-title>Content</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" routerLink="/home" routerDirection="root" aria-label="Home">
            <ion-icon slot="icon-only" name="home-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="km-content-page">
      <div class="km-content-header">
        <p class="km-content-sub">Manage your episodes, categories and sacred text references.</p>
      </div>

      <div class="km-content-grid">
        <button
          *ngFor="let s of sections"
          class="km-content-card"
          [routerLink]="s.route"
        >
          <span class="km-content-card__tag">{{ s.tag }}</span>
          <span class="km-content-card__glyph">{{ s.glyph }}</span>
          <span class="km-content-card__label">{{ s.label }}</span>
          <span class="km-content-card__desc">{{ s.desc }}</span>
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    .km-content-page {
      --background: var(--km-bg, #0d0d0d);
    }

    .km-content-header {
      padding: 20px 20px 8px;
    }

    .km-content-sub {
      font-size: 0.85rem;
      color: var(--km-text-3, rgba(255,255,255,0.4));
      margin: 0;
      line-height: 1.5;
    }

    .km-content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 12px 16px 32px;
    }

    .km-content-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding: 16px 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      text-align: left;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;

      &:active { background: rgba(255,255,255,0.08); }
    }

    .km-content-card__tag {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: rgba(201,168,76,0.7);
      text-transform: uppercase;
    }

    .km-content-card__glyph {
      font-size: 1.6rem;
      line-height: 1;
    }

    .km-content-card__label {
      font-size: 0.9rem;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      line-height: 1.2;
    }

    .km-content-card__desc {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.4);
      line-height: 1.4;
    }
  `],
})
export class ContentPage {
  readonly sections: ContentSection[] = [
    {
      label: 'Current Episode',
      glyph: '▶',
      desc: 'Active episode in production — status, outline, and recording notes.',
      tag: 'ACTIVE',
      route: ['/content', 'episode', 'current'],
    },
    {
      label: 'Episodes',
      glyph: '◉',
      desc: 'Full episode archive with show notes, timestamps and guest records.',
      tag: 'ARCHIVE',
      route: ['/content', 'episodes'],
    },
    {
      label: 'Categories',
      glyph: '▦',
      desc: 'Topic taxonomy, series groupings and content classification.',
      tag: 'TAXONOMY',
      route: ['/content', 'categories'],
    },
    {
      label: 'Sacred Texts',
      glyph: '☽',
      desc: 'Referenced sacred texts and scripture used across episodes.',
      tag: 'REFERENCES',
      route: ['/content', 'sacred-texts'],
    },
  ];
}
