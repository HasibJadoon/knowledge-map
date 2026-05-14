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
    this.registerMushafServiceWorker();
    this.warmCommonMushafPages();
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

  /**
   * Register the mushaf service worker so QPC font files (and mushaf page
   * payloads) are cached permanently on-device. After first visit to any
   * page, its assets are available offline and load instantly. The Quran
   * is immutable so the cache never goes stale.
   */
  private registerMushafServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // Defer registration until the page is idle so we don't compete with
    // the initial paint. The Quran reader has a hard-timeout fallback
    // (~5s) for pages whose font isn't ready, so a few seconds of SW
    // startup latency is harmless.
    const reg = () => {
      navigator.serviceWorker.register('/mushaf-sw.js', { scope: '/' })
        .catch(err => console.warn('[mushaf-sw] registration failed', err));
    };
    if (document.readyState === 'complete') {
      this.runWhenIdle(reg);
    } else {
      window.addEventListener('load', () => this.runWhenIdle(reg), { once: true });
    }
  }

  /**
   * Layer 4: bulk-warm a small set of pages that users hit frequently:
   * page 1-3 (Fatiha + start of Baqarah), the last 3 pages (final juz —
   * common in memorization), and last-read ±3 (the most likely next read).
   *
   * Total payload is ~25 × 80 KB ≈ 2 MB on first ever boot. After that,
   * the service worker has them all cached and this is a no-op.
   */
  private warmCommonMushafPages(): void {
    if (typeof navigator === 'undefined') return;
    this.runWhenIdle(async () => {
      // Wait for the SW to be controlling the page before posting.
      const ready = await navigator.serviceWorker?.ready.catch(() => null);
      if (!ready?.active) return;
      const pages = new Set<number>();
      // Fatiha + start of Baqarah
      [1, 2, 3].forEach(p => pages.add(p));
      // Final juz — common in memorization (juz 30 ≈ pages 582-604)
      for (let p = 582; p <= 604; p++) pages.add(p);
      // Last-read ±3, if any
      try {
        const stored = localStorage.getItem('kmaps.reading.last.v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          const lastQuran = parsed?.['al-quran'];
          if (lastQuran && typeof lastQuran.page === 'number') {
            for (let d = -3; d <= 3; d++) {
              const p = lastQuran.page + d;
              if (p >= 1 && p <= 604) pages.add(p);
            }
          }
        }
      } catch { /* localStorage may throw in private mode */ }

      ready.active.postMessage({ type: 'prefetch-pages', pages: [...pages] });
    });
  }

  /** Schedule callback for browser idle time, falling back to setTimeout. */
  private runWhenIdle(fn: () => void): void {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback;
    if (typeof ric === 'function') ric(fn);
    else setTimeout(fn, 1500);
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
      // `font-display: block` — QPC pages use Private Use Area codepoints
      // that have no fallback glyph. With `swap`, the browser tries Hafs/
      // Amiri while QPC loads, finds no glyph, and renders the .notdef
      // box → the user sees a blank page with only verse markers. `block`
      // delays paint for up to 3s waiting for the real font.
      style.textContent = `
@font-face {
  font-family: 'QPCV2Page${page}';
  font-style: normal;
  font-weight: 400;
  font-display: block;
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
