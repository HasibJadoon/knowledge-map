import { Routes } from '@angular/router';

import { ArLessonsPageComponent } from '../lessons-list/ar-lessons-page/ar-lessons-page.component';
import { QuranLessonEditorComponent } from './lessons/edit/quran-lesson-editor.component';
import { QuranLessonStudyComponent } from './lessons/study/quran-lesson-study.component';
import { QuranLessonViewComponent } from './lessons/view/quran-lesson-view.component';
import { QuranSectionListComponent } from './lessons/sections/list/quran-section-list.component';
import { QuranSectionViewComponent } from './lessons/sections/view/quran-section-view.component';
import { QuranSectionEditComponent } from './lessons/sections/edit/quran-section-edit.component';
import { QuranSectionStudyComponent } from './lessons/sections/study/quran-section-study.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./menu/quran-menu.component').then(m => m.QuranMenuComponent),
    data: { title: 'Quran' },
  },
  {
    path: 'data',
    children: [
      {
        path: '',
        loadComponent: () => import('./data/menu/quran-data-menu.component').then(m => m.QuranDataMenuComponent),
        data: { title: 'Quran Data' },
      },
      {
        path: 'text',
        loadComponent: () => import('./data/text/quran-text.component').then(m => m.QuranTextComponent),
        data: { title: 'Quran Text' },
      },
      {
        path: 'lemmas',
        loadComponent: () => import('./data/lemmas/quran-lemmas.component').then(m => m.QuranLemmasComponent),
        data: { title: 'Quran Lemmas' },
      },
      {
        path: 'lemma-locations',
        loadComponent: () =>
          import('./data/lemma-locations/quran-lemma-locations.component').then(m => m.QuranLemmaLocationsComponent),
        data: { title: 'Lemma Locations' },
      },
    ],
  },
  {
    path: 'lessons',
    data: { title: 'Quran Lessons' },
    children: [
      {
        path: '',
        component: ArLessonsPageComponent,
        data: { title: 'Quran Lessons', lessonType: 'quran', lockLessonType: true },
      },
      {
        path: 'new',
        component: QuranLessonEditorComponent,
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
          { path: 'study/:sectionId', component: QuranSectionStudyComponent },
        ],
      },
    ],
  },
];
