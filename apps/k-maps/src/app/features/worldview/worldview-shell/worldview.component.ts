import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';

@Component({
  selector: 'km-worldview',
  standalone: true,
  imports: [RouterOutlet, HomePlaneButtonComponent],
  templateUrl: './worldview.component.html',
  styleUrl: './worldview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewComponent {}
