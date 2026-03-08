import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { homeOutline, settingsOutline } from 'ionicons/icons';
import { DASHBOARD_MENU_SECTIONS } from '../../features/dashboard/dashboard-menu.data';
import { dashboardSectionRoute } from '../../features/dashboard/dashboard-card.model';

type MenuEntry = {
  title: string;
  icon: string;
  route: string[];
};

@Component({
  selector: 'app-menu',
  templateUrl: './app-menu.component.html',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class AppMenuComponent {
  readonly menuEntries = this.buildMenuEntries();

  trackEntry(_: number, entry: MenuEntry): string {
    return entry.route.join('/');
  }

  private buildMenuEntries(): ReadonlyArray<MenuEntry> {
    return [
      {
        title: 'Home',
        icon: homeOutline,
        route: ['/dashboard'],
      },
      ...DASHBOARD_MENU_SECTIONS
        .filter((section) => section.key !== 'settings')
        .map((section) => ({
          title: section.title,
          icon: section.icon,
          route: dashboardSectionRoute(section),
        })),
      {
        title: 'Settings',
        icon: settingsOutline,
        route: ['/settings'],
      },
    ];
  }
}
