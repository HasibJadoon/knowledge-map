import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  bulbOutline,
  bookOutline,
  calendarOutline,
  chatbubblesOutline,
  chevronForwardOutline,
  documentTextOutline,
  gitCompareOutline,
  globeOutline,
  homeOutline,
  leafOutline,
  libraryOutline,
  micOutline,
  pricetagsOutline,
  settingsOutline,
  shuffleOutline,
  sparklesOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
@Component({
  selector: 'app-menu',
  templateUrl: './app-menu.component.html',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class AppMenuComponent {
  private openSections = new Set<string>(['arabic']);

  constructor() {
    addIcons({
      chevronForwardOutline,
      homeOutline,
      bulbOutline,
      bookOutline,
      leafOutline,
      libraryOutline,
      swapHorizontalOutline,
      sparklesOutline,
      globeOutline,
      chatbubblesOutline,
      pricetagsOutline,
      shuffleOutline,
      gitCompareOutline,
      micOutline,
      calendarOutline,
      documentTextOutline,
      settingsOutline,
    });
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
