import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
  {
    path: 'quran',
    loadChildren: () =>
      import('./features/quran/quran.routes').then((m) => m.QURAN_ROUTES),
  },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    title: 'K-MAPS — Knowledge Command Center',
  },
  {
    path: 'hub',
    loadComponent: () =>
      import('./features/hub/hub.component').then((m) => m.HubComponent),
    title: 'Hub — K-MAPS',
  },
  // Backwards-compatible redirects from old /arabic/quran routes
  { path: 'arabic/quran', redirectTo: 'quran', pathMatch: 'full' },
  { path: 'arabic/quran/:surahId', redirectTo: 'quran/:surahId', pathMatch: 'full' },
  {
    path: 'arabic/quran/:surahId/passage/:passageIndex',
    redirectTo: 'quran/:surahId/passage/:passageIndex',
    pathMatch: 'full',
  },
  {
    path: 'arabic',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/arabic/arabic-home/arabic-home.component').then(
            (m) => m.ArabicHomeComponent
          ),
        title: 'Arabic — K-MAPS',
      },
    ],
  },
  {
    path: 'worldview',
    loadComponent: () =>
      import('./features/worldview/worldview.component').then((m) => m.WorldviewComponent),
    title: 'Worldview — K-MAPS',
  },
  {
    path: 'planner',
    loadComponent: () =>
      import('./features/planner/planner.component').then((m) => m.PlannerComponent),
    title: 'Planner — K-MAPS',
  },
  {
    path: 'content',
    loadComponent: () =>
      import('./features/content/content.component').then((m) => m.ContentComponent),
    title: 'Content — K-MAPS',
  },
  {
    path: 'workspace',
    loadComponent: () =>
      import('./features/workspace/workspace.component').then((m) => m.WorkspaceComponent),
    title: 'Workspace — K-MAPS',
  },
  {
    path: '**',
    redirectTo: 'landing',
  },
];
