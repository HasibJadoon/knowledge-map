import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { QuranReaderHeaderService } from '../reader/quran-reader-header.service';

interface ResearchTab {
  id: string;
  labelAr: string;
  href: string;
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
  readonly currentTab = signal('al-quran');
  readonly searchOpen = signal(false);
  readonly navOpen = signal(false);

  readonly tabs: ResearchTab[] = [
    { id: 'al-quran', labelAr: 'قرآن',  href: '/quran/al-quran' },
    { id: 'tafseer',  labelAr: 'تفسير', href: '/quran/al-quran/tafseer' },
    { id: 'uloom',    labelAr: 'علوم',  href: '/quran/al-quran/uloom' },
    { id: 'lexicon',  labelAr: 'معجم',  href: '/quran/al-quran/lexicon' },
    { id: 'notes',    labelAr: 'حواشي', href: '/quran/al-quran/notes' },
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

  toggleSearch(): void {
    this.searchOpen.set(!this.searchOpen());
  }

  toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.search.setSearch('');
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  onSearchModalPresent(): void {
    setTimeout(() => {
      const sb: any = document.querySelector('.qrs-modal-searchbar');
      sb?.setFocus?.();
    }, 100);
  }

  setSearch(value: string | null | undefined): void {
    this.search.setSearch(value);
  }

  openTab(tab: ResearchTab, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.currentTab.set(tab.id);
    void this.router.navigateByUrl(tab.href);
  }

  ngOnDestroy(): void {
    this.routerEventsSub.unsubscribe();
  }

  private syncCurrentTab(url: string): void {
    const path = url.split('?')[0];
    // Match longest href first so '/quran/al-quran/tafseer' beats '/quran/al-quran'
    const match = this.tabs.slice().reverse().find((tab) => path.startsWith(tab.href));
    const newTab = match?.id ?? 'al-quran';
    if (newTab !== 'al-quran') this.navOpen.set(false);
    this.currentTab.set(newTab);
  }
}
