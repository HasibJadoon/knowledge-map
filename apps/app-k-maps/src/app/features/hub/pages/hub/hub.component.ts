import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'km-hub',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.scss'
})
export class HubComponent {}
