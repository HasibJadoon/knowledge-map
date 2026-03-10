import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  bookOutline,
  calendarOutline,
  chatbubblesOutline,
  documentTextOutline,
  gitCompareOutline,
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

type DashboardMenuLink = {
  label: string;
  icon: string;
  route: string[];
};

type DashboardMenuSection = {
  title: string;
  subtitle: string;
  icon: string;
  tone: 'sand' | 'sky' | 'mint';
  items: DashboardMenuLink[];
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly sections: ReadonlyArray<DashboardMenuSection> = [
    {
      title: 'Arabic',
      subtitle: 'Core Study Tools',
      icon: bookOutline,
      tone: 'sand',
      items: [
        { label: 'Lessons', icon: bookOutline, route: ['/arabic', 'lessons'] },
        { label: 'Roots', icon: leafOutline, route: ['/arabic', 'roots'] },
        { label: 'Lexicon', icon: libraryOutline, route: ['/arabic', 'lexicon'] },
        { label: 'Tokens', icon: swapHorizontalOutline, route: ['/arabic', 'tokens'] },
        { label: 'Memory', icon: sparklesOutline, route: ['/arabic', 'memory'] },
      ],
    },
    {
      title: 'Quran',
      subtitle: 'Reader Space',
      icon: bookOutline,
      tone: 'sand',
      items: [
        { label: 'Open Reader', icon: bookOutline, route: ['/quran'] },
      ],
    },
    {
      title: 'Worldview',
      subtitle: 'Lesson Space',
      icon: globeOutline,
      tone: 'mint',
      items: [
        { label: 'Lessons', icon: globeOutline, route: ['/worldview', 'library'] },
      ],
    },
    {
      title: 'Discourse',
      subtitle: 'Concepts And Flows',
      icon: chatbubblesOutline,
      tone: 'sky',
      items: [
        { label: 'Quranic Discourse', icon: chatbubblesOutline, route: ['/discourse', 'quranic'] },
        { label: 'Concepts', icon: pricetagsOutline, route: ['/discourse', 'wv_concepts'] },
        { label: 'Flows', icon: shuffleOutline, route: ['/discourse', 'flows'] },
      ],
    },
    {
      title: 'Crossref',
      subtitle: 'Reference Links',
      icon: gitCompareOutline,
      tone: 'sky',
      items: [
        { label: 'Cross References', icon: gitCompareOutline, route: ['/crossref'] },
      ],
    },
    {
      title: 'Podcast',
      subtitle: 'Audio Review',
      icon: micOutline,
      tone: 'mint',
      items: [
        { label: 'Episodes', icon: micOutline, route: ['/podcast'] },
      ],
    },
    {
      title: 'Planner',
      subtitle: 'Weekly Workspace',
      icon: calendarOutline,
      tone: 'sand',
      items: [
        { label: 'Weekly Plan', icon: calendarOutline, route: ['/planner'] },
      ],
    },
    {
      title: 'Notes',
      subtitle: 'Capture And Review',
      icon: documentTextOutline,
      tone: 'sky',
      items: [
        { label: 'Inbox', icon: documentTextOutline, route: ['/notes', 'inbox'] },
      ],
    },
    {
      title: 'Settings',
      subtitle: 'Preferences',
      icon: settingsOutline,
      tone: 'sand',
      items: [
        { label: 'Open Settings', icon: settingsOutline, route: ['/settings'] },
      ],
    },
  ];

  trackBySection(_: number, section: DashboardMenuSection): string {
    return section.title;
  }

  trackByItem(_: number, item: DashboardMenuLink): string {
    return `${item.label}:${item.route.join('/')}`;
  }
}
