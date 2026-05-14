import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  alertCircleOutline,
  addOutline,
  attachOutline,
  bookOutline,
  bookmarksOutline,
  calendarOutline,
  checkmarkDoneOutline,
  chatbubblesOutline,
  closeCircleOutline,
  compassOutline,
  createOutline,
  documentTextOutline,
  flagOutline,
  gitCompareOutline,
  globeOutline,
  homeOutline,
  languageOutline,
  leafOutline,
  libraryOutline,
  listOutline,
  lockClosedOutline,
  micOutline,
  personCircleOutline,
  personOutline,
  pricetagsOutline,
  searchOutline,
  shuffleOutline,
  sparklesOutline,
  swapHorizontalOutline,
  textOutline,
  arrowBackOutline,
  chevronForward,
  gridOutline,
  telescopeOutline,
  flashOutline,
  statsChartOutline,
  layersOutline,
  starOutline,
  repeatOutline,
  readerOutline,
  albumsOutline,
  chevronForwardOutline,
  chevronBackOutline,
  ellipsisHorizontalOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeOutline,
  chevronDown,
  folder,
  folderOpen,
  informationCircleOutline,
  linkOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: false,
})
export class AppComponent {
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
      createOutline,
      flagOutline,
      checkmarkDoneOutline,
      pricetagsOutline,
      shuffleOutline,
      globeOutline,
      gitCompareOutline,
      micOutline,
      calendarOutline,
      addOutline,
      chevronForward,
      personOutline,
      lockClosedOutline,
      personCircleOutline,
      textOutline,
      languageOutline,
      alertCircleOutline,
      searchOutline,
      attachOutline,
      closeCircleOutline,
      swapHorizontalOutline,
      bookmarksOutline,
      compassOutline,
      gridOutline,
      telescopeOutline,
      flashOutline,
      statsChartOutline,
      layersOutline,
      starOutline,
      repeatOutline,
      readerOutline,
      albumsOutline,
      chevronForwardOutline,
      chevronBackOutline,
      ellipsisHorizontalOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeOutline,
      addCircleOutline,
      chevronDown,
      folder,
      folderOpen,
      informationCircleOutline,
      linkOutline,
    });
  }

  private applyFontSettings() {
    // `arabic` is a user preference: 'uthmanic' (Hafs, mushaf-style) or
    // 'naskh' (general-purpose, default). Hafs has NO glyphs for Arabic
    // punctuation (comma, semicolon, question mark) so making it the
    // app-wide default breaks every classical lexicon entry — see the
    // bug logged in lexicon-reader-page.component.scss header comment.
    //
    // Default = naskh. The mushaf reader still binds Hafs via
    // `--km-font-arabic` / `--mushaf-font` regardless of this preference.
    const arabic = localStorage.getItem('arabicFont') || 'naskh';
    const english = localStorage.getItem('englishFont') || 'poppins';
    const arabicSize = localStorage.getItem('arabicFontSize') || '32';
    const englishSize = localStorage.getItem('englishFontSize') || '18';

    const arabicStack = arabic === 'uthmanic'
      ? '"Uthmanic Hafs", "Noto Naskh Arabic", "Scheherazade New", serif'
      : '"Noto Naskh Arabic", "Scheherazade New", "Amiri", serif';
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
    const lang = saved === 'ar' ? 'ar' : 'en';
    document.documentElement.setAttribute('data-lang', lang);
  }
}
