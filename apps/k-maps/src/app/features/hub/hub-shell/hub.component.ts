import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';

@Component({
  selector: 'km-hub',
  standalone: true,
  imports: [RouterOutlet, HomePlaneButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.scss'
})
export class HubComponent {}
