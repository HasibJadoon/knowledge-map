import { Routes } from '@angular/router';

export const ARABIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./arabic-shell/arabic-shell.component').then((m) => m.ArabicShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./arabic-home/arabic-home.component').then((m) => m.ArabicHomeComponent),
        title: 'Arabic — K-MAPS',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./arabic-library/arabic-library.component').then((m) => m.ArabicLibraryComponent),
        title: 'Library — Arabic',
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./arabic-library-units/arabic-library-units.component').then((m) => m.ArabicLibraryUnitsComponent),
        title: 'Reader — Arabic',
      },
      {
        path: 'linguistics',
        loadComponent: () =>
          import('./arabic-linguistics/arabic-linguistics.component').then((m) => m.ArabicLinguisticsComponent),
        title: 'Linguistics — Arabic',
      },
      {
        path: 'domains',
        loadComponent: () =>
          import('./arabic-domains/arabic-domains.component').then((m) => m.ArabicDomainsComponent),
        title: 'Domains — Arabic',
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./arabic-review/arabic-review.component').then((m) => m.ArabicReviewComponent),
        title: 'Review — Arabic',
      },
    ],
  },
];
