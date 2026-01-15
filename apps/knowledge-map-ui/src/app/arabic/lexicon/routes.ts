import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./roots-desk/roots-desk.component').then(m => m.RootsDeskComponent),
    data: { title: 'Roots Desk' }
  },
  {
    path: 'idioms',
    loadComponent: () =>
      import('./idioms/idioms.component').then(m => m.IdiomsComponent),
    data: { title: 'Idioms' }
  },
  {
    path: 'poetry',
    loadComponent: () =>
      import('./poetry/poetry.component').then(m => m.PoetryComponent),
    data: { title: 'Poetry' }
  },
  {
    path: 'key-info',
    loadComponent: () =>
      import('./key-info/key-info.component').then(m => m.KeyInfoComponent),
    data: { title: 'Key Info' }
  },
  {
    path: 'key-concepts',
    loadComponent: () =>
      import('./key-concepts/key-concepts.component').then(m => m.KeyConceptsComponent),
    data: { title: 'Key Concepts' }
  }
];
