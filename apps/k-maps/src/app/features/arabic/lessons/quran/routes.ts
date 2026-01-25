import { Routes } from '@angular/router';
import { LessonCreatorComponent } from './lesson/lesson-creator.component';
import { QuranLessonEditorComponent } from './edit/quran-lesson-editor.component';
import { QuranLessonStudyComponent } from './study/quran-lesson-study.component';
import { QuranLessonViewComponent } from './view/quran-lesson-view.component';
import { QuranSectionListComponent } from './sections/list/quran-section-list.component';
import { QuranSectionViewComponent } from './sections/view/quran-section-view.component';
import { QuranSectionEditComponent } from './sections/edit/quran-section-edit.component';
import { QuranSectionStudyComponent } from './sections/study/quran-section-study.component';

export const quranLessonRoutes: Routes = [
  {
    path: '',
    data: { title: 'Quran Lessons' },
    children: [
      {
        path: 'new',
        component: LessonCreatorComponent,
        data: { title: 'New Quran Lesson', lessonType: 'quran' },
      },
      { path: ':id/view', component: QuranLessonViewComponent, data: { title: 'Quran Lesson' } },
      { path: ':id/edit', component: QuranLessonEditorComponent, data: { title: 'Edit Quran Lesson' } },
      { path: ':id/study', component: QuranLessonStudyComponent, data: { title: 'Study Quran Lesson' } },
      {
        path: 'sections',
        children: [
          { path: '', component: QuranSectionListComponent },
          { path: 'view/:sectionId', component: QuranSectionViewComponent },
          { path: 'edit/:sectionId', component: QuranSectionEditComponent },
          { path: 'study/:sectionId', component: QuranSectionStudyComponent }
        ]
      }
    ]
  }
];
