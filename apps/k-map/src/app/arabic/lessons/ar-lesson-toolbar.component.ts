import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ar-lesson-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="d-flex flex-wrap gap-2 align-items-center">
      <h5 class="mb-0 me-auto">Ar Lesson Toolbar</h5>
      <button class="btn btn-outline-secondary btn-sm" type="button">Back</button>
      <button class="btn btn-primary btn-sm" type="button">Save</button>
    </div>
  `
})
export class ArLessonToolbarComponent {

}
