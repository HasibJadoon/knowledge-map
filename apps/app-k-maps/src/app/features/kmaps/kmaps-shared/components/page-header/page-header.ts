import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-kmaps-page-header',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class KmapsPageHeaderComponent {
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
}
