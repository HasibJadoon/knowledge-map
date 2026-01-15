import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-worldview-lessons-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './worldview-lessons-page.component.html'
})
export class WorldviewLessonsPageComponent {
  columns = ['title', 'status', 'updated_at'];
  rows: Array<Record<string, string>> = [];
}
