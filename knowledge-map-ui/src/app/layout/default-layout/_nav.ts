import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cilHome' }
  },

  {
    title: true,
    name: 'Arabic'
  },
  {
    name: 'Lessons',
    url: '/arabic/lessons',
    iconComponent: { name: 'cilBookmark' },
  },
  {
    name: 'Roots',
    url: '/arabic/roots',
    iconComponent: { name: 'cilList' },
  },
  {
    name: 'Lexicon',
    url: '/arabic/lexicon',
    iconComponent: { name: 'cilDescription' },
  },
  {
    name: 'Memory',
    url: '/arabic/memory',
    iconComponent: { name: 'cilTask' },
  },

  {
    title: true,
    name: 'Theme'
  },
  // ...rest unchanged
];
