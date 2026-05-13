import { Routes } from '@angular/router';

export const LEXICON_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./lexicon-home.component').then(m => m.LexiconHomeComponent),
    title: 'المعجم',
  },
  {
    path: 'books',
    loadComponent: () =>
      import('./books/lexicon-books.component').then(m => m.LexiconBooksComponent),
    title: 'المعجم — الكتب',
  },
  {
    path: 'books/:slug',
    loadComponent: () =>
      import('./book-reader/lexicon-book-reader.component').then(m => m.LexiconBookReaderComponent),
    title: 'المعجم — قراءة',
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./search/lexicon-search.component').then(m => m.LexiconSearchComponent),
    title: 'المعجم — البحث',
  },
];
