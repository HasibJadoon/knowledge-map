import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-arabic-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div class="arabic-shell">
      <router-outlet />
    </div>
  `,
  styles: [`
    .arabic-shell {
      width: 100%;
      min-height: 100dvh;
      background: var(--km-bg);
    }
  `],
})
export class ArabicShellComponent {}
