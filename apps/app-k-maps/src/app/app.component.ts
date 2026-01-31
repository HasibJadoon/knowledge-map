import { Component, inject } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  calendarOutline,
  chatbubblesOutline,
  documentTextOutline,
  gitCompareOutline,
  globeOutline,
  homeOutline,
  leafOutline,
  libraryOutline,
  listOutline,
  micOutline,
  pricetagsOutline,
  shuffleOutline,
  sparklesOutline,
  arrowBackOutline,
  chevronForward,
  settingsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private readonly menu = inject(MenuController);

  constructor() {
    this.applyFontSettings();
    this.applyLanguage();
    addIcons({
      homeOutline,
      bookOutline,
      leafOutline,
      libraryOutline,
      sparklesOutline,
      listOutline,
      documentTextOutline,
      arrowBackOutline,
      chatbubblesOutline,
      pricetagsOutline,
      shuffleOutline,
      globeOutline,
      gitCompareOutline,
      micOutline,
      calendarOutline,
      chevronForward,
      settingsOutline,
    });
  }

  private applyFontSettings() {
    const arabic = localStorage.getItem('arabicFont') || 'uthmanic';
    const english = localStorage.getItem('englishFont') || 'poppins';
    const arabicSize = localStorage.getItem('arabicFontSize') || '32';
    const englishSize = localStorage.getItem('englishFontSize') || '18';

    const arabicStack = arabic === 'uthmanic'
      ? 'Uthmanic Hafs, Scheherazade New, serif'
      : 'Uthmanic Hafs, Scheherazade New, serif';
    const englishStack = english === 'poppins'
      ? 'Poppins, Helvetica Neue, Arial, sans-serif'
      : 'Poppins, Helvetica Neue, Arial, sans-serif';

    document.documentElement.style.setProperty('--app-font-ar', arabicStack);
    document.documentElement.style.setProperty('--app-font-sans', englishStack);
    document.documentElement.style.setProperty('--app-font-ar-size', `${arabicSize}px`);
    document.documentElement.style.setProperty('--app-font-size', `${englishSize}px`);
  }

  private applyLanguage() {
    const saved = localStorage.getItem('appLanguage');
    const lang = saved == 'ar' ? 'ar' : 'en';
    document.documentElement.setAttribute('data-lang', lang);
  }

  async onRouteChange() {
    await this.menu.close('main-menu');
    await this.menu.close();
  }
}
