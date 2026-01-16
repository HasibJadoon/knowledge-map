import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
@Component({
  selector: 'app-menu',
  templateUrl: './app-menu.component.html',
  styleUrls: ['./app-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class AppMenuComponent {
  private openSections = new Set<string>(['arabic']);

  constructor() {
    addIcons({ chevronForwardOutline });
  }

  toggle(section: string) {
    if (this.openSections.has(section)) {
      this.openSections.delete(section);
    } else {
      this.openSections.add(section);
    }
  }

  isOpen(section: string) {
    return this.openSections.has(section);
  }
}
