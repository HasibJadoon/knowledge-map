import { Routes } from '@angular/router';

export const ARABIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/arabic-shell/arabic-shell.component').then((m) => m.ArabicShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/arabic-home/arabic-home.component').then((m) => m.ArabicHomeComponent),
        title: 'Arabic - K-MAPS',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./pages/arabic-library/arabic-library.component').then((m) => m.ArabicLibraryComponent),
        title: 'Library - Arabic',
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./pages/arabic-library-units/arabic-library-units.component').then(
            (m) => m.ArabicLibraryUnitsComponent,
          ),
        title: 'Reader - Arabic',
      },
      {
        path: 'linguistics',
        loadComponent: () =>
          import('./pages/arabic-linguistics/arabic-linguistics.component').then(
            (m) => m.ArabicLinguisticsComponent,
          ),
        title: 'Linguistics - Arabic',
      },
      {
        path: 'domains',
        loadComponent: () =>
          import('./pages/arabic-domains/arabic-domains.component').then((m) => m.ArabicDomainsComponent),
        title: 'Domains - Arabic',
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./pages/arabic-review/arabic-review.component').then((m) => m.ArabicReviewComponent),
        title: 'Review - Arabic',
      },
      {
        path: 'books/:containerId/chapter/:unitId',
        loadComponent: () =>
          import('./pages/unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Chapter - Arabic',
      },
      {
        path: 'media/:containerId/episode/:unitId',
        loadComponent: () =>
          import('./pages/unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Episode - Arabic',
      },
      {
        path: 'literature/:containerId/section/:unitId',
        loadComponent: () =>
          import('./pages/unit-study/arabic-unit-study.component').then((m) => m.ArabicUnitStudyComponent),
        title: 'Section - Arabic',
      },
      {
        path: 'reaction/:unitId',
        loadComponent: () =>
          import('../arabic-reaction/pages/reaction-screen/reaction-screen.component').then(
            (m) => m.ReactionScreenComponent,
          ),
        title: 'Reaction Studio - Arabic',
      },
      {
        path: 'lessons',
        loadChildren: () => import('./lessons/arabic-lessons.module').then(m => m.ArabicLessonsPageModule),
        title: 'Lessons - Arabic',
      },
    ],
  },
];
