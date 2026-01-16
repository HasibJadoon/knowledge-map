import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-crossref-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crossref-editor.component.html'
})
export class CrossrefEditorComponent {
  titleValue = '';
  jsonValue = '{\n  "notes": ""\n}';
}
