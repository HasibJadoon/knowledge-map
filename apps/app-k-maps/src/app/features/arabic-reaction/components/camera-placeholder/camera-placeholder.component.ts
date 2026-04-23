import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'km-camera-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './camera-placeholder.component.html',
})
export class CameraPlaceholderComponent {}
