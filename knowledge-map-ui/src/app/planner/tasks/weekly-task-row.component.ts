import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-weekly-task-row',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="card mb-3">
    <div class="card-body">
      <h6 class="card-title">Weekly Task Row</h6>
      <p class="text-muted mb-0">Section placeholder.</p>
    </div>
  </div>
  `
})
export class WeeklyTaskRowComponent {

}
