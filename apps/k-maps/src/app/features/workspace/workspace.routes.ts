import { Routes } from '@angular/router';

export const WORKSPACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./workspace.component').then((m) => m.WorkspaceComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./workspace-home.component').then((m) => m.WorkspaceHomeComponent),
        title: 'Workspace — K-MAPS',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./workspace-detail.component').then((m) => m.WorkspaceDetailComponent),
        title: 'Workspace Detail — K-MAPS',
      },
    ],
  },
];
