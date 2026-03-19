import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    title: 'K-MAPS — Knowledge Command Center',
  },
  {
    path: 'hub',
    loadComponent: () =>
      import('./features/hub/hub.component').then((m) => m.HubComponent),
    title: 'Hub — K-MAPS',
  },
  {
    path: 'arabic',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/arabic/arabic-home/arabic-home.component').then(
            (m) => m.ArabicHomeComponent
          ),
        title: 'Arabic — K-MAPS',
      },
      {
        path: 'quran',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/arabic/quran/quran-landing/quran-landing.component').then(
                (m) => m.QuranLandingComponent
              ),
            title: 'Quran — K-MAPS',
          },
          {
            path: 'data/text/:surahId',
            loadComponent: () =>
              import('./features/arabic/quran/text/quran-text.component').then(
                (m) => m.QuranTextComponent
              ),
            title: 'Surah Text — K-MAPS',
          },
          {
            path: 'lessons/:lessonId/study',
            loadComponent: () =>
              import('./features/arabic/quran/lessons/study/lesson-study.component').then(
                (m) => m.LessonStudyComponent
              ),
            title: 'Study — K-MAPS',
          },
          {
            path: 'lessons/:lessonId/edit',
            loadComponent: () =>
              import('./features/arabic/quran/lessons/edit/lesson-edit.component').then(
                (m) => m.LessonEditComponent
              ),
            title: 'Edit Lesson — K-MAPS',
          },
          {
            path: ':surahId',
            loadComponent: () =>
              import('./features/arabic/quran/surah/surah.component').then(
                (m) => m.SurahComponent
              ),
            title: 'Surah — K-MAPS',
          },
        ],
      },
    ],
  },
  {
    path: 'worldview',
    loadComponent: () =>
      import('./features/worldview/worldview.component').then((m) => m.WorldviewComponent),
    title: 'Worldview — K-MAPS',
  },
  {
    path: 'planner',
    loadComponent: () =>
      import('./features/planner/planner.component').then((m) => m.PlannerComponent),
    title: 'Planner — K-MAPS',
  },
  {
    path: 'content',
    loadComponent: () =>
      import('./features/content/content.component').then((m) => m.ContentComponent),
    title: 'Content — K-MAPS',
  },
  {
    path: 'workspace',
    loadComponent: () =>
      import('./features/workspace/workspace.component').then((m) => m.WorkspaceComponent),
    title: 'Workspace — K-MAPS',
  },
  {
    path: '**',
    redirectTo: 'landing',
  },
];
