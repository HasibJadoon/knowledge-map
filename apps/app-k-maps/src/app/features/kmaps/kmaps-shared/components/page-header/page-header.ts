import { CommonModule, Location } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-kmaps-page-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class KmapsPageHeaderComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly icons = {
    arrowBackOutline,
  };

  @Input() title = '';
  @Input() subtitle = '';
  @Input() titleAlignment: 'center' | 'start' = 'center';
  @Input() showSearch = false;
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Search';
  @Input() searchDebounce = 150;
  @Input() showMenuButton = false;
  @Input() menuId = 'main-menu';
  @Input() showBackButton = false;
  @Input() backHref = '/worldview/library';
  @Input() showHomeButton = false;
  @Input() homeHref = '/dashboard';

  @Output() searchChange = new EventEmitter<string>();

  onSearchInput(value: string | null | undefined): void {
    this.searchChange.emit(value ?? '');
  }

  back(): void {
    const navigationId = typeof window !== 'undefined' ? Number(window.history.state?.navigationId ?? 0) : 0;
    if (navigationId > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(this.backHref, { replaceUrl: true });
  }

  goHome(): void {
    void this.router.navigateByUrl(this.homeHref, { replaceUrl: true });
  }
}
