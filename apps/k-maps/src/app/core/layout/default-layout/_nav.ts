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
    name: 'Worldview'
  },
  {
    name: 'Lessons',
    url: '/worldview/lessons',
    iconComponent: { name: 'cilMap' },
  },

  {
    title: true,
    name: 'Crossref'
  },
  {
    name: 'Cross References',
    url: '/crossref',
    iconComponent: { name: 'cilShareAll' },
  },

  {
    title: true,
    name: 'Podcast'
  },
  {
    name: 'Episodes',
    url: '/podcast',
    iconComponent: { name: 'cilMediaPlay' },
  },

  {
    title: true,
    name: 'Planner'
  },
  {
    name: 'Weekly Plan',
    url: '/planner',
    iconComponent: { name: 'cilCalendar' },
  },
];
