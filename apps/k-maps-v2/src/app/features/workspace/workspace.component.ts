import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-workspace',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ws-shell"><router-outlet /></div>`,
  styles: [`
    .ws-shell {
      width: 100%;
      height: 100dvh;
      overflow: hidden;
      background: var(--km-bg);
      display: flex;
      flex-direction: column;
    }
  `],
})
export class WorkspaceComponent {}
