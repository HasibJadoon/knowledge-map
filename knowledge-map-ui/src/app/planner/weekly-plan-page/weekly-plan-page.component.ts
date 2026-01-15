import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-weekly-plan-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekly-plan-page.component.html'
})
export class WeeklyPlanPageComponent {
  columns = ['title', 'status', 'updated_at'];
  rows: Array<Record<string, string>> = [];
}
