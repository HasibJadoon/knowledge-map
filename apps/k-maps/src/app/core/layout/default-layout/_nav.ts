import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cilHome' }
  },
  {
    name: 'Arabic',
    iconComponent: { name: 'cilBookmark' },
    children: [
      {
        name: 'Lessons',
        url: '/arabic/lessons'
      },
      {
        name: 'Roots',
        url: '/arabic/roots'
      },
      {
        name: 'Lexicon',
        url: '/arabic/lexicon'
      },
      {
        name: 'Memory',
        url: '/arabic/memory'
      }
    ]
  },
  {
    name: 'Worldview',
    iconComponent: { name: 'cilMap' },
    children: [
      {
        name: 'Lessons',
        url: '/worldview/lessons'
      }
    ]
  },
  {
    name: 'Crossref',
    iconComponent: { name: 'cilShareAll' },
    children: [
      {
        name: 'Cross References',
        url: '/crossref'
      }
    ]
  },
  {
    name: 'Podcast',
    iconComponent: { name: 'cilMediaPlay' },
    children: [
      {
        name: 'Episodes',
        url: '/podcast'
      }
    ]
  },
  {
    name: 'Planner',
    iconComponent: { name: 'cilCalendar' },
    children: [
      {
        name: 'Weekly Plan',
        url: '/planner'
      }
    ]
  }
];
