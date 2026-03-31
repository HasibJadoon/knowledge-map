import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';

@Component({
  selector: 'km-arabic-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HomePlaneButtonComponent],
  templateUrl: './arabic-shell.component.html',
  styleUrl: './arabic-shell.component.scss',
})
export class ArabicShellComponent {}
