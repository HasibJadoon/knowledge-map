import { Routes } from '@angular/router';

export const PLANNER_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'Planner — K-MAPS',
  },
  {
    path: 'calendar',
    loadComponent: () => import('./pages/calendar/calendar.component').then((m) => m.CalendarComponent),
    title: 'Calendar — Planner',
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
    path: 'goals',
    loadComponent: () => import('./pages/goals/goals.component').then((m) => m.GoalsComponent),
    title: 'Goals — Planner',
  },
  {
    path: 'review',
    loadComponent: () => import('./pages/review/review.component').then((m) => m.ReviewComponent),
    title: 'Review — Planner',
  },
  {
    path: 'capture',
    loadComponent: () => import('./pages/capture/capture.component').then((m) => m.CaptureComponent),
    title: 'Capture — Planner',
  },
];
