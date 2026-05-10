import { Routes } from '@angular/router';

export const QURAN_ROUTES: Routes = [
  // Landing
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./quran-landing-page/quran-landing.page').then(m => m.QuranLandingPage),
  },

  // Researcher shell — single instance; tabs are child routes rendered by ion-router-outlet
  {
    path: 'al-quran',
    loadComponent: () =>
      import('./al-quran/shell/quran-researcher-shell.component').then(
        m => m.QuranResearcherShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./al-quran/reader/al-quran.component').then(m => m.AlQuranComponent),
      },
      {
        path: 'tafseer',
        loadComponent: () =>
          import('./al-quran/tafseer/tafseer-page.component').then(m => m.TafseerPageComponent),
      },
      {
        path: 'uloom',
        loadComponent: () =>
          import('./al-quran/uloom/uloom-page.component').then(m => m.UloomPageComponent),
      },
      {
        path: 'lexicon',
        loadComponent: () =>
          import('./al-quran/lexicon/lexicon-page.component').then(m => m.LexiconPageComponent),
      },
      {
        path: 'notes',
        loadComponent: () =>
          import('./al-quran/notes/notes-page.component').then(m => m.NotesPageComponent),
      },
      {
        path: 'lane-lexicon',
        loadComponent: () =>
          import('./al-quran/lane-lexicon/lane-lexicon-page.component').then(m => m.LaneLexiconPageComponent),
      },
    ],
  },

  // Study pages
  {
    path: 'surahs',
    loadComponent: () =>
      import('./surah-study/quran-surahs-page/quran-surahs.page').then(m => m.QuranSurahsPage),
  },
  {
    path: 'sura/:surahId',
    loadComponent: () =>
      import('./surah-study/text-page/quran-text.page').then(m => m.QuranTextPage),
  },
  {
    path: 'sura/:surahId/worldview/nodes',
    loadComponent: () =>
      import('./surah-study/worldview-nodes-page/worldview-nodes.page').then(
        m => m.WorldviewNodesPage,
      ),
  },
  {
    path: 'sura/:surahId/worldview/sources',
    loadComponent: () =>
      import('./surah-study/worldview-sources-page/worldview-sources.page').then(
        m => m.WorldviewSourcesPage,
      ),
  },
  {
    path: 'sura/:surahId/worldview/podcasts',
    loadComponent: () =>
      import('./surah-study/worldview-podcasts-page/worldview-podcasts.page').then(
        m => m.WorldviewPodcastsPage,
      ),
  },
  {
    path: 'sura/:surahId/worldview/documents',
    loadComponent: () =>
      import('./surah-study/worldview-documents-page/worldview-documents.page').then(
        m => m.WorldviewDocumentsPage,
      ),
  },
  {
    path: 'sura/:surahId/worldview/notes',
    loadComponent: () =>
      import('./surah-study/worldview-notes-page/worldview-notes.page').then(
        m => m.WorldviewNotesPage,
      ),
  },
  {
    path: 'sura/:surahId/worldview/links',
    loadComponent: () =>
      import('./surah-study/worldview-links-page/worldview-links.page').then(
        m => m.WorldviewLinksPage,
      ),
  },
  {
    path: 'sura/:surahId/worldview',
    loadComponent: () =>
      import('./surah-study/worldview-hub-page/worldview-hub.page').then(m => m.WorldviewHubPage),
  },
  {
    path: 'sura/:surahId/study/:passageNo',
    loadComponent: () =>
      import('./surah-study/passage-study-page/passage-study.page').then(m => m.PassageStudyPage),
  },
  {
    path: 'sura/:surahId/study',
    loadComponent: () =>
      import('./surah-study/surah-study-page/surah-study.page').then(m => m.SurahStudyPage),
  },
  {
    path: 'sura/:surahId/notes',
    loadComponent: () =>
      import('./surah-study/surah-notes-page/quran-surah-notes.page').then(
        m => m.QuranSurahNotesPage,
      ),
  },
  {
    path: 'sura/:surahId/linguistics',
    loadComponent: () =>
      import('./surah-study/surah-vocabulary-page/surah-vocabulary.page').then(
        m => m.SurahVocabularyPage,
      ),
  },
  { path: 'sura/:surahId/arabic', redirectTo: 'sura/:surahId/linguistics', pathMatch: 'full' },
  {
    path: 'sura/:surahId/vocabulary',
    redirectTo: 'sura/:surahId/linguistics',
    pathMatch: 'full',
  },
  {
    path: 'sura/:surahId/near-synonyms',
    loadComponent: () =>
      import('./surah-study/surah-near-synonyms-page/surah-near-synonyms.page').then(
        m => m.SurahNearSynonymsPage,
      ),
  },
  {
    path: 'sura/:surahId/morphology',
    loadComponent: () =>
      import('./surah-study/surah-morphology-page/surah-morphology.page').then(
        m => m.SurahMorphologyPage,
      ),
  },
  {
    path: 'sura/:surahId/review',
    loadComponent: () =>
      import('./surah-study/surah-review-page/surah-review.page').then(m => m.SurahReviewPage),
  },
  {
    path: 'sura/:surahId/srs',
    loadComponent: () =>
      import('./surah-study/surah-srs-page/surah-srs.page').then(m => m.SurahSrsPage),
  },
  {
    path: 'sura/:surahId/passage/:passageIndex',
    loadComponent: () =>
      import('./surah-study/passage-page/quran-passage.page').then(m => m.QuranPassagePage),
  },

  // Legacy 'surah' → 'sura' redirects
  { path: 'surah/:surahId/worldview/nodes', redirectTo: 'sura/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/sources', redirectTo: 'sura/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/podcasts', redirectTo: 'sura/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/documents', redirectTo: 'sura/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/notes', redirectTo: 'sura/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/links', redirectTo: 'sura/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview', redirectTo: 'sura/:surahId/worldview', pathMatch: 'full' },
  { path: 'surah/:surahId/study/:passageNo', redirectTo: 'sura/:surahId/study/:passageNo', pathMatch: 'full' },
  { path: 'surah/:surahId/study', redirectTo: 'sura/:surahId/study', pathMatch: 'full' },
  { path: 'surah/:surahId/notes', redirectTo: 'sura/:surahId/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/linguistics', redirectTo: 'sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/arabic', redirectTo: 'sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/vocabulary', redirectTo: 'sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/near-synonyms', redirectTo: 'sura/:surahId/near-synonyms', pathMatch: 'full' },
  { path: 'surah/:surahId/morphology', redirectTo: 'sura/:surahId/morphology', pathMatch: 'full' },
  { path: 'surah/:surahId/review', redirectTo: 'sura/:surahId/review', pathMatch: 'full' },
  { path: 'surah/:surahId/srs', redirectTo: 'sura/:surahId/srs', pathMatch: 'full' },
  { path: 'surah/:surahId', redirectTo: 'sura/:surahId', pathMatch: 'full' },
  { path: ':surahId/passage/:passageIndex', redirectTo: 'sura/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: ':surahId', redirectTo: 'sura/:surahId', pathMatch: 'full' },
];
