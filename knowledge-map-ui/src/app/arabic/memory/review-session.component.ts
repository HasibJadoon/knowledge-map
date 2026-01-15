import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-review-session',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Review Session</h5>
        <p class="text-muted mb-0">Session flow and prompts go here.</p>
      </div>
    </div>
  `
})
export class ReviewSessionComponent {
}
