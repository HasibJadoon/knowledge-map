import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-json-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <pre class="json-preview">{{ pretty }}</pre>
  `
})
export class JsonPreviewComponent {
  @Input() value: unknown = { notes: '' };

  get pretty(): string {
    if (typeof this.value === 'string') return this.value;
    try {
      return JSON.stringify(this.value, null, 2);
    } catch {
      return String(this.value);
    }
  }
}
