import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-kmaps-workflow-shell',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './workflow-shell.html',
  styleUrl: './workflow-shell.scss',
  host: {
    'class': 'ion-page kmaps-workflow-shell',
    '[class.kmaps-workflow-shell--with-search]': 'showSearch',
    '[class.kmaps-workflow-shell--with-footer-actions]': 'showFooter',
    '[class.kmaps-workflow-shell--without-header]': '!showHeader',
  },
})
export class KmapsWorkflowShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() titleAlignment: 'center' | 'start' = 'center';
  @Input() showHeader = true;
  @Input() showSearch = false;
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Search';
  @Input() showMenuButton = false;
  @Input() showBackButton = false;
  @Input() backHref = '/worldview/library';
  @Input() showHomeButton = true;
  @Input() homeHref = '/dashboard';
  @Input() showFooter = false;

  @Output() searchChange = new EventEmitter<string>();

  onSearchInput(value: string | null | undefined): void {
    this.searchChange.emit((value ?? '').trim());
  }
}
