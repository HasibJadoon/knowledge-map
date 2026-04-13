import {
  albumsOutline,
  bookOutline,
  calendarOutline,
  chatbubblesOutline,
  documentTextOutline,
  globeOutline,
  leafOutline,
  libraryOutline,
  micOutline,
  pricetagsOutline,
  settingsOutline,
  shuffleOutline,
  sparklesOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';

export type DashboardTone = 'sand' | 'sky' | 'mint';

export type DashboardMenuLink = {
  title: string;
  subtitle: string;
  icon: string;
  route: string[];
};

export type DashboardMenuSection = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  tone: DashboardTone;
  items: DashboardMenuLink[];
};

export const DASHBOARD_MENU_SECTIONS: ReadonlyArray<DashboardMenuSection> = [
  {
    key: 'arabic',
    title: 'Arabic',
    subtitle: 'Core Study Tools',
    icon: bookOutline,
    tone: 'sand',
    items: [
      { title: 'Lessons', subtitle: 'Arabic', icon: bookOutline, route: ['/arabic', 'lessons'] },
      { title: 'Roots', subtitle: 'Arabic', icon: leafOutline, route: ['/arabic', 'roots'] },
      { title: 'Lexicon', subtitle: 'Arabic', icon: libraryOutline, route: ['/arabic', 'lexicon'] },
      { title: 'Tokens', subtitle: 'Arabic', icon: swapHorizontalOutline, route: ['/arabic', 'tokens'] },
      { title: 'Memory', subtitle: 'Arabic', icon: sparklesOutline, route: ['/arabic', 'memory'] },
    ],
  },
  {
    key: 'quran',
    title: 'Quran',
    subtitle: 'Reader Space',
    icon: bookOutline,
    tone: 'sand',
    items: [
      { title: 'Reader', subtitle: 'Quran', icon: bookOutline, route: ['/quran'] },
    ],
  },
  {
    key: 'worldview',
    title: 'Worldview',
    subtitle: 'Reading Workflow',
    icon: globeOutline,
    tone: 'mint',
    items: [
      { title: 'Library', subtitle: 'K-Maps', icon: globeOutline, route: ['/worldview', 'library'] },
    ],
  },
  {
    key: 'discourse',
    title: 'Discourse',
    subtitle: 'Concepts And Flows',
    icon: chatbubblesOutline,
    tone: 'sky',
    items: [
      { title: 'Quranic', subtitle: 'Discourse', icon: chatbubblesOutline, route: ['/discourse', 'quranic'] },
      { title: 'Concepts', subtitle: 'Discourse', icon: pricetagsOutline, route: ['/discourse', 'wv_concepts'] },
      { title: 'Flows', subtitle: 'Discourse', icon: shuffleOutline, route: ['/discourse', 'flows'] },
    ],
  },
  {
    key: 'podcast',
    title: 'Podcast',
    subtitle: 'Audio Review And Ideas',
    icon: micOutline,
    tone: 'mint',
    items: [
      { title: 'Episodes', subtitle: 'Podcast', icon: micOutline, route: ['/podcast'] },
      { title: 'Topics', subtitle: 'Brainstorm', icon: albumsOutline, route: ['/brainstorm', 'topics'] },
    ],
  },
  {
    key: 'planner',
    title: 'Planner',
    subtitle: 'Weekly Workspace',
    icon: calendarOutline,
    tone: 'sand',
    items: [
      { title: 'Weekly Plan', subtitle: 'Planner', icon: calendarOutline, route: ['/planner'] },
    ],
  },
  {
    key: 'notes',
    title: 'Notes',
    subtitle: 'Capture And Review',
    icon: documentTextOutline,
    tone: 'sky',
    items: [
      { title: 'Inbox', subtitle: 'Notes', icon: documentTextOutline, route: ['/notes', 'inbox'] },
    ],
  },
  {
    key: 'settings',
    title: 'Settings',
    subtitle: 'Preferences',
    icon: settingsOutline,
    tone: 'sand',
    items: [
      { title: 'Open Settings', subtitle: 'Profile', icon: settingsOutline, route: ['/settings'] },
    ],
  },
];

export function findDashboardMenuSection(sectionKey: string | null): DashboardMenuSection | null {
  if (!sectionKey) {
    return null;
  }

  const normalized = sectionKey.trim().toLowerCase();
  const resolvedKey = normalized === 'brainstorm' ? 'podcast' : normalized;
  return DASHBOARD_MENU_SECTIONS.find((section) => section.key === resolvedKey) ?? null;
}
