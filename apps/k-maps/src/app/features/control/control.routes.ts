import { Routes } from '@angular/router';

export const CONTROL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./control-dashboard/control-dashboard.component').then(
        (m) => m.ControlDashboardComponent,
      ),
    title: 'K-MAPS — Control Deck',
  },
];
