import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-worldview-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview.page.html',
  styleUrl: './worldview.page.scss',
  host: {
    class: 'ion-page worldview-page',
  },
})
export class WorldviewPage {}
