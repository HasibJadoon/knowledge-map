import { Routes } from '@angular/router';
import { QURAN_CARDS } from './cards/quran.cards';
import { ARABIC_CARDS } from './cards/arabic.cards';
import { WORLDVIEW_CARDS } from './cards/worldview.cards';
import { WORKSPACE_CARDS } from './cards/workspace.cards';

const tableRoute = (card: (typeof QURAN_CARDS)[0]) => ({
  path: card.route,
  data: { card },
  loadComponent: () => import('./pages/hub-table/hub-table.component').then(m => m.HubTableComponent),
  title: `${card.title} - Hub`,
});

export const HUB_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/hub/hub.component').then(m => m.HubComponent),
    title: 'Hub - K-MAPS',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/hub-home/hub-home.component').then(m => m.HubHomeComponent),
        title: 'Hub - K-MAPS',
      },
      {
        path: 'quran',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'quran' },
            title: 'Quran - Hub',
          },
          ...QURAN_CARDS.map(tableRoute),
        ],
      },
      {
        path: 'arabic',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'arabic' },
            title: 'Arabic - Hub',
          },
          ...ARABIC_CARDS.map(tableRoute),
        ],
      },
      {
        path: 'worldview',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'worldview' },
            title: 'Worldview - Hub',
          },
          ...WORLDVIEW_CARDS.map(tableRoute),
        ],
      },
      {
        path: 'workspace',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'workspace' },
            title: 'Workspace - Hub',
          },
          ...WORKSPACE_CARDS.map(tableRoute),
        ],
      },
    ],
  },
];
