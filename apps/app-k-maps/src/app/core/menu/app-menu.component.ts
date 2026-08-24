import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import {
  bookOutline,
  documentTextOutline,
  filmOutline,
  flashOutline,
  globeOutline,
  homeOutline,
  layersOutline,
  libraryOutline,
  lockClosedOutline,
  micOutline,
  peopleOutline,
  repeatOutline,
} from 'ionicons/icons';

type MenuEntry = {
  title: string;
  icon: string;
  route: string[];
};

const MENU_ENTRIES: ReadonlyArray<MenuEntry> = [
  { title: 'Home',       icon: homeOutline,        route: ['/home'] },
  { title: 'Quran',      icon: bookOutline,         route: ['/quran'] },
  { title: 'Arabic',     icon: flashOutline,        route: ['/arabic', 'lessons'] },
  { title: 'Worldview',  icon: globeOutline,        route: ['/worldview'] },
  { title: 'Docs',       icon: documentTextOutline, route: ['/docs'] },
  { title: 'Hub',        icon: layersOutline,       route: ['/hub'] },
  { title: 'Workspace',  icon: peopleOutline,       route: ['/workspace'] },
  { title: 'SRS',        icon: repeatOutline,       route: ['/srs'] },
  { title: 'Content',    icon: filmOutline,         route: ['/content'] },
  { title: 'Reaction',   icon: micOutline,          route: ['/arabic', 'reaction'] },
  { title: 'Library',    icon: libraryOutline,      route: ['/worldview', 'library'] },
  { title: 'Change Password', icon: lockClosedOutline, route: ['/change-password'] },
];

@Component({
  selector: 'app-menu',
  templateUrl: './app-menu.component.html',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class AppMenuComponent {
  readonly menuEntries: ReadonlyArray<MenuEntry> = MENU_ENTRIES;

  trackEntry(_: number, entry: MenuEntry): string {
    return entry.route.join('/');
  }
}
