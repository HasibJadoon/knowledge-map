import { Routes } from '@angular/router';
import { AdminGuard } from '../../core/auth/admin.guard';

export const WORKSPACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/workspace-home/workspace-home.page').then(m => m.WorkspaceHomePage),
    title: 'Workspace — K-MAPS',
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/workspace-admin/workspace-admin.page').then(m => m.WorkspaceAdminPage),
    title: 'Administration — K-MAPS',
    canActivate: [AdminGuard],
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/workspace-detail/workspace-detail.component').then(m => m.WorkspaceDetailComponent),
    title: 'Workspace Detail — K-MAPS',
  },
];
