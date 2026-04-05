import { Routes } from '@angular/router';

export const PLANNER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./planner/planner.component').then((m) => m.PlannerComponent),
    title: 'Planner — K-MAPS',
  },
];
