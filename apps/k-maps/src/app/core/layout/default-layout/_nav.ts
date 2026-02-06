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
    url: '/arabic'
  },
  {
    name: 'Worldview',
    iconComponent: { name: 'cilMap' },
    url: '/worldview'
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
        url: '/discourse/wv_concepts',
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
    url: '/crossref'
  },
  {
    name: 'Podcast',
    iconComponent: { name: 'cilMediaPlay' },
    url: '/podcast'
  },
  {
    name: 'Planner',
    iconComponent: { name: 'cilCalendar' },
    url: '/planner'
  }
];
