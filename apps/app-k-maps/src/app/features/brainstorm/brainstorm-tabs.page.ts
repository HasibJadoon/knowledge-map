import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MenuController, IonicModule } from '@ionic/angular';
import { addCircleOutline, albumsOutline, searchOutline } from 'ionicons/icons';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AppIconTabsComponent } from '../../shared/components/icon-tabs/icon-tabs.component';
import { BrainstormStoreService } from './services/brainstorm-store.service';

@Component({
  selector: 'app-brainstorm-tabs-page',
  standalone: true,
  imports: [CommonModule, IonicModule, AppIconTabsComponent],
  templateUrl: './brainstorm-tabs.page.html',
  styleUrl: './brainstorm-tabs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainstormTabsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly menuController = inject(MenuController);
  private readonly store = inject(BrainstormStoreService);
  readonly activeTabKey = signal(this.resolveTabKey(this.router.url));

  readonly tabs = [
    { key: 'topics', label: 'Topics', icon: albumsOutline },
    { key: 'new', label: 'Quick Add', icon: addCircleOutline },
    { key: 'search', label: 'Search', icon: searchOutline },
  ];

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => {
      this.activeTabKey.set(this.resolveTabKey(event.urlAfterRedirects));
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.menuController.enable(true, 'main-menu');
    void this.store.ensureLoaded().catch(() => undefined);
  }

  onTabSelected(tabKey: string): void {
    const target = tabKey === 'search'
      ? '/brainstorm/search'
      : tabKey === 'new'
        ? '/brainstorm/new'
        : '/brainstorm/topics';

    if (this.router.url === target) {
      return;
    }

    void this.router.navigateByUrl(target);
  }

  private resolveTabKey(url: string): string {
    if (url.startsWith('/brainstorm/search')) {
      return 'search';
    }

    if (url.startsWith('/brainstorm/new') || url.includes('/idea/')) {
      return 'new';
    }

    return 'topics';
  }
}
