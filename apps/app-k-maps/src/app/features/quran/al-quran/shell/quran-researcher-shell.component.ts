import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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
  private readonly routerEventsSub: Subscription;

  readonly search = inject(QuranResearchSearchService);
  readonly readerHeader = inject(QuranReaderHeaderService);
  readonly immersive = inject(ImmersiveService);
  readonly currentTab = signal('al-quran');
  readonly panelOpen = signal(false);
  // Pages that own a full-bleed header (book name + back arrow) hide the
  // shared K-MAPS title bar so we don't render two stacked headers.
  readonly hideShellHeader = signal(false);

  readonly tabs: ResearchTab[] = [
    { id: 'al-quran', labelAr: 'قرآن',  href: '/quran/al-quran',          icon: 'book-outline' },
    { id: 'tafseer',  labelAr: 'تفسير', href: '/quran/al-quran/tafseer',  icon: 'reader-outline' },
    { id: 'uloom',    labelAr: 'علوم',  href: '/quran/al-quran/uloom',    icon: 'school-outline' },
    { id: 'lexicon',  labelAr: 'معجم',  href: '/quran/al-quran/lexicon',  icon: 'library-outline' },
    { id: 'notes',    labelAr: 'حواشي', href: '/quran/al-quran/notes',    icon: 'bookmark-outline' },
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

  ngOnDestroy(): void {
    this.routerEventsSub.unsubscribe();
  }

  private syncCurrentTab(url: string): void {
    const path = url.split('?')[0];
    // Match longest href first so '/quran/al-quran/tafseer' beats '/quran/al-quran'
    const match = this.tabs.slice().reverse().find((tab) => path.startsWith(tab.href));
    this.currentTab.set(match?.id ?? 'al-quran');
    // The lexicon reader and the library list both show their own toolbar —
    // hide the shared K-MAPS header to avoid stacking two.
    this.hideShellHeader.set(/\/lexicon\/(?:read\/|books)/.test(path));
  }
}
