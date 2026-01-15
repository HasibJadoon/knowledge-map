import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./spaced-review-page/spaced-review-page.component').then(m => m.SpacedReviewPageComponent),
    data: { title: 'Spaced Review' }
  },
  {
    path: 'session',
    loadComponent: () =>
      import('./review-session/review-session.component').then(m => m.ReviewSessionComponent),
    data: { title: 'Review Session' }
  }
];
