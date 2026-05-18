import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'km-planner-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './planner-shell.component.html',
})
export class PlannerShellComponent {
  readonly nav = [
    { route: '/planner/today', label: 'Today', glyph: '☀' },
    { route: '/planner/plans', label: 'Plans', glyph: '▦' },
    { route: '/planner/calendar', label: 'Calendar', glyph: '◷' },
    { route: '/planner/goals', label: 'Goals', glyph: '◎' },
    { route: '/planner/review', label: 'Review', glyph: '✓' },
    { route: '/planner/capture', label: 'Capture', glyph: '✎' },
  ];
}
