import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.page').then(m => m.HomePage),
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
  // ── Worldview ────────────────────────────────────────────────────────────────
  {
    path: 'worldview',
    loadChildren: () => import('./features/worldview/worldview.routes').then((m) => m.WORLDVIEW_ROUTES),
  },
  {
    // Short alias kept for backwards compatibility
    path: 'wv',
    redirectTo: 'worldview',
    pathMatch: 'prefix',
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
  // ── Quran passage & text ──────────────────────────────────────────────────────
  {
    path: 'quran/:surahId/passage/:passageIndex',
    loadComponent: () => import('./features/quran/pages/passage-page/quran-passage.page').then(m => m.QuranPassagePage),
  },
  {
    path: 'quran/reader',
    loadComponent: () => import('./features/quran/pages/reader-page/quran-reader.page').then(m => m.QuranReaderPage),
  },
  {
    path: 'quran/:surahId',
    loadComponent: () => import('./features/quran/pages/text-page/quran-text.page').then(m => m.QuranTextPage),
  },
  {
    path: 'quran',
    loadComponent: () => import('./features/quran/pages/browse-page/quran-browse.page').then(m => m.QuranBrowsePage),
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
  { path: '**', redirectTo: '' }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
