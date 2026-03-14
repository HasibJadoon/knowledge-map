import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export type KmTabItem = {
  key: string;
  icon: string;
  label: string;
};

@Component({
  selector: 'app-km-tabs, app-icon-tabs',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './icon-tabs.component.html',
  styleUrl: './icon-tabs.component.scss',
})
export class KmTabsComponent {
  @Input() tabs: ReadonlyArray<KmTabItem> = [];
  @Input() activeKey: string | null = null;
  @Input() manual = false;
  @Input() showLabels = false;

  @Output() tabSelected = new EventEmitter<string>();

  onSelect(key: string, event: Event): void {
    if (this.manual) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.tabSelected.emit(key);
  }
}

export type IconTabItem = KmTabItem;
export { KmTabsComponent as AppIconTabsComponent };
