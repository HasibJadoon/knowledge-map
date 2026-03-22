import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-worldview',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="wv-shell"><router-outlet /></div>`,
  styles: [`.wv-shell { width: 100%; height: 100dvh; overflow: hidden; background: var(--km-bg); }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewComponent {}
