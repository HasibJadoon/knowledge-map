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
    path: 'arabic/tokens',
    loadChildren: () => import('./features/arabic/tokens/arabic-tokens.module').then(m => m.ArabicTokensPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'arabic/memory',
    loadChildren: () => import('./features/arabic/memory/arabic-memory.module').then(m => m.ArabicMemoryPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'worldview/lessons',
    loadChildren: () => import('./features/kmaps/kmaps.routes').then((m) => m.KMAPS_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'worldview',
    loadChildren: () => import('./features/kmaps/kmaps.routes').then((m) => m.KMAPS_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'wv',
    loadChildren: () => import('./features/kmaps/kmaps.routes').then((m) => m.KMAPS_ROUTES),
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
    path: 'episodes',
    redirectTo: 'podcast',
    pathMatch: 'full',
  },
  {
    path: 'quran/page/:page',
    loadComponent: () => import('./features/quran/pages/reader-page/quran-reader.page').then(m => m.QuranReaderPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'quran/surah/:surah/notes',
    loadComponent: () => import('./features/quran/pages/surah-notes-page/quran-surah-notes.page').then(m => m.QuranSurahNotesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'quran/surah/:surah',
    loadComponent: () => import('./features/quran/pages/reader-page/quran-reader.page').then(m => m.QuranReaderPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'quran',
    loadComponent: () => import('./features/quran/pages/browse-page/quran-browse.page').then(m => m.QuranBrowsePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'planner',
    loadChildren: () => import('./features/planner/weekly-plan/weekly-plan.module').then(m => m.WeeklyPlanPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'brainstorm',
    loadChildren: () => import('./features/brainstorm/brainstorm.routes').then((m) => m.BRAINSTORM_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'review/:weekStart',
    loadComponent: () => import('./features/planner/sprint-review/sprint-review.page').then((m) => m.SprintReviewPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'notes',
    loadChildren: () => import('./notes/notes.routes').then((m) => m.NOTES_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'discourse/quranic',
    loadComponent: () =>
      import('./features/discourse/discourse-placeholder/discourse-placeholder.page').then(m => m.DiscoursePlaceholderPage),
    canActivate: [AuthGuard],
    data: { title: "Qur'anic Discourse", subtitle: 'Coming soon.' }
  },
  {
    path: 'discourse/wv_concepts',
    loadComponent: () =>
      import('./features/discourse/discourse-concepts/discourse-concepts.page').then(m => m.DiscourseConceptsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'discourse/wv_concepts/:slug',
    loadComponent: () =>
      import('./features/discourse/discourse-concept-detail/discourse-concept-detail.page').then(m => m.DiscourseConceptDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'discourse/relations/:id',
    loadComponent: () =>
      import('./features/discourse/discourse-relation-detail/discourse-relation-detail.page').then(m => m.DiscourseRelationDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'discourse/flows',
    loadComponent: () =>
      import('./features/discourse/discourse-placeholder/discourse-placeholder.page').then(m => m.DiscoursePlaceholderPage),
    canActivate: [AuthGuard],
    data: { title: 'Flows', subtitle: 'Coming soon.' }
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
