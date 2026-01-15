import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-weekly-plan-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weekly-plan-editor.component.html'
})
export class WeeklyPlanEditorComponent {
  titleValue = '';
  jsonValue = '{\n  "notes": ""\n}';
}
