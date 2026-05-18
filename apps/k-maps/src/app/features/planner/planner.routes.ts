import { Routes } from '@angular/router';

export const PLANNER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shell/planner-shell.component').then((m) => m.PlannerShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        path: 'today',
        loadComponent: () => import('./pages/today/today.component').then((m) => m.TodayComponent),
        title: 'Today — Planner',
      },
      {
        path: 'plans',
        loadComponent: () => import('./pages/plans/plans.component').then((m) => m.PlansComponent),
        title: 'Plans — Planner',
      },
      {
        path: 'plans/:id',
        loadComponent: () => import('./pages/plan-detail/plan-detail.component').then((m) => m.PlanDetailComponent),
        title: 'Plan — Planner',
      },
      {
        path: 'tasks/:id',
        loadComponent: () => import('./pages/task-detail/task-detail.component').then((m) => m.TaskDetailComponent),
        title: 'Task — Planner',
      },
      {
        path: 'capture',
        loadComponent: () => import('./pages/capture/capture.component').then((m) => m.CaptureComponent),
        title: 'Capture — Planner',
      },
    ],
  },
];
