import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./menu/grammar-menu.component').then(m => m.GrammarMenuComponent),
    data: { title: 'Grammar' },
  },
  {
    path: 'chapters',
    loadComponent: () =>
      import('./chapters/grammar-chapters.component').then(m => m.GrammarChaptersComponent),
    data: { title: 'Chapters & Lessons' },
  },
  {
    path: 'tree',
    loadComponent: () =>
      import('./tree/grammar-tree.component').then(m => m.GrammarTreeComponent),
    data: { title: 'Grammar Tree' },
  },
  {
    path: 'examples',
    loadComponent: () =>
      import('./examples/grammar-examples.component').then(m => m.GrammarExamplesComponent),
    data: { title: 'Examples Library' },
  },
];
