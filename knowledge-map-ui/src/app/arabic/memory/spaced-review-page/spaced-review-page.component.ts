import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spaced-review-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spaced-review-page.component.html'
})
export class SpacedReviewPageComponent {
  columns = ['title', 'status', 'updated_at'];
  rows: Array<Record<string, string>> = [];
}
