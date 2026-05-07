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
    loadComponent: () => import('./features/quran/quran-surahs/quran-surahs.component').then(m => m.QuranSurahsComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview/nodes',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/nodes/worldview-nodes.component').then(m => m.WorldviewNodesComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview/sources',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/sources/worldview-sources.component').then(m => m.WorldviewSourcesComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview/podcasts',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/podcasts/worldview-podcasts.component').then(m => m.WorldviewPodcastsComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview/documents',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/documents/worldview-documents.component').then(m => m.WorldviewDocumentsComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview/notes',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/notes/worldview-notes.component').then(m => m.WorldviewNotesComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview/links',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/links/worldview-links.component').then(m => m.WorldviewLinksComponent),
  },
  {
    path: 'quran/sura/:surahId/worldview',
    loadComponent: () => import('./features/quran/quran-surahs/surah/worldview/hub/worldview-hub.component').then(m => m.WorldviewHubComponent),
  },
  {
    path: 'quran/sura/:surahId/study/:passageNo',
    loadComponent: () => import('./features/quran/quran-surahs/surah/study/detail/surah-study-detail.component').then(m => m.SurahStudyDetailComponent),
  },
  {
    path: 'quran/sura/:surahId/study',
    loadComponent: () => import('./features/quran/quran-surahs/surah/study/surah-study.component').then(m => m.SurahStudyComponent),
  },
  {
    path: 'quran/sura/:surahId/notes',
    loadComponent: () => import('./features/quran/quran-surahs/surah/notes/surah-notes.component').then(m => m.SurahNotesComponent),
  },
  {
    path: 'quran/sura/:surahId/linguistics',
    loadComponent: () => import('./features/quran/quran-surahs/surah/vocabulary/surah-vocabulary.component').then(m => m.SurahVocabularyComponent),
  },
  { path: 'quran/sura/:surahId/arabic', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'quran/sura/:surahId/vocabulary', redirectTo: 'quran/sura/:surahId/linguistics', pathMatch: 'full' },
  {
    path: 'quran/sura/:surahId/near-synonyms',
    loadComponent: () => import('./features/quran/quran-surahs/surah/near-synonyms/surah-near-synonyms.component').then(m => m.SurahNearSynonymsComponent),
  },
  {
    path: 'quran/sura/:surahId/morphology',
    loadComponent: () => import('./features/quran/quran-surahs/surah/morphology/surah-morphology.component').then(m => m.SurahMorphologyComponent),
  },
  {
    path: 'quran/sura/:surahId/review',
    loadComponent: () => import('./features/quran/quran-surahs/surah/review/surah-review.component').then(m => m.SurahReviewComponent),
  },
  {
    path: 'quran/sura/:surahId/srs',
    loadComponent: () => import('./features/quran/quran-surahs/surah/srs/surah-srs.component').then(m => m.SurahSrsComponent),
  },
  {
    path: 'quran/sura/:surahId/passage/:passageIndex',
    loadComponent: () => import('./features/quran/quran-surahs/surah/passage/quran-passage.component').then(m => m.QuranPassageComponent),
  },
  {
    path: 'quran/sura/:surahId',
    loadComponent: () => import('./features/quran/quran-surahs/surah/text/quran-text.component').then(m => m.QuranTextComponent),
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
        loadComponent: () => import('./features/quran/quran-landing/quran-landing.component').then(m => m.QuranLandingComponent),
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
