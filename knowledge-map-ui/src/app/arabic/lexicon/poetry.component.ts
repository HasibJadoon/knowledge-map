import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-poetry',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="card mb-3">
    <div class="card-body">
      <h6 class="card-title">Poetry</h6>
      <p class="text-muted mb-0">Section placeholder.</p>
    </div>
  </div>
  `
})
export class PoetryComponent {

}
