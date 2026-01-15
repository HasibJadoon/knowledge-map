import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-worldview-lesson-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './worldview-lesson-editor.component.html'
})
export class WorldviewLessonEditorComponent {
  titleValue = '';
  jsonValue = '{\n  "notes": ""\n}';
}
