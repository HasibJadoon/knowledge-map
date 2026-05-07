import { Component, ElementRef, ViewChild, AfterViewInit, computed, signal } from '@angular/core';
import gsap from 'gsap';

interface UloomSource {
  title: string;
  description: string;
  topicCount: string;
  icon: string;
}

const ULOOM_SOURCES: UloomSource[] = [
  {
    title: 'أسباب النزول',
    description: 'يعني ببيان الأسباب التي نزلت من أجلها الآيات والأحكام.',
    topicCount: '184 موضوع',
    icon: '☰',
  },
  {
    title: 'علم التجويد',
    description: 'يعني بأحكام النطق الصحيح لكلمات القرآن الكريم.',
    topicCount: '98 موضوع',
    icon: '◨',
  },
  {
    title: 'علم القراءات',
    description: 'يعني بكيفيات أداء كلمات القرآن واختلاف الألفاظ الواردة.',
    topicCount: '126 موضوع',
    icon: '◫',
  },
  {
    title: 'الناسخ والمنسوخ',
    description: 'يعني ببيان الآيات التي نسخت حكمًا متقدمًا عليها.',
    topicCount: '76 موضوع',
    icon: '⧖',
  },
  {
    title: 'المكي والمدني',
    description: 'يعني بتمييز السور والآيات المكية والمدنية وخصائص كل منهما.',
    topicCount: '112 موضوع',
    icon: '◑',
  },
  {
    title: 'المحكم والمتشابه',
    description: 'يعني ببيان الآيات المحكمة التي لا تأويل لها، والمتشابهة التي تحتمل التأويل.',
    topicCount: '93 موضوع',
    icon: '∞',
  },
];

@Component({
  selector: 'km-uloom-page',
  standalone: true,
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
})
export class UloomPageComponent implements AfterViewInit {
  @ViewChild('grid') grid?: ElementRef<HTMLElement>;

  readonly searchTerm = signal('');

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return ULOOM_SOURCES;
    return ULOOM_SOURCES.filter((s) =>
      `${s.title} ${s.description}`.toLowerCase().includes(q),
    );
  });

  ngAfterViewInit(): void {
    const cards = Array.from(
      this.grid?.nativeElement.querySelectorAll<HTMLElement>('.source-card') ?? [],
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.055, ease: 'power3.out', delay: 0.08, clearProps: 'transform' },
    );
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
  }
}
