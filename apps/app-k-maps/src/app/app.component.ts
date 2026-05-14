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
    this.preloadArabicFonts();
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

  /**
   * Eagerly load the Arabic font set at app boot.
   *
   * Without this, the @font-face declarations sit dormant until the
   * browser tries to render an Arabic glyph — which produces a brief
   * Flash of Unstyled Text (FOUT) when the Quran reader first opens.
   * `document.fonts.load()` returns a Promise that resolves once the
   * font is actually fetched and parsed; we kick off all three (Hafs
   * mushaf, Noto Naskh body, Amiri ornament) in parallel and discard
   * the result. Failures are silent because the fonts may not exist on
   * every build target (e.g., web vs Capacitor).
   *
   * The QPC V2 per-page mushaf fonts are still loaded lazily inside the
   * Quran reader (al-quran.component.ts) because preloading all 604
   * pages on boot would be wasteful — but the *fallback* fonts in the
   * mushaf font stack (--km-font-arabic = Hafs, then AmiriQuran) ARE
   * preloaded here, so a per-page font cold start still paints with
   * the right Quran-style glyphs while the QPC font streams in.
   */
  private preloadArabicFonts(): void {
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    // Sample characters cover Arabic letters + diacritics + punctuation.
    const probe = 'ابح، ﴿﴾';
    const fonts = [
      '16px "Uthmanic Hafs"',
      '16px "Noto Naskh Arabic"',
      '16px "Amiri"',
      '16px "AmiriQuran"',
      '16px "Scheherazade New"',
    ];
    // Use `Promise.all` + per-promise catch instead of `Promise.allSettled`
    // — the app's tsconfig targets ES2015 lib and lacks the Settled API.
    Promise.all(fonts.map(spec =>
      document.fonts.load(spec, probe).catch(() => undefined)
    )).then(() => {
      // Hint downstream that the Arabic font set is ready. Reader pages
      // can read this flag to skip their own preload spinners.
      document.documentElement.setAttribute('data-arabic-fonts', 'ready');
    });

    // Also start fetching the QPC V2 font for the user's likely first
    // page (last-read page if any, else page 1). The Quran reader
    // injects per-page font declarations on demand; doing it here too
    // means by the time the user opens the قرآن tab, the font is
    // already cached and the first paint is instant.
    this.preloadFirstMushafPage();
  }

  private preloadFirstMushafPage(): void {
    try {
      const stored = localStorage.getItem('kmaps.reading.last.v1');
      let page = 1;
      if (stored) {
        const parsed = JSON.parse(stored);
        const lastQuran = parsed?.['al-quran'];
        if (lastQuran && typeof lastQuran.page === 'number' && lastQuran.page >= 1) {
          page = Math.min(604, lastQuran.page);
        }
      }
      // Inject the same @font-face declaration the reader uses, but at
      // boot time. The reader's ensureQpcFonts() will see the same id
      // and skip duplicate injection.
      const styleId = `qpc-v2-page-font-${page}`;
      if (document.getElementById(styleId)) return;
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
@font-face {
  font-family: 'QPCV2Page${page}';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/QPC%20V2%20Font.woff2/p${page}.woff2') format('woff2'),
       url('https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/woff2/p${page}.woff2?v=3.1') format('woff2');
}`;
      document.head.appendChild(style);
      // Trigger network fetch immediately rather than waiting for first
      // glyph use. Safe to ignore failures.
      if (document.fonts?.load) {
        void document.fonts.load(`16px "QPCV2Page${page}"`, 'ابح');
      }
    } catch {
      // localStorage may throw in private mode; preload is best-effort.
    }
  }
}
