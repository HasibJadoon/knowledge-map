import { Routes } from '@angular/router';
import { QuranLessonEditorShellComponent } from './edit/quran-lesson-editor-shell.component';
import { QuranLessonStudyShellComponent } from './study/quran-lesson-study-shell.component';
import { QuranLessonViewShellComponent } from './view/quran-lesson-view-shell.component';

export const quranLessonRoutes: Routes = [
  {
    path: '',
    children: [
      { path: ':id/view', component: QuranLessonViewShellComponent },
      { path: ':id/edit', component: QuranLessonEditorShellComponent },
      { path: ':id/study', component: QuranLessonStudyShellComponent }
    ]
  }
];
