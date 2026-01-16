import { Component } from '@angular/core';
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
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
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
    });
  }
}

