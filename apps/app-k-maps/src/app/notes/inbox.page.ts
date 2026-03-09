import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { IonicModule } from '@ionic/angular';
import { checkmarkDoneOutline, createOutline, flagOutline } from 'ionicons/icons';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import { AppIconTabsComponent, IconTabItem } from '../shared/components/icon-tabs/icon-tabs.component';

@Component({
  selector: 'app-notes-inbox-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterLink, AppIconTabsComponent],
  templateUrl: './inbox.page.html',
  styleUrls: ['./inbox.page.scss'],
  host: {
    '[style.--notes-shell-tab-offset]': 'footerTabOffset',
  },
})
export class InboxPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly keyboardListenerHandles: Promise<PluginListenerHandle>[] = [];

  readonly searchControl = new FormControl(this.route.snapshot.queryParamMap.get('q') ?? '', { nonNullable: true });
  readonly currentUrl = signal(this.router.url);
  readonly activeTabKey = signal(this.resolveTabKey(this.router.url));
  readonly keyboardOpen = signal(false);
  readonly noteTabs: IconTabItem[] = [
    { key: 'draft', icon: createOutline, label: 'Draft' },
    { key: 'flag', icon: flagOutline, label: 'Flag' },
    { key: 'published', icon: checkmarkDoneOutline, label: 'Published' },
  ];

  constructor() {
    this.bindKeyboardListeners();
    this.destroyRef.onDestroy(() => {
      void this.unbindKeyboardListeners();
    });

    this.searchControl.valueChanges.pipe(
      map((value) => value.trim()),
      debounceTime(250),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((query) => {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: query || null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event) => {
      this.currentUrl.set(event.urlAfterRedirects);
      this.activeTabKey.set(this.resolveTabKey(event.urlAfterRedirects));
    });
  }

  get showFooterTabs(): boolean {
    return !this.keyboardOpen();
  }

  get footerTabOffset(): string {
    return this.showFooterTabs
      ? 'calc(var(--app-icon-tabs-min-height) + (env(safe-area-inset-bottom) * 0.45))'
      : '0px';
  }

  onTabSelected(tabKey: string | number | null | undefined): void {
    if (tabKey !== 'draft' && tabKey !== 'flag' && tabKey !== 'published') {
      return;
    }

    if (tabKey === this.activeTabKey()) {
      return;
    }

    void this.router.navigate(['/notes', tabKey], {
      queryParamsHandling: 'merge',
    });
  }

  private resolveTabKey(url: string): 'draft' | 'flag' | 'published' {
    if (url.includes('/flag')) {
      return 'flag';
    }

    if (url.includes('/published')) {
      return 'published';
    }

    return 'draft';
  }

  private bindKeyboardListeners(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const markKeyboardOpen = () => this.keyboardOpen.set(true);
    const markKeyboardClosed = () => this.keyboardOpen.set(false);

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
