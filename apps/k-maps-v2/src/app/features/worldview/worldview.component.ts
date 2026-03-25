import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-worldview',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './worldview.component.html',
  styleUrl: './worldview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewComponent {}
