import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./core/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'arabic/lessons',
    loadChildren: () => import('./features/arabic/lessons/arabic-lessons.module').then(m => m.ArabicLessonsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'arabic/roots',
    loadChildren: () => import('./features/arabic/roots/arabic-roots.module').then(m => m.ArabicRootsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'arabic/lexicon',
    loadChildren: () => import('./features/arabic/lexicon/arabic-lexicon.module').then(m => m.ArabicLexiconPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'arabic/memory',
    loadChildren: () => import('./features/arabic/memory/arabic-memory.module').then(m => m.ArabicMemoryPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'worldview/lessons',
    loadChildren: () => import('./features/worldview/lessons/worldview-lessons.module').then(m => m.WorldviewLessonsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'crossref',
    loadChildren: () => import('./features/crossref/crossref.module').then(m => m.CrossrefPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'podcast',
    loadChildren: () => import('./features/podcast/episodes/podcast-episodes.module').then(m => m.PodcastEpisodesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'planner',
    loadChildren: () => import('./features/planner/weekly-plan/weekly-plan.module').then(m => m.WeeklyPlanPageModule),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: 'dashboard' }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
