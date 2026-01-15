import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './json-editor.component.html'
})
export class JsonEditorComponent {
  @Input() label = 'JSON';
  @Input() rows = 12;
  @Input() readonly = false;
  @Input() value = '{\n  "notes": ""\n}';
  @Output() valueChange = new EventEmitter<string>();
}
