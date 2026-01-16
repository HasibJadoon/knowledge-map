import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-3">
      <label class="form-label">{{ label }}</label>
      <textarea
        class="form-control json-editor"
        [rows]="rows"
        [(ngModel)]="value"
        (ngModelChange)="valueChange.emit($event)"
        [readonly]="readonly"
      ></textarea>
    </div>
  `
})
export class JsonEditorComponent {
  @Input() label = 'JSON';
  @Input() rows = 12;
  @Input() readonly = false;
  @Input() value = '{\n  "notes": ""\n}';
  @Output() valueChange = new EventEmitter<string>();
}
