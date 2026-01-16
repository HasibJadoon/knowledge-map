import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  calendarOutline,
  gitCompareOutline,
  globeOutline,
  homeOutline,
  leafOutline,
  libraryOutline,
  micOutline,
  sparklesOutline,
  chevronForward,
  settingsOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private readonly menu: MenuController) {
    addIcons({
      homeOutline,
      bookOutline,
      leafOutline,
      libraryOutline,
      sparklesOutline,
      globeOutline,
      gitCompareOutline,
      micOutline,
      calendarOutline,
      chevronForward,
      settingsOutline,
    });
  }

  async onRouteChange() {
    await this.menu.close('main-menu');
    await this.menu.close();
  }
}

