import { Routes } from '@angular/router';

export const QURAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./quran-landing/quran-landing.component').then((m) => m.QuranLandingComponent),
    title: 'Quran — K-MAPS',
  },
  {
    path: 'surahs',
    loadComponent: () =>
      import('./quran-surahs/quran-surahs.component').then((m) => m.QuranSurahsComponent),
    title: 'Surahs — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/study',
    loadComponent: () =>
      import('./lessons/study/lesson-study.component').then((m) => m.LessonStudyComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/edit',
    loadComponent: () =>
      import('./lessons/edit/lesson-edit.component').then((m) => m.LessonEditComponent),
    title: 'Edit Lesson — K-MAPS',
  },
  {
    path: 'sura/:surahId/study/:passageNo',
    loadComponent: () =>
      import('./surah/study/detail/surah-study-detail.component').then((m) => m.SurahStudyDetailComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'sura/:surahId/study',
    loadComponent: () =>
      import('./surah/study/surah-study.component').then((m) => m.SurahStudyComponent),
    title: 'Study — K-MAPS',
  },
  {
    path: 'sura/:surahId/notes',
    loadComponent: () =>
      import('./surah/notes/surah-notes.component').then((m) => m.SurahNotesComponent),
    title: 'Notes — K-MAPS',
  },
  {
    path: 'sura/:surahId/linguistics',
    loadComponent: () =>
      import('./surah/vocabulary/surah-vocabulary.component').then((m) => m.SurahVocabularyComponent),
    title: 'Linguistics — K-MAPS',
  },
  { path: 'sura/:surahId/arabic', redirectTo: 'sura/:surahId/linguistics', pathMatch: 'full' },
  { path: 'sura/:surahId/vocabulary', redirectTo: 'sura/:surahId/linguistics', pathMatch: 'full' },
  {
    path: 'sura/:surahId/near-synonyms',
    loadComponent: () =>
      import('./surah/near-synonyms/surah-near-synonyms.component').then((m) => m.SurahNearSynonymsComponent),
    title: 'Near Synonyms — K-MAPS',
  },
  {
    path: 'sura/:surahId/morphology',
    loadComponent: () =>
      import('./surah/morphology/surah-morphology.component').then((m) => m.SurahMorphologyComponent),
    title: 'Morphology — K-MAPS',
  },
  {
    path: 'sura/:surahId/review',
    loadComponent: () =>
      import('./surah/review/surah-review.component').then((m) => m.SurahReviewComponent),
    title: 'Review — K-MAPS',
  },
  {
    path: 'sura/:surahId/srs',
    loadComponent: () =>
      import('./surah/srs/surah-srs.component').then((m) => m.SurahSrsComponent),
    title: 'SRS — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview/nodes',
    loadComponent: () =>
      import('./surah/worldview/nodes/worldview-nodes.component').then((m) => m.WorldviewNodesComponent),
    title: 'Worldview Nodes — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview/sources',
    loadComponent: () =>
      import('./surah/worldview/sources/worldview-sources.component').then((m) => m.WorldviewSourcesComponent),
    title: 'Sources — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview/podcasts',
    loadComponent: () =>
      import('./surah/worldview/podcasts/worldview-podcasts.component').then((m) => m.WorldviewPodcastsComponent),
    title: 'Podcasts — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview/documents',
    loadComponent: () =>
      import('./surah/worldview/documents/worldview-documents.component').then((m) => m.WorldviewDocumentsComponent),
    title: 'Documents — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview/notes',
    loadComponent: () =>
      import('./surah/worldview/notes/worldview-notes.component').then((m) => m.WorldviewNotesComponent),
    title: 'Worldview Notes — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview/links',
    loadComponent: () =>
      import('./surah/worldview/links/worldview-links.component').then((m) => m.WorldviewLinksComponent),
    title: 'Links — K-MAPS',
  },
  {
    path: 'sura/:surahId/worldview',
    loadComponent: () =>
      import('./surah/worldview/hub/worldview-hub.component').then((m) => m.WorldviewHubComponent),
    title: 'Worldview — K-MAPS',
  },
  {
    path: 'sura/:surahId/passage/:passageIndex',
    loadComponent: () =>
      import('./surah/passage/quran-passage.component').then((m) => m.QuranPassageComponent),
    title: 'Passage — K-MAPS',
  },
  {
    path: 'sura/:surahId',
    loadComponent: () =>
      import('./surah/text/quran-text.component').then((m) => m.QuranTextComponent),
    title: 'Quran — K-MAPS',
  },
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
  { path: 'surah/:surahId/worldview/nodes', redirectTo: 'sura/:surahId/worldview/nodes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/sources', redirectTo: 'sura/:surahId/worldview/sources', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/podcasts', redirectTo: 'sura/:surahId/worldview/podcasts', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/documents', redirectTo: 'sura/:surahId/worldview/documents', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/notes', redirectTo: 'sura/:surahId/worldview/notes', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview/links', redirectTo: 'sura/:surahId/worldview/links', pathMatch: 'full' },
  { path: 'surah/:surahId/worldview', redirectTo: 'sura/:surahId/worldview', pathMatch: 'full' },
  { path: 'surah/:surahId', redirectTo: 'sura/:surahId', pathMatch: 'full' },
  { path: ':surahId/passage/:passageIndex', redirectTo: 'sura/:surahId/passage/:passageIndex', pathMatch: 'full' },
  { path: ':surahId', redirectTo: 'sura/:surahId', pathMatch: 'full' },
];
