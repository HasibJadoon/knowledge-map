import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: `<span class="status-badge">{{ status }}</span>`,
  standalone: false,
})
export class StatusBadgeComponent {
  @Input() status = '';
}
