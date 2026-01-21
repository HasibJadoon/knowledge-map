import { Routes } from '@angular/router';
import { LiteratureLessonEditorShellComponent } from './edit/literature-lesson-editor-shell.component';
import { LiteratureLessonStudyShellComponent } from './study/literature-lesson-study-shell.component';
import { LiteratureLessonViewShellComponent } from './view/literature-lesson-view-shell.component';

export const literatureLessonRoutes: Routes = [
  {
    path: '',
    children: [
      { path: ':id/view', component: LiteratureLessonViewShellComponent },
      { path: ':id/edit', component: LiteratureLessonEditorShellComponent },
      { path: ':id/study', component: LiteratureLessonStudyShellComponent }
    ]
  }
];
