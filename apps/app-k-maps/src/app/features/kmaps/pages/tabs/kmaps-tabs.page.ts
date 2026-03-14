import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-kmaps-tabs-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './kmaps-tabs.page.html',
  styleUrl: './kmaps-tabs.page.scss',
  host: {
    class: 'ion-page kmaps-tabs-page',
  },
})
export class KmapsTabsPage {}
