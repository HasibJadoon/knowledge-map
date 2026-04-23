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
  },
  {
    path: 'wv',
    redirectTo: 'worldview',
    pathMatch: 'prefix',
  },
  // ── Quran surah sub-pages (more specific first) ─────────────────────────────
  {
    path: 'quran/surah/:surahId/worldview/nodes',
    loadComponent: () => import('./features/quran/pages/worldview-nodes-page/worldview-nodes.page').then(m => m.WorldviewNodesPage),
  },
  {
    path: 'quran/surah/:surahId/worldview/sources',
    loadComponent: () => import('./features/quran/pages/worldview-sources-page/worldview-sources.page').then(m => m.WorldviewSourcesPage),
  },
  {
    path: 'quran/surah/:surahId/worldview/podcasts',
    loadComponent: () => import('./features/quran/pages/worldview-podcasts-page/worldview-podcasts.page').then(m => m.WorldviewPodcastsPage),
  },
  {
    path: 'quran/surah/:surahId/worldview/documents',
    loadComponent: () => import('./features/quran/pages/worldview-documents-page/worldview-documents.page').then(m => m.WorldviewDocumentsPage),
  },
  {
    path: 'quran/surah/:surahId/worldview/notes',
    loadComponent: () => import('./features/quran/pages/worldview-notes-page/worldview-notes.page').then(m => m.WorldviewNotesPage),
  },
  {
    path: 'quran/surah/:surahId/worldview/links',
    loadComponent: () => import('./features/quran/pages/worldview-links-page/worldview-links.page').then(m => m.WorldviewLinksPage),
  },
  {
    path: 'quran/surah/:surahId/worldview',
    loadComponent: () => import('./features/quran/pages/worldview-hub-page/worldview-hub.page').then(m => m.WorldviewHubPage),
  },
  {
    path: 'quran/surah/:surahId/study/:passageNo',
    loadComponent: () => import('./features/quran/pages/passage-study-page/passage-study.page').then(m => m.PassageStudyPage),
  },
  {
    path: 'quran/surah/:surahId/study',
    loadComponent: () => import('./features/quran/pages/surah-study-page/surah-study.page').then(m => m.SurahStudyPage),
  },
  {
    path: 'quran/surah/:surahId/notes',
    loadComponent: () => import('./features/quran/pages/surah-notes-page/quran-surah-notes.page').then(m => m.QuranSurahNotesPage),
  },
  {
    path: 'quran/surah/:surahId/vocabulary',
    loadComponent: () => import('./features/quran/pages/surah-vocabulary-page/surah-vocabulary.page').then(m => m.SurahVocabularyPage),
  },
  {
    path: 'quran/surah/:surahId/review',
    loadComponent: () => import('./features/quran/pages/surah-review-page/surah-review.page').then(m => m.SurahReviewPage),
  },
  {
    path: 'quran/surah/:surahId/srs',
    loadComponent: () => import('./features/quran/pages/surah-srs-page/surah-srs.page').then(m => m.SurahSrsPage),
  },
  // ── Quran passage & text ─────────────────────────────────────────────────────
  {
    path: 'quran/:surahId/passage/:passageIndex',
    loadComponent: () => import('./features/quran/pages/passage-page/quran-passage.page').then(m => m.QuranPassagePage),
  },
  {
    path: 'quran/:surahId',
    loadComponent: () => import('./features/quran/pages/text-page/quran-text.page').then(m => m.QuranTextPage),
  },
  {
    path: 'quran',
    loadComponent: () => import('./features/quran/pages/browse-page/quran-browse.page').then(m => m.QuranBrowsePage),
  },
  // ── Planner ──────────────────────────────────────────────────────────────────
  {
    path: 'planner',
    loadChildren: () => import('./features/planner/weekly-plan/weekly-plan.module').then(m => m.WeeklyPlanPageModule),
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
  },
  // ── Content ──────────────────────────────────────────────────────────────────
  {
    path: 'content',
    loadChildren: () => import('./features/content/content.routes').then((m) => m.CONTENT_ROUTES),
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
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: NoPreloading })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
