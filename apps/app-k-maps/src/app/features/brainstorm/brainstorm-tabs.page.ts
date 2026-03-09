import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { AlertController, MenuController, IonicModule, ToastController } from '@ionic/angular';
import { addOutline, albumsOutline, arrowBackOutline, createOutline, homeOutline, searchOutline, settingsOutline } from 'ionicons/icons';
import { filter } from 'rxjs';
import { AppIconTabsComponent } from '../../shared/components/icon-tabs/icon-tabs.component';
import { blurActiveElement } from '../../shared/focus-utils';
import { BrainstormStoreService } from './services/brainstorm-store.service';

@Component({
  selector: 'app-brainstorm-tabs-page',
  standalone: true,
  imports: [CommonModule, IonicModule, AppIconTabsComponent],
  templateUrl: './brainstorm-tabs.page.html',
  styleUrl: './brainstorm-tabs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.brainstorm-shell--with-search]': 'hasToolbarSearch',
  },
})
export class BrainstormTabsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly menuController = inject(MenuController);
  private readonly store = inject(BrainstormStoreService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly keyboardListenerHandles: Promise<PluginListenerHandle>[] = [];
  readonly currentUrl = signal(this.router.url);
  readonly activeTabKey = signal(this.resolveTabKey(this.router.url));
  readonly keyboardOpen = signal(false);
  readonly icons = {
    addOutline,
    albumsOutline,
    arrowBackOutline,
    createOutline,
    homeOutline,
    searchOutline,
    settingsOutline,
  };

  readonly tabs = [
    { key: 'topics', label: 'Topics', icon: albumsOutline },
    { key: 'search', label: 'Search', icon: searchOutline },
  ];

  constructor() {
    this.bindKeyboardListeners();
    this.destroyRef.onDestroy(() => {
      void this.unbindKeyboardListeners();
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => {
      this.currentUrl.set(event.urlAfterRedirects);
      this.activeTabKey.set(this.resolveTabKey(event.urlAfterRedirects));

      if (!this.isTopicView) {
        this.keyboardOpen.set(false);
      }
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.menuController.enable(true, 'main-menu');
    void this.store.ensureLoaded().catch(() => undefined);
  }

  get toolbarHeading(): string {
    if (this.isTopicView) {
      return 'Ideas';
    }

    const headings: Record<string, string> = {
      topics: 'Topics',
      new: 'Quick Add',
      search: 'Search',
    };
    return headings[this.activeTabKey()] ?? 'Topics';
  }

  get hasToolbarSearch(): boolean {
    return this.isTopicsView || this.activeTabKey() === 'search' || this.isTopicView;
  }

  get toolbarSearchQuery(): string {
    if (!this.hasToolbarSearch) {
      return '';
    }

    const query = this.router.parseUrl(this.router.url).queryParams['q'];
    return typeof query === 'string' ? query : '';
  }

  get toolbarSearchPlaceholder(): string {
    if (this.isTopicsView) {
      return 'Search topics';
    }

    return this.isTopicView ? 'Search ideas' : 'Search ideas, topics, tags, or context';
  }

  get isTopicsView(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/brainstorm/topics');
  }

  get isTopicView(): boolean {
    const url = this.currentUrl();
    return url.startsWith('/brainstorm/topic/') && !url.includes('/idea/');
  }

  get topicIdFromUrl(): string | null {
    if (!this.isTopicView) {
      return null;
    }

    const segments = this.currentUrl().split('?')[0].split('/').filter(Boolean);
    return segments[2] ?? null;
  }

  get showCreateIdeaAction(): boolean {
    return Boolean(this.topicIdFromUrl);
  }

  get showCreateTopicAction(): boolean {
    return this.isTopicsView || this.activeTabKey() === 'search';
  }

  get showFooterTabs(): boolean {
    const url = this.currentUrl();
    return !url.startsWith('/brainstorm/search') && !(this.isTopicView && this.keyboardOpen());
  }

  onTabSelected(tabKey: string | number | null | undefined): void {
    if (tabKey !== 'topics' && tabKey !== 'search') {
      return;
    }

    const target = tabKey === 'search' ? '/brainstorm/search' : '/brainstorm/topics';

    if (this.router.url === target) {
      return;
    }

    blurActiveElement();
    void this.router.navigateByUrl(target);
  }

  back(): void {
    blurActiveElement();
    this.location.back();
  }

  goToDashboard(): void {
    blurActiveElement();
    void this.router.navigateByUrl('/dashboard');
  }

  openSettings(): void {
    blurActiveElement();
    void this.router.navigateByUrl('/settings');
  }

  onToolbarSearchInput(value: string | null | undefined): void {
    if (!this.hasToolbarSearch) {
      return;
    }

    const query = (value ?? '').trim();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: query || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openNewIdea(): void {
    const topicId = this.topicIdFromUrl;
    if (!topicId) {
      return;
    }

    blurActiveElement();
    void this.router.navigate(['/brainstorm', 'topic', topicId, 'idea', 'new']);
  }

  async openNewTopic(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'New Topic',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Topic title',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          role: 'confirm',
          handler: async (value) => {
            try {
              const created = await this.store.createTopic(String(value.title ?? ''));
              if (!created) {
                await this.presentToast('Topic title cannot be empty.');
                return false;
              }

              blurActiveElement();
              await this.router.navigate(['/brainstorm', 'topic', created.id]);
              return true;
            } catch {
              await this.presentToast(this.store.error() ?? 'Unable to create topic.');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }

  private resolveTabKey(url: string): string {
    if (url.startsWith('/brainstorm/search')) {
      return 'search';
    }

    return 'topics';
  }

  private bindKeyboardListeners(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const markKeyboardOpen = () => {
      this.keyboardOpen.set(true);
    };
    const markKeyboardClosed = () => {
      this.keyboardOpen.set(false);
    };

    this.keyboardListenerHandles.push(
      Keyboard.addListener('keyboardWillShow', markKeyboardOpen),
      Keyboard.addListener('keyboardDidShow', markKeyboardOpen),
      Keyboard.addListener('keyboardWillHide', markKeyboardClosed),
      Keyboard.addListener('keyboardDidHide', markKeyboardClosed),
    );
  }

  private async unbindKeyboardListeners(): Promise<void> {
    if (this.keyboardListenerHandles.length === 0) {
      return;
    }

    for (const handlePromise of this.keyboardListenerHandles) {
      try {
        const handle = await handlePromise;
        await handle.remove();
      } catch {
        // Ignore listener cleanup failures during route teardown.
      }
    }
  }
}
