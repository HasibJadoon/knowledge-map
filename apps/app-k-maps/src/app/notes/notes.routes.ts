import { Routes } from '@angular/router';

export const NOTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inbox/inbox.page').then((m) => m.InboxPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'draft',
      },
      {
        path: 'inbox',
        pathMatch: 'full',
        redirectTo: 'draft',
      },
      {
        path: 'draft',
        loadComponent: () => import('./pages/tabs/notes-draft-tab.page').then((m) => m.NotesDraftTabPage),
      },
      {
        path: 'flag',
        loadComponent: () => import('./pages/tabs/notes-flag-tab.page').then((m) => m.NotesFlagTabPage),
      },
      {
        path: 'published',
        loadComponent: () => import('./pages/tabs/notes-published-tab.page').then((m) => m.NotesPublishedTabPage),
      },
    ],
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/editor/editor.page').then((m) => m.EditorPage),
  },
];
