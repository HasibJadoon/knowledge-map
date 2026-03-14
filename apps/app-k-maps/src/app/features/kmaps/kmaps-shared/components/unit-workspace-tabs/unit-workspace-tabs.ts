import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { albumsOutline, bookOutline, bookmarkOutline, documentTextOutline } from 'ionicons/icons';

import { AppIconTabsComponent, type IconTabItem } from '../../../../../shared/components/icon-tabs/icon-tabs.component';
import { WvWorkspaceTabKey } from '../../models/wv-workspace.models';

@Component({
  selector: 'app-kmaps-unit-workspace-tabs',
  standalone: true,
  imports: [IonicModule, AppIconTabsComponent],
  templateUrl: './unit-workspace-tabs.html',
  styleUrl: './unit-workspace-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KmapsUnitWorkspaceTabsComponent {
  @Input() activeTab: WvWorkspaceTabKey = 'overview';

  @Output() activeTabChange = new EventEmitter<WvWorkspaceTabKey>();

  readonly tabs: ReadonlyArray<IconTabItem> = [
    { key: 'overview', label: 'Overview', icon: albumsOutline },
    { key: 'read', label: 'Read', icon: bookOutline },
    { key: 'highlights', label: 'Highlights', icon: bookmarkOutline },
    { key: 'notes', label: 'Notes', icon: documentTextOutline },
  ];

  onTabSelected(tabKey: string): void {
    if (tabKey === 'read' || tabKey === 'highlights' || tabKey === 'notes') {
      this.activeTabChange.emit(tabKey);
      return;
    }

    this.activeTabChange.emit('overview');
  }
}
