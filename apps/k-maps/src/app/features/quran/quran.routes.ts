import { Routes } from '@angular/router';

export const QURAN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./quran-landing/quran-landing.component').then((m) => m.QuranLandingComponent),
    title: 'Quran — K-MAPS',
  },
  { path: 'al-quran/:surahId', redirectTo: 'al-quran', pathMatch: 'full' },
  {
    path: 'surahs',
    loadComponent: () =>
      import('./quran-surahs/quran-surahs.component').then((m) => m.QuranSurahsComponent),
    title: 'Surahs — K-MAPS',
  },
  {
    path: 'surahs/:surahId/study/:passageNo',
    loadComponent: () =>
      import('./quran-surahs/surah/study/detail/surah-study-detail.component').then((m) => m.SurahStudyDetailComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'surahs/:surahId/study',
    loadComponent: () =>
      import('./quran-surahs/surah/study/surah-study.component').then((m) => m.SurahStudyComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'surahs/:surahId/notes',
    loadComponent: () =>
      import('./quran-surahs/surah/notes/surah-notes.component').then((m) => m.SurahNotesComponent),
    title: 'Notes — K-MAPS',
  },
  {
    path: 'surahs/:surahId/linguistics',
    loadComponent: () =>
      import('./quran-surahs/surah/vocabulary/surah-vocabulary.component').then((m) => m.SurahVocabularyComponent),
    title: 'Linguistics — K-MAPS',
  },
  { path: 'surahs/:surahId/arabic', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surahs/:surahId/vocabulary', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  {
    path: 'surahs/:surahId/near-synonyms',
    loadComponent: () =>
      import('./quran-surahs/surah/near-synonyms/surah-near-synonyms.component').then((m) => m.SurahNearSynonymsComponent),
    title: 'Near Synonyms — K-MAPS',
  },
  {
    path: 'surahs/:surahId/morphology',
    loadComponent: () =>
      import('./quran-surahs/surah/morphology/surah-morphology.component').then((m) => m.SurahMorphologyComponent),
    title: 'Morphology — K-MAPS',
  },
  {
    path: 'surahs/:surahId/review',
    loadComponent: () =>
      import('./quran-surahs/surah/review/surah-review.component').then((m) => m.SurahReviewComponent),
    title: 'Review — K-MAPS',
  },
  {
    path: 'surahs/:surahId/srs',
    loadComponent: () =>
      import('./quran-surahs/surah/srs/surah-srs.component').then((m) => m.SurahSrsComponent),
    title: 'SRS — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/nodes',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/nodes/worldview-nodes.component').then((m) => m.WorldviewNodesComponent),
    title: 'Worldview Nodes — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/sources',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/sources/worldview-sources.component').then((m) => m.WorldviewSourcesComponent),
    title: 'Sources — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/podcasts',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/podcasts/worldview-podcasts.component').then((m) => m.WorldviewPodcastsComponent),
    title: 'Podcasts — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/documents',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/documents/worldview-documents.component').then((m) => m.WorldviewDocumentsComponent),
    title: 'Documents — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/notes',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/notes/worldview-notes.component').then((m) => m.WorldviewNotesComponent),
    title: 'Worldview Notes — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview/links',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/links/worldview-links.component').then((m) => m.WorldviewLinksComponent),
    title: 'Links — K-MAPS',
  },
  {
    path: 'surahs/:surahId/worldview',
    loadComponent: () =>
      import('./quran-surahs/surah/worldview/hub/worldview-hub.component').then((m) => m.WorldviewHubComponent),
    title: 'Worldview — K-MAPS',
  },
  {
    path: 'surahs/:surahId/passage/:passageIndex',
    loadComponent: () =>
      import('./quran-surahs/surah/passage/quran-passage.component').then((m) => m.QuranPassageComponent),
    title: 'Passage — K-MAPS',
  },
  {
    path: 'surahs/:surahId',
    loadComponent: () =>
      import('./quran-surahs/surah/text/quran-text.component').then((m) => m.QuranTextComponent),
    title: 'Quran — K-MAPS',
  },
  { path: 'browser', redirectTo: 'lexicon', pathMatch: 'full' },
  {
    path: 'lessons/:lessonId/study',
    loadComponent: () =>
      import('./quran-surahs/lessons/study/lesson-study.component').then((m) => m.LessonStudyComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/edit',
    loadComponent: () =>
      import('./quran-surahs/lessons/edit/lesson-edit.component').then((m) => m.LessonEditComponent),
    title: 'Edit Lesson — K-MAPS',
  },
  {
    path: '',
    loadComponent: () =>
      import('./al-quran/shell/quran-researcher-shell.component').then(
        (m) => m.QuranResearcherShellComponent,
      ),
    children: [
      {
        path: 'al-quran',
        loadComponent: () =>
          import('./al-quran/reader/al-quran.component').then((m) => m.AlQuranComponent),
        title: 'Al-Quran — K-MAPS',
      },
      {
        path: 'tafseer',
        loadComponent: () =>
          import('./al-quran/tafseer/tafseer-page.component').then((m) => m.TafseerPageComponent),
        title: 'Tafseer — K-MAPS',
      },
      {
        path: 'uloom',
        loadComponent: () =>
          import('./al-quran/uloom/uloom-page.component').then((m) => m.UloomPageComponent),
        title: 'Sciences — K-MAPS',
      },
      {
        path: 'lexicon',
        loadComponent: () =>
          import('./al-quran/lexicon/lexicon-page.component').then((m) => m.LexiconPageComponent),
        title: 'Lexicon — K-MAPS',
      },
      {
        path: 'notes',
        loadComponent: () =>
          import('./al-quran/notes/notes-page.component').then((m) => m.NotesPageComponent),
        title: 'Notes — K-MAPS',
      },
      { path: 'iraab', redirectTo: 'uloom', pathMatch: 'full' },
    ],
  },

  // Legacy redirects.
  { path: 'sura/:surahId/study/:passageNo', redirectTo: 'surahs/:surahId/study/:passageNo', pathMatch: 'full' },
  { path: 'sura/:surahId/study', redirectTo: 'surahs/:surahId/study', pathMatch: 'full' },
  { path: 'sura/:surahId/notes', redirectTo: 'surahs/:surahId/notes', pathMatch: 'full' },
  { path: 'sura/:surahId/linguistics', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/arabic', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/vocabulary', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/near-synonyms', redirectTo: 'surahs/:surahId/near-synonyms', pathMatch: 'full' },
  { path: 'sura/:surahId/morphology', redirectTo: 'surahs/:surahId/morphology', pathMatch: 'full' },
  { path: 'sura/:surahId/review', redirectTo: 'surahs/:surahId/review', pathMatch: 'full' },
  { path: 'sura/:surahId/srs', redirectTo: 'surahs/:surahId/srs', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/nodes', redirectTo: 'surahs/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/sources', redirectTo: 'surahs/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/podcasts', redirectTo: 'surahs/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/documents', redirectTo: 'surahs/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/notes', redirectTo: 'surahs/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview/links', redirectTo: 'surahs/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'sura/:surahId/worldview', redirectTo: 'surahs/:surahId/worldview', pathMatch: 'full' },
  { path: 'sura/:surahId/passage/:passageIndex', redirectTo: 'surahs/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: 'sura/:surahId', redirectTo: 'surahs/:surahId', pathMatch: 'full' },
  { path: 'surah/:surahId/study/:passageNo', redirectTo: 'surahs/:surahId/study/:passageNo', pathMatch: 'full' },
  { path: 'surah/:surahId/study', redirectTo: 'surahs/:surahId/study', pathMatch: 'full' },
  { path: 'surah/:surahId/notes', redirectTo: 'surahs/:surahId/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/linguistics', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/arabic', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/vocabulary', redirectTo: 'surahs/:surahId/linguistics', pathMatch: 'full' },
  { path: 'surah/:surahId/near-synonyms', redirectTo: 'surahs/:surahId/near-synonyms', pathMatch: 'full' },
  { path: 'surah/:surahId/morphology', redirectTo: 'surahs/:surahId/morphology', pathMatch: 'full' },
  { path: 'surah/:surahId/review', redirectTo: 'surahs/:surahId/review', pathMatch: 'full' },
  { path: 'surah/:surahId/srs', redirectTo: 'surahs/:surahId/srs', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/nodes', redirectTo: 'surahs/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/sources', redirectTo: 'surahs/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/podcasts', redirectTo: 'surahs/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/documents', redirectTo: 'surahs/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/notes', redirectTo: 'surahs/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/links', redirectTo: 'surahs/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview', redirectTo: 'surahs/:surahId/worldview', pathMatch: 'full' },
  { path: 'surah/:surahId/passage/:passageIndex', redirectTo: 'surahs/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: 'surah/:surahId', redirectTo: 'surahs/:surahId', pathMatch: 'full' },
  { path: ':surahId/passage/:passageIndex', redirectTo: 'surahs/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: ':surahId', redirectTo: 'surahs/:surahId', pathMatch: 'full' },
];
