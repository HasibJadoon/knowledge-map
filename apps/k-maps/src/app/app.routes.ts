import { Routes } from '@angular/router';
import { AuthGuard } from '../services/auth.guard';
import { RootRedirectGuard } from '../services/root-redirect.guard';

export const routes: Routes = [
  // 👇 Root entry decision
  // 🔓 Public login
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin/setup',
    loadComponent: () =>
      import('./features/admin/users/users-page.component').then(m => m.UsersPageComponent),
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
        path: 'docs',
        loadChildren: () =>
          import('./features/docs/routes').then((m) => m.routes),
      },
      {
        path: 'crossref',
        loadChildren: () =>
          import('./features/crossref/routes').then(m => m.routes),
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./features/admin/routes').then(m => m.routes),
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
      },
      {
        path: 'discourse',
        loadChildren: () =>
          import('./features/discourse/routes').then(m => m.routes),
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
