import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-arabic-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './arabic-shell.component.html',
  styleUrl: './arabic-shell.component.scss',
})
export class ArabicShellComponent {}
