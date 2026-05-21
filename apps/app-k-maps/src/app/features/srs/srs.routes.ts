import { Routes } from '@angular/router';

export const SRS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/srs-home/srs-home.page').then(m => m.SrsHomePage),
    title: 'SRS Review — K-MAPS',
  },
  {
    path: 'review',
    loadComponent: () => import('./pages/srs-review/srs-review.page').then(m => m.SrsReviewPage),
    title: 'SRS Review — K-MAPS',
  },
  {
    path: 'deck/:id',
    loadComponent: () => import('./pages/srs-deck/srs-deck.page').then(m => m.SrsDeckPage),
    title: 'SRS Deck — K-MAPS',
  },
  {
    path: 'deck/:deckId/card/new',
    loadComponent: () => import('./pages/srs-card-edit/srs-card-edit.page').then(m => m.SrsCardEditPage),
    title: 'New Card — K-MAPS',
  },
  {
    path: 'card/:cardId/edit',
    loadComponent: () => import('./pages/srs-card-edit/srs-card-edit.page').then(m => m.SrsCardEditPage),
    title: 'Edit Card — K-MAPS',
  },
];
