import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { QuranResearchSearchService, SearchPreview, SearchTab } from '../quran-research-search.service';
import { QuranReaderHeaderService } from '../reader/quran-reader-header.service';
import { ImmersiveService } from '../immersive.service';
import { hapticTick } from '../../../../shared/utils/haptics.util';

interface ResearchTab {
  id: string;
  labelAr: string;
  href: string;
  /** Ionicon name (icon-top layout). */
  icon: string;
}

@Component({
  selector: 'app-quran-researcher-shell',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './quran-researcher-shell.component.html',
  styleUrl: './quran-researcher-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuranResearchSearchService, QuranReaderHeaderService],
})
export class QuranResearcherShellComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);
  private readonly routerEventsSub: Subscription;

  readonly search = inject(QuranResearchSearchService);
  readonly readerHeader = inject(QuranReaderHeaderService);
  readonly immersive = inject(ImmersiveService);
  readonly currentTab = signal('reader');
  readonly panelOpen = signal(false);
  // Pages that own a full-bleed header (book name + back arrow) hide the
  // shared K-MAPS title bar so we don't render two stacked headers.
  readonly hideShellHeader = signal(false);

  // `id` matches both Ionic's `tab` attribute AND the child route path,
  // so IonicRouteStrategy can correctly map the URL ↔ tab state.
  readonly tabs: ResearchTab[] = [
    { id: 'reader',  labelAr: 'قرآن',  href: '/quran/al-quran/reader',   icon: 'book-outline' },
    { id: 'tafseer', labelAr: 'تفسير', href: '/quran/al-quran/tafseer',  icon: 'reader-outline' },
    { id: 'uloom',   labelAr: 'علوم',  href: '/quran/al-quran/uloom',    icon: 'school-outline' },
    { id: 'lexicon', labelAr: 'معجم',  href: '/quran/al-quran/lexicon',  icon: 'library-outline' },
    { id: 'notes',   labelAr: 'حواشي', href: '/quran/al-quran/notes',    icon: 'bookmark-outline' },
  ];

  constructor() {
    this.syncCurrentTab(this.router.url);
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.syncCurrentTab(event.urlAfterRedirects);
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/home');
  }

  togglePanel(): void {
    this.panelOpen.set(!this.panelOpen());
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.search.setSearch('');
    this.search.clearMatches();
  }

  /** Icon for a tab pill in the cross-tab results panel. */
  tabIconFor(tab: SearchTab): string {
    switch (tab) {
      case 'tafseer': return 'reader-outline';
      case 'uloom':   return 'school-outline';
      case 'lexicon': return 'library-outline';
    }
  }

  /** Resume directly into a result without leaving the modal context.
   *  Closes the panel, then runs the hit's stored resume callback (which
   *  was registered by the source tab's broadcast effect). */
  openHit(tab: SearchTab, hit: SearchPreview): void {
    void hapticTick();
    // Switch to the tab first if we're not already there.
    if (this.currentTab() !== tab) {
      const t = this.tabs.find(x => x.id === tab);
      if (t) void this.router.navigateByUrl(t.href);
    }
    // Run the resume callback after navigation settles so the target
    // tab's component is alive.
    queueMicrotask(() => {
      try { hit.resume(); } catch { /* swallow */ }
      this.panelOpen.set(false);
    });
  }

  /** "View all N results" → just switch to the tab; the tab will already
   *  have the filter applied because the search term is shared. */
  jumpToTab(tab: SearchTab): void {
    void hapticTick();
    const t = this.tabs.find(x => x.id === tab);
    if (t) void this.router.navigateByUrl(t.href);
    this.panelOpen.set(false);
  }

  onPanelPresent(): void {
    setTimeout(() => {
      const sb: any = document.querySelector('.qrs-modal-searchbar');
      sb?.setFocus?.();
    }, 100);
  }

  setSearch(value: string | null | undefined): void {
    this.search.setSearch(value);
  }

  /** Driven by Ionic's `ionTabsDidChange` so we stay in sync with the
   *  router-resolved active tab without manual click handling. Ionic emits
   *  the payload directly (not wrapped in CustomEvent.detail) when bound
   *  via Angular template (`(ionTabsDidChange)`). */
  onTabsDidChange(event: { tab: string } | CustomEvent<{ tab: string }>): void {
    const tab = 'detail' in event ? event.detail?.tab : event?.tab;
    if (tab && tab !== this.currentTab()) {
      this.currentTab.set(tab);
      void hapticTick();
    }
  }

  /** Tab-button click handler. We can't rely on Ionic's automatic
   *  routing via `[href]` because the Quran reader's child route uses
   *  `path: ''` (so `tab="al-quran"` doesn't match a child segment) —
   *  Ionic falls back to anchor navigation, which trips the app-level
   *  catch-all `{ path: '**', redirectTo: 'home' }` and lands the user
   *  on /home instead of the requested tab. Explicit router.navigateByUrl
   *  bypasses that. */
  onTabClick(tab: ResearchTab, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.currentTab() === tab.id && this.router.url.startsWith(tab.href)) {
      // Already on this tab — pop to its root (back out of a deep page
      // like the lexicon reader to the catalog) instead of being a no-op.
      void this.navCtrl.navigateRoot(tab.href, { animated: false });
      return;
    }
    this.currentTab.set(tab.id);
    void hapticTick();
    // NavController keeps the IonicRouteStrategy in sync when switching
    // tabs; plain `router.navigateByUrl` from inside an already-mounted
    // shell can fall through to the app-level wildcard (`/home`).
    void this.navCtrl.navigateRoot(tab.href, { animated: false });
  }

  ngOnDestroy(): void {
    this.routerEventsSub.unsubscribe();
  }

  private syncCurrentTab(url: string): void {
    const path = url.split('?')[0];
    // Match longest href first so '/quran/al-quran/tafseer' beats '/quran/al-quran'
    const match = this.tabs.slice().reverse().find((tab) => path.startsWith(tab.href));
    this.currentTab.set(match?.id ?? 'reader');
    // The lexicon reader and the library list both show their own toolbar —
    // hide the shared K-MAPS header to avoid stacking two.
    this.hideShellHeader.set(/\/lexicon\/(?:read\/|books)/.test(path));
  }
}
