import { NgModule } from '@angular/core';
import { NoPreloading, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./core/home/pages/home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'landing',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () => import('./core/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./core/auth/pages/change-password/change-password.page').then(m => m.ChangePasswordPage),
    canActivate: [AuthGuard],
  },
  // ── Arabic ──────────────────────────────────────────────────────────────────
  {
    path: 'arabic',
    loadChildren: () => import('./features/arabic/arabic.routes').then((m) => m.ARABIC_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── Worldview ────────────────────────────────────────────────────────────────
  {
    path: 'worldview',
    loadChildren: () => import('./features/worldview/worldview.routes').then((m) => m.WORLDVIEW_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'wv',
    redirectTo: 'worldview',
    pathMatch: 'prefix',
  },
  // ── Quran ───────────────────────────────────────────────────────────────────
  {
    path: 'quran',
    loadChildren: () => import('./features/quran/quran.routes').then(m => m.QURAN_ROUTES),
    canActivate: [AuthGuard]
  },
  
  
   // ── Planner ──────────────────────────────────────────────────────────────────
  {
    path: 'planner',
    loadChildren: () => import('./features/planner/planner.module').then(m => m.PlannerModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'review/:weekStart',
    loadComponent: () => import('./features/planner/pages/review/review.page').then((m) => m.ReviewPage),
    canActivate: [AuthGuard]
  },
  // ── Docs ─────────────────────────────────────────────────────────────────────
  {
    path: 'docs',
    loadChildren: () => import('./features/docs/docs.routes').then((m) => m.DOCS_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── Content ──────────────────────────────────────────────────────────────────
  {
    path: 'content',
    loadChildren: () => import('./features/content/content.routes').then((m) => m.CONTENT_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── Studio ───────────────────────────────────────────────────────────────────
  {
    path: 'studio',
    loadChildren: () => import('./features/studio/studio.routes').then((m) => m.STUDIO_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── Hub ──────────────────────────────────────────────────────────────────────
  {
    path: 'hub',
    loadChildren: () => import('./features/hub/hub.routes').then((m) => m.HUB_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── Workspace ────────────────────────────────────────────────────────────────
  {
    path: 'workspace',
    loadChildren: () => import('./features/workspace/workspace.routes').then((m) => m.WORKSPACE_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── SRS ──────────────────────────────────────────────────────────────────────
  {
    path: 'srs',
    loadChildren: () => import('./features/srs/srs.routes').then((m) => m.SRS_ROUTES),
    canActivate: [AuthGuard]
  },
  // ── Workbench ────────────────────────────────────────────────────────────────
  {
    path: 'workbench',
    loadComponent: () => import('./features/workbench/workbench.page').then((m) => m.WorkbenchPage),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: NoPreloading })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
