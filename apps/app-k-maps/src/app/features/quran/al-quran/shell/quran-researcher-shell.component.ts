import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { QuranResearchSearchService } from '../quran-research-search.service';
import { QuranReaderHeaderService } from '../reader/quran-reader-header.service';

interface ResearchTab {
  id: string;
  labelAr: string;
  routePath: string;
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

  readonly tabs: ResearchTab[] = [
    { id: 'al-quran', labelAr: 'قرآن', routePath: 'al-quran' },
    { id: 'tafseer', labelAr: 'تفسير', routePath: 'tafseer' },
    { id: 'uloom', labelAr: 'علوم', routePath: 'uloom' },
    { id: 'lexicon', labelAr: 'معجم', routePath: 'lexicon' },
    { id: 'notes', labelAr: 'حواشي', routePath: 'notes' },
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

  setSearch(value: string | null | undefined): void {
    this.search.setSearch(value);
  }

  openTab(routePath: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.currentTab.set(this.tabs.find((tab) => tab.routePath === routePath)?.id ?? 'al-quran');
    void this.router.navigateByUrl(`/quran/${routePath}`);
  }

  ngOnDestroy(): void {
    this.routerEventsSub.unsubscribe();
  }

  private syncCurrentTab(url: string): void {
    const match = this.tabs.find((tab) => url.includes(`/quran/${tab.routePath}`));
    this.currentTab.set(match?.id ?? 'al-quran');
  }
}
