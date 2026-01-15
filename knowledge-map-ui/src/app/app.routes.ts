import { Routes } from '@angular/router';
import { AuthGuard } from '../services/auth.guard';
import { RootRedirectGuard } from '../services/root-redirect.guard';

export const routes: Routes = [
  // 👇 Root entry decision
  {
    path: '',
    canActivate: [RootRedirectGuard],
    component: class EmptyComponent {}
  },

  // 🔓 Public login
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent),
  },

  // 🔐 Protected layout
  {
    path: '',
    loadComponent: () =>
      import('./layout').then(m => m.DefaultLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/routes').then(m => m.routes),
      },
      {
        path: 'roots',
        loadChildren: () =>
          import('./arabic/roots/routes').then(m => m.routes),
      },
      {
        path: 'arabic',
        loadChildren: () =>
          import('./arabic/routes').then(m => m.routes),
      },
      {
        path: 'worldview',
        loadChildren: () =>
          import('./worldview/routes').then(m => m.routes),
      },
      {
        path: 'crossref',
        loadChildren: () =>
          import('./crossref/routes').then(m => m.routes),
      },
      {
        path: 'podcast',
        loadChildren: () =>
          import('./podcast/routes').then(m => m.routes),
      },
      {
        path: 'planner',
        loadChildren: () =>
          import('./planner/routes').then(m => m.routes),
      }
    ]
  },

  { path: '**', redirectTo: '' }
];




// import { Routes } from '@angular/router';

// export const routes: Routes = [
//   {
//     path: '',
//     redirectTo: 'dashboard',
//     pathMatch: 'full'
//   },
//   {
//     path: '',
//     loadComponent: () => import('./layout').then(m => m.DefaultLayoutComponent),
//     data: {
//       title: 'Home'
//     },
//     children: [
//       {
//         path: 'dashboard',
//         loadChildren: () => import('./quran-app/dashboard/routes').then((m) => m.routes)
//       },
//       {
//         path: 'theme',
//         loadChildren: () => import('./views/theme/routes').then((m) => m.routes)
//       },
//       {
//         path: 'base',
//         loadChildren: () => import('./views/base/routes').then((m) => m.routes)
//       },
//       {
//         path: 'buttons',
//         loadChildren: () => import('./views/buttons/routes').then((m) => m.routes)
//       },
//       {
//         path: 'forms',
//         loadChildren: () => import('./views/forms/routes').then((m) => m.routes)
//       },
//       {
//         path: 'icons',
//         loadChildren: () => import('./views/icons/routes').then((m) => m.routes)
//       },
//       {
//         path: 'notifications',
//         loadChildren: () => import('./views/notifications/routes').then((m) => m.routes)
//       },
//       {
//         path: 'widgets',
//         loadChildren: () => import('./views/widgets/routes').then((m) => m.routes)
//       },
//       {
//         path: 'charts',
//         loadChildren: () => import('./views/charts/routes').then((m) => m.routes)
//       },
//       {
//         path: 'pages',
//         loadChildren: () => import('./views/pages/routes').then((m) => m.routes)
//       }
//     ]
//   },
//   {
//     path: '404',
//     loadComponent: () => import('./views/pages/page404/page404.component').then(m => m.Page404Component),
//     data: {
//       title: 'Page 404'
//     }
//   },
//   {
//     path: '500',
//     loadComponent: () => import('./views/pages/page500/page500.component').then(m => m.Page500Component),
//     data: {
//       title: 'Page 500'
//     }
//   },
//   {
//     path: 'login',
//     loadComponent: () => import('./views/pages/login/login.component').then(m => m.LoginComponent),
//     data: {
//       title: 'Login Page'
//     }
//   },
//   {
//     path: 'register',
//     loadComponent: () => import('./views/pages/register/register.component').then(m => m.RegisterComponent),
//     data: {
//       title: 'Register Page'
//     }
//   },
//   { path: '**', redirectTo: 'dashboard' }
// ];
