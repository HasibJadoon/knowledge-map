import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./worldview-lessons-page/worldview-lessons-page.component').then(m => m.WorldviewLessonsPageComponent),
    data: { title: 'Worldview Lessons' }
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./worldview-lesson-editor/worldview-lesson-editor.component').then(m => m.WorldviewLessonEditorComponent),
    data: { title: 'New Worldview Lesson' }
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./worldview-lesson-editor/worldview-lesson-editor.component').then(m => m.WorldviewLessonEditorComponent),
    data: { title: 'Edit Worldview Lesson' }
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./worldview-lesson-view/worldview-lesson-view.component').then(m => m.WorldviewLessonViewComponent),
    data: { title: 'Worldview Lesson' }
  }
];
