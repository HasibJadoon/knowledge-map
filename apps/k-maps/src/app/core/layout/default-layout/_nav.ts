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
        url: '/arabic/lessons',
        iconComponent: { name: 'cilBookmark' }
      },
      {
        name: 'Roots',
        url: '/arabic/roots',
        iconComponent: { name: 'cilList' }
      },
      {
        name: 'Lexicon',
        url: '/arabic/lexicon',
        iconComponent: { name: 'cilDescription' }
      },
      {
        name: 'Memory',
        url: '/arabic/memory',
        iconComponent: { name: 'cilTask' }
      }
    ]
  },
  {
    name: 'Worldview',
    iconComponent: { name: 'cilMap' },
    children: [
      {
        name: 'Lessons',
        url: '/worldview/lessons',
        iconComponent: { name: 'cilMap' }
      }
    ]
  },
  {
    name: 'Docs',
    url: '/docs',
    iconComponent: { name: 'cilBook' }
  },
  {
    name: 'Discourse',
    iconComponent: { name: 'cilSpeech' },
    children: [
      {
        name: "Qur'anic Discourse",
        url: '/discourse/quranic',
        iconComponent: { name: 'cilNotes' }
      },
      {
        name: 'Concepts',
        url: '/discourse/concepts',
        iconComponent: { name: 'cilTags' }
      },
      {
        name: 'Flows',
        url: '/discourse/flows',
        iconComponent: { name: 'cilShare' }
      }
    ]
  },
  {
    name: 'Admin',
    iconComponent: { name: 'cilUser' },
    children: [
      {
        name: 'Users',
        url: '/admin/users',
        iconComponent: { name: 'cilUser' }
      }
    ]
  },
  {
    name: 'Crossref',
    iconComponent: { name: 'cilShareAll' },
    children: [
      {
        name: 'Cross References',
        url: '/crossref',
        iconComponent: { name: 'cilShareAll' }
      }
    ]
  },
  {
    name: 'Podcast',
    iconComponent: { name: 'cilMediaPlay' },
    children: [
      {
        name: 'Episodes',
        url: '/podcast',
        iconComponent: { name: 'cilMediaPlay' }
      }
    ]
  },
  {
    name: 'Planner',
    iconComponent: { name: 'cilCalendar' },
    children: [
      {
        name: 'Weekly Plan',
        url: '/planner',
        iconComponent: { name: 'cilCalendar' }
      }
    ]
  }
];
