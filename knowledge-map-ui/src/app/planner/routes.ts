import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./weekly-plan-page/weekly-plan-page.component').then(m => m.WeeklyPlanPageComponent),
    data: { title: 'Weekly Plans' }
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./weekly-plan-editor/weekly-plan-editor.component').then(m => m.WeeklyPlanEditorComponent),
    data: { title: 'New Weekly Plan' }
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./weekly-plan-editor/weekly-plan-editor.component').then(m => m.WeeklyPlanEditorComponent),
    data: { title: 'Weekly Plan' }
  }
];
