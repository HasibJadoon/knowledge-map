import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-worldview-lesson-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-lesson-view.component.html'
})
export class WorldviewLessonViewComponent {
  jsonValue = '{\n  "notes": ""\n}';
}
