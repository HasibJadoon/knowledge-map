import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hub-home',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Hub</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="km-placeholder">
        <span class="km-placeholder__glyph">⬡</span>
        <h2>Hub</h2>
        <p>Global data management — coming soon.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .km-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      gap: 12px;
    }
    .km-placeholder__glyph {
      font-size: 3rem;
      opacity: 0.5;
    }
    h2 { font-size: 1.4rem; font-weight: 700; margin: 0; color: var(--km-text, #fff); }
    p  { font-size: 0.9rem; color: var(--km-text-3, rgba(255,255,255,0.45)); margin: 0; }
  `],
})
export class HubHomePage {}
