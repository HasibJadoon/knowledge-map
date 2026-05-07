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
  // ── Quran ───────────────────────────────────────────────────────────────────
  {
    path: 'quran/surahs',
    loadComponent: () => import('./features/quran/pages/quran-surahs-page/quran-surahs.page').then(m => m.QuranSurahsPage),
  },
  {
    path: 'quran/sura/:surahId/worldview/nodes',
    loadComponent: () => import('./features/quran/pages/worldview-nodes-page/worldview-nodes.page').then(m => m.WorldviewNodesPage),
  },
  {
    path: 'quran/sura/:surahId/worldview/sources',
    loadComponent: () => import('./features/quran/pages/worldview-sources-page/worldview-sources.page').then(m => m.WorldviewSourcesPage),
  },
  {
    path: 'quran/sura/:surahId/worldview/podcasts',
    loadComponent: () => import('./features/quran/pages/worldview-podcasts-page/worldview-podcasts.page').then(m => m.WorldviewPodcastsPage),
  },
  {
    path: 'quran/sura/:surahId/worldview/documents',
    loadComponent: () => import('./features/quran/pages/worldview-documents-page/worldview-documents.page').then(m => m.WorldviewDocumentsPage),
  },
  {
    path: 'quran/sura/:surahId/worldview/notes',
    loadComponent: () => import('./features/quran/pages/worldview-notes-page/worldview-notes.page').then(m => m.WorldviewNotesPage),
  },
  {
    path: 'quran/sura/:surahId/worldview/links',
    loadComponent: () => import('./features/quran/pages/worldview-links-page/worldview-links.page').then(m => m.WorldviewLinksPage),
  },
  {
    path: 'quran/sura/:surahId/worldview',
    loadComponent: () => import('./features/quran/pages/worldview-hub-page/worldview-hub.page').then(m => m.WorldviewHubPage),
  },
  {
    path: 'quran/sura/:surahId/study/:passageNo',
    loadComponent: () => import('./features/quran/pages/passage-study-page/passage-study.page').then(m => m.PassageStudyPage),
  },
  {
    path: 'quran/sura/:surahId/study',
    loadComponent: () => import('./features/quran/pages/surah-study-page/surah-study.page').then(m => m.SurahStudyPage),
  },
  {
    path: 'quran/sura/:surahId/notes',
    loadComponent: () => import('./features/quran/pages/surah-notes-page/quran-surah-notes.page').then(m => m.QuranSurahNotesPage),
  },
  {
    path: 'quran/sura/:surahId/linguistics',
    loadComponent: () => import('./features/quran/pages/surah-vocabulary-page/surah-vocabulary.page').then(m => m.SurahVocabularyPage),
  },
  { path: 'quran/sura/:surahId/arabic', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'quran/sura/:surahId/vocabulary', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  {
    path: 'quran/sura/:surahId/near-synonyms',
    loadComponent: () => import('./features/quran/pages/surah-near-synonyms-page/surah-near-synonyms.page').then(m => m.SurahNearSynonymsPage),
  },
  {
    path: 'quran/sura/:surahId/morphology',
    loadComponent: () => import('./features/quran/pages/surah-morphology-page/surah-morphology.page').then(m => m.SurahMorphologyPage),
  },
  {
    path: 'quran/sura/:surahId/review',
    loadComponent: () => import('./features/quran/pages/surah-review-page/surah-review.page').then(m => m.SurahReviewPage),
  },
  {
    path: 'quran/sura/:surahId/srs',
    loadComponent: () => import('./features/quran/pages/surah-srs-page/surah-srs.page').then(m => m.SurahSrsPage),
  },
  {
    path: 'quran/sura/:surahId/passage/:passageIndex',
    loadComponent: () => import('./features/quran/pages/passage-page/quran-passage.page').then(m => m.QuranPassagePage),
  },
  {
    path: 'quran/sura/:surahId',
    loadComponent: () => import('./features/quran/pages/text-page/quran-text.page').then(m => m.QuranTextPage),
  },
  { path: 'quran/surah/:surahId/worldview/nodes', redirectTo: 'quran/sura/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/worldview/sources', redirectTo: 'quran/sura/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/worldview/podcasts', redirectTo: 'quran/sura/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/worldview/documents', redirectTo: 'quran/sura/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/worldview/notes', redirectTo: 'quran/sura/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/worldview/links', redirectTo: 'quran/sura/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/worldview', redirectTo: 'quran/sura/:surahId/worldview', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/study/:passageNo', redirectTo: 'quran/sura/:surahId/study/:passageNo', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/study', redirectTo: 'quran/sura/:surahId/study', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/notes', redirectTo: 'quran/sura/:surahId/notes', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/linguistics', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/arabic', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/vocabulary', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/near-synonyms', redirectTo: 'quran/sura/:surahId/near-synonyms', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/morphology', redirectTo: 'quran/sura/:surahId/morphology', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/review', redirectTo: 'quran/sura/:surahId/review', pathMatch: 'full' },
  { path: 'quran/surah/:surahId/srs', redirectTo: 'quran/sura/:surahId/srs', pathMatch: 'full' },
  { path: 'quran/surah/:surahId', redirectTo: 'quran/sura/:surahId', pathMatch: 'full' },
  {
    path: 'quran',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/quran/pages/quran-landing-page/quran-landing.page').then(m => m.QuranLandingPage),
      },
      {
        path: '',
        loadComponent: () => import('./features/quran/al-quran/shell/quran-researcher-shell.component').then(m => m.QuranResearcherShellComponent),
        children: [
          {
            path: 'al-quran',
            loadComponent: () => import('./features/quran/al-quran/reader/al-quran.component').then(m => m.AlQuranComponent),
          },
          {
            path: 'tafseer',
            loadComponent: () => import('./features/quran/al-quran/tafseer/tafseer-page.component').then(m => m.TafseerPageComponent),
          },
          {
            path: 'uloom',
            loadComponent: () => import('./features/quran/al-quran/uloom/uloom-page.component').then(m => m.UloomPageComponent),
          },
          {
            path: 'lexicon',
            loadComponent: () => import('./features/quran/al-quran/lexicon/lexicon-page.component').then(m => m.LexiconPageComponent),
          },
          {
            path: 'notes',
            loadComponent: () => import('./features/quran/al-quran/notes/notes-page.component').then(m => m.NotesPageComponent),
          },
        ],
      },
      { path: ':surahId/passage/:passageIndex', redirectTo: '/quran/sura/:surahId/passage/:passageIndex', pathMatch: 'full' },
      { path: ':surahId', redirectTo: '/quran/sura/:surahId', pathMatch: 'full' },
    ],
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
