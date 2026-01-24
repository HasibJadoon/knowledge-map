import { Routes } from '@angular/router';
import { LiteratureLessonCreatorComponent } from './new/literature-lesson-creator.component';
import { LiteratureLessonEditorShellComponent } from './edit/literature-lesson-editor-shell.component';
import { LiteratureLessonStudyShellComponent } from './study/literature-lesson-study-shell.component';
import { LiteratureLessonViewShellComponent } from './view/literature-lesson-view-shell.component';

export const literatureLessonRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'new', component: LiteratureLessonCreatorComponent, data: { title: 'New Literature Lesson' } },
      { path: ':id/view', component: LiteratureLessonViewShellComponent },
      { path: ':id/edit', component: LiteratureLessonEditorShellComponent },
      { path: ':id/study', component: LiteratureLessonStudyShellComponent }
    ]
  }
];
