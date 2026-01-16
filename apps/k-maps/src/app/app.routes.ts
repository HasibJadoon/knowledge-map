import { Routes } from '@angular/router';
import { AuthGuard } from '../services/auth.guard';
import { RootRedirectGuard } from '../services/root-redirect.guard';

export const routes: Routes = [
  // 👇 Root entry decision
  {
    path: '',
    canActivate: [RootRedirectGuard],
    component: class EmptyComponent {}
  },

  // 🔓 Public login
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login.component').then(m => m.LoginComponent),
  },

  // 🔐 Protected layout
  {
    path: '',
    loadComponent: () =>
      import('./core/layout').then(m => m.DefaultLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/routes').then(m => m.routes),
      },
      {
        path: 'roots',
        loadChildren: () =>
          import('./features/arabic/roots/routes').then(m => m.routes),
      },
      {
        path: 'arabic',
        loadChildren: () =>
          import('./features/arabic/routes').then(m => m.routes),
      },
      {
        path: 'worldview',
        loadChildren: () =>
          import('./features/worldview/routes').then(m => m.routes),
      },
      {
        path: 'crossref',
        loadChildren: () =>
          import('./features/crossref/routes').then(m => m.routes),
      },
      {
        path: 'podcast',
        loadChildren: () =>
          import('./features/podcast/routes').then(m => m.routes),
      },
      {
        path: 'planner',
        loadChildren: () =>
          import('./features/planner/routes').then(m => m.routes),
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
