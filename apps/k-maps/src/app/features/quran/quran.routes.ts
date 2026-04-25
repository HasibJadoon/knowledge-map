import { Routes } from '@angular/router';

export const QURAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./quran-landing/quran-landing.component').then(
        (m) => m.QuranLandingComponent
      ),
    title: 'Quran — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/study',
    loadComponent: () =>
      import('./lessons/study/lesson-study.component').then(
        (m) => m.LessonStudyComponent
      ),
    title: 'Study — K-MAPS',
  },
  {
    path: 'lessons/:lessonId/edit',
    loadComponent: () =>
      import('./lessons/edit/lesson-edit.component').then(
        (m) => m.LessonEditComponent
      ),
    title: 'Edit Lesson — K-MAPS',
  },
  // ── Surah module routes ──────────────────────────────────
  {
    path: 'surah/:surahId/study/:passageNo',
    loadComponent: () =>
      import('./surah/study/detail/surah-study-detail.component').then(
        (m) => m.SurahStudyDetailComponent
      ),
    title: 'Study — K-MAPS',
  },
  {
    path: 'surah/:surahId/study',
    loadComponent: () =>
      import('./surah/study/surah-study.component').then(
        (m) => m.SurahStudyComponent
      ),
    title: 'Study — K-MAPS',
  },
  {
    path: 'surah/:surahId/notes',
    loadComponent: () =>
      import('./surah/notes/surah-notes.component').then(
        (m) => m.SurahNotesComponent
      ),
    title: 'Notes — K-MAPS',
  },
  {
    path: 'surah/:surahId/vocabulary',
    loadComponent: () =>
      import('./surah/vocabulary/surah-vocabulary.component').then(
        (m) => m.SurahVocabularyComponent
      ),
    title: 'Arabic Linguistics — K-MAPS',
  },
  {
    path: 'surah/:surahId/near-synonyms',
    loadComponent: () =>
      import('./surah/near-synonyms/surah-near-synonyms.component').then(
        (m) => m.SurahNearSynonymsComponent
      ),
    title: 'Near Synonyms — K-MAPS',
  },
  {
    path: 'surah/:surahId/morphology',
    loadComponent: () =>
      import('./surah/morphology/surah-morphology.component').then(
        (m) => m.SurahMorphologyComponent
      ),
    title: 'Morphology — K-MAPS',
  },
  {
    path: 'surah/:surahId/review',
    loadComponent: () =>
      import('./surah/review/surah-review.component').then(
        (m) => m.SurahReviewComponent
      ),
    title: 'Review — K-MAPS',
  },
  {
    path: 'surah/:surahId/srs',
    loadComponent: () =>
      import('./surah/srs/surah-srs.component').then(
        (m) => m.SurahSrsComponent
      ),
    title: 'SRS — K-MAPS',
  },
  // ── Worldview routes ─────────────────────────────────────
  {
    path: 'surah/:surahId/worldview',
    loadComponent: () =>
      import('./surah/worldview/hub/worldview-hub.component').then(
        (m) => m.WorldviewHubComponent
      ),
    title: 'Worldview — K-MAPS',
  },
  {
    path: 'surah/:surahId/worldview/nodes',
    loadComponent: () =>
      import('./surah/worldview/nodes/worldview-nodes.component').then(
        (m) => m.WorldviewNodesComponent
      ),
    title: 'Worldview Nodes — K-MAPS',
  },
  {
    path: 'surah/:surahId/worldview/sources',
    loadComponent: () =>
      import('./surah/worldview/sources/worldview-sources.component').then(
        (m) => m.WorldviewSourcesComponent
      ),
    title: 'Sources — K-MAPS',
  },
  {
    path: 'surah/:surahId/worldview/podcasts',
    loadComponent: () =>
      import('./surah/worldview/podcasts/worldview-podcasts.component').then(
        (m) => m.WorldviewPodcastsComponent
      ),
    title: 'Podcasts — K-MAPS',
  },
  {
    path: 'surah/:surahId/worldview/documents',
    loadComponent: () =>
      import('./surah/worldview/documents/worldview-documents.component').then(
        (m) => m.WorldviewDocumentsComponent
      ),
    title: 'Documents — K-MAPS',
  },
  {
    path: 'surah/:surahId/worldview/notes',
    loadComponent: () =>
      import('./surah/worldview/notes/worldview-notes.component').then(
        (m) => m.WorldviewNotesComponent
      ),
    title: 'Worldview Notes — K-MAPS',
  },
  {
    path: 'surah/:surahId/worldview/links',
    loadComponent: () =>
      import('./surah/worldview/links/worldview-links.component').then(
        (m) => m.WorldviewLinksComponent
      ),
    title: 'Links — K-MAPS',
  },
  // ── Text view routes (keep last — catch-all :surahId) ────
  {
    path: ':surahId/passage/:passageIndex',
    loadComponent: () =>
      import('./surah/passage/quran-passage.component').then(
        (m) => m.QuranPassageComponent
      ),
    title: 'Passage — K-MAPS',
  },
  {
    path: ':surahId',
    loadComponent: () =>
      import('./surah/text/quran-text.component').then(
        (m) => m.QuranTextComponent
      ),
    title: 'Quran — K-MAPS',
  },
];
