import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'km-back-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  readonly route = input<string | readonly unknown[]>('/home');
  readonly label = input('Home');
  readonly icon = input('←');
  readonly ariaLabel = input<string | null>(null);

  readonly resolvedAriaLabel = computed(() => this.ariaLabel() ?? `Back to ${this.label()}`);
}
