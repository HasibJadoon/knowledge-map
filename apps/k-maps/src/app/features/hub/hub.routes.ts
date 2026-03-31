import { Routes } from '@angular/router';
import { QURAN_CARDS } from './cards/quran.cards';
import { ARABIC_CARDS } from './cards/arabic.cards';
import { WORLDVIEW_CARDS } from './cards/worldview.cards';
import { WORKSPACE_CARDS } from './cards/workspace.cards';

const tableRoute = (card: (typeof QURAN_CARDS)[0]) => ({
  path: card.route,
  data: { card },
  loadComponent: () => import('./hub-table/hub-table.component').then(m => m.HubTableComponent),
  title: `${card.title} — Hub`,
});

export const HUB_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./hub-shell/hub.component').then(m => m.HubComponent),
    title: 'Hub — K-MAPS',
    children: [
      {
        path: '',
        loadComponent: () => import('./hub-home/hub-home.component').then(m => m.HubHomeComponent),
        title: 'Hub — K-MAPS',
      },

      // ── Quran section ──────────────────────────────────────
      {
        path: 'quran',
        children: [
          {
            path: '',
            loadComponent: () => import('./hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'quran' },
            title: 'Quran — Hub',
          },
          ...QURAN_CARDS.map(tableRoute),
        ],
      },

      // ── Arabic section ──────────────────────────────────────
      {
        path: 'arabic',
        children: [
          {
            path: '',
            loadComponent: () => import('./hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'arabic' },
            title: 'Arabic — Hub',
          },
          ...ARABIC_CARDS.map(tableRoute),
        ],
      },

      // ── Worldview section ───────────────────────────────────
      {
        path: 'worldview',
        children: [
          {
            path: '',
            loadComponent: () => import('./hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'worldview' },
            title: 'Worldview — Hub',
          },
          ...WORLDVIEW_CARDS.map(tableRoute),
        ],
      },

      // ── Workspace section ───────────────────────────────────
      {
        path: 'workspace',
        children: [
          {
            path: '',
            loadComponent: () => import('./hub-section/hub-section.component').then(m => m.HubSectionComponent),
            data: { section: 'workspace' },
            title: 'Workspace — Hub',
          },
          ...WORKSPACE_CARDS.map(tableRoute),
        ],
      },
    ],
  },
];
