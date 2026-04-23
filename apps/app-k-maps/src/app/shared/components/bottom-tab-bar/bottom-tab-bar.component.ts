import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline, homeOutline, languageOutline,
  globeOutline, calendarOutline,
} from 'ionicons/icons';

interface Tab {
  path: string;
  icon: string;
  label: string;
  match: string; // prefix to detect active
}

const TABS: Tab[] = [
  { path: '/',              icon: 'home-outline',     label: 'Home',      match: '/' },
  { path: '/quran',         icon: 'book-outline',     label: 'Quran',     match: '/quran' },
  { path: '/arabic',        icon: 'language-outline', label: 'Arabic',    match: '/arabic' },
  { path: '/worldview',     icon: 'globe-outline',    label: 'Worldview', match: '/worldview' },
  { path: '/planner',       icon: 'calendar-outline', label: 'Planner',   match: '/planner' },
];

@Component({
  selector: 'app-bottom-tab-bar',
  standalone: true,
  imports: [IonTabBar, IonTabButton, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-tab-bar class="km-tab-bar">
      @for (tab of tabs; track tab.path) {
        <ion-tab-button
          [class.tab-selected]="isActive(tab)"
          (click)="go(tab.path)"
        >
          <ion-icon [name]="tab.icon" />
          <ion-label>{{ tab.label }}</ion-label>
        </ion-tab-button>
      }
    </ion-tab-bar>
  `,
  styles: [`
    :host { display: block; }

    ion-tab-bar.km-tab-bar {
      --background: rgba(10,10,10,0.92);
      --border: 1px solid rgba(255,255,255,0.07);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      height: calc(56px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
    }

    ion-tab-button {
      --color: rgba(255,255,255,0.35);
      --color-selected: #c9a84c;
      --background: transparent;
      font-size: 10px;
      letter-spacing: 0.03em;
    }

    ion-tab-button.tab-selected {
      --color: #c9a84c;

      ion-icon {
        filter: drop-shadow(0 0 6px rgba(201,168,76,0.5));
      }
    }

    ion-icon {
      font-size: 22px;
      margin-bottom: 2px;
    }

    ion-label {
      font-size: 10px;
      font-weight: 500;
    }
  `],
})
export class BottomTabBarComponent {
  private readonly router = inject(Router);
  readonly tabs = TABS;

  constructor() {
    addIcons({ bookOutline, homeOutline, languageOutline, globeOutline, calendarOutline });
  }

  isActive(tab: Tab): boolean {
    const url = this.router.url;
    if (tab.match === '/') return url === '/';
    return url.startsWith(tab.match);
  }

  go(path: string): void {
    this.router.navigateByUrl(path);
  }
}
