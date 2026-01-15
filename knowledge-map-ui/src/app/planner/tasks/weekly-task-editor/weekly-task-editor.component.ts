import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-weekly-task-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weekly-task-editor.component.html'
})
export class WeeklyTaskEditorComponent {
  titleValue = '';
  jsonValue = '{\n  "notes": ""\n}';
}
