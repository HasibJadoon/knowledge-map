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
  settingsOutline,
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
      settingsOutline,
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
    const lang = saved === 'ar' ? 'ar' : 'en';
    document.documentElement.setAttribute('data-lang', lang);
  }
}
