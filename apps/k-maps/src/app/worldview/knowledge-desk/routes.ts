import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./concepts/concepts.component').then(m => m.ConceptsComponent),
    data: { title: 'Concepts' }
  },
  {
    path: 'thinkers',
    loadComponent: () =>
      import('./thinkers/thinkers.component').then(m => m.ThinkersComponent),
    data: { title: 'Thinkers' }
  },
  {
    path: 'sources',
    loadComponent: () =>
      import('./sources/sources.component').then(m => m.SourcesComponent),
    data: { title: 'Sources' }
  },
  {
    path: 'evidence',
    loadComponent: () =>
      import('./evidence/evidence.component').then(m => m.EvidenceComponent),
    data: { title: 'Evidence' }
  }
];
