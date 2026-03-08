import { Routes } from '@angular/router';

export const BRAINSTORM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./brainstorm-tabs.page').then((m) => m.BrainstormTabsPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'topics',
      },
      {
        path: 'topics',
        loadComponent: () =>
          import('./pages/topics/brainstorm-topics.page').then((m) => m.BrainstormTopicsPage),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/brainstorm-search.page').then((m) => m.BrainstormSearchPage),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/idea-edit/brainstorm-idea-edit.page').then((m) => m.BrainstormIdeaEditPage),
      },
      {
        path: 'topic/:topicId',
        loadComponent: () =>
          import('./pages/ideas/brainstorm-ideas.page').then((m) => m.BrainstormIdeasPage),
      },
      {
        path: 'topic/:topicId/idea/new',
        loadComponent: () =>
          import('./pages/idea-edit/brainstorm-idea-edit.page').then((m) => m.BrainstormIdeaEditPage),
      },
      {
        path: 'topic/:topicId/idea/:ideaId',
        loadComponent: () =>
          import('./pages/idea-edit/brainstorm-idea-edit.page').then((m) => m.BrainstormIdeaEditPage),
      },
    ],
  },
];
