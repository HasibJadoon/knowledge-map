import { Component, ElementRef, ViewChild, AfterViewInit, computed, signal } from '@angular/core';
import gsap from 'gsap';

interface LexiconSource {
  title: string;
  scholar: string;
  description: string;
  entryCount: string;
  icon: string;
}

const LEXICON_SOURCES: LexiconSource[] = [
  {
    title: 'لسان العرب',
    scholar: 'ابن منظور الأنصاري',
    description: 'أشهر معجم عربي شامل للألفاظ والتراكيب والحكم والأمثال والنحو.',
    entryCount: '80,000 مادة',
    icon: '◫',
  },
  {
    title: 'مفردات ألفاظ القرآن',
    scholar: 'الراغب الأصفهاني',
    description: 'معجم يُفسّر ألفاظ القرآن الكريم ويُبيّن دلالاتها اللغوية الدقيقة.',
    entryCount: '1,500 مادة',
    icon: '◨',
  },
  {
    title: 'الصحاح تاج اللغة وصحاح العربية',
    scholar: 'الجوهري',
    description: 'معجم لغوي يعتمد على ترتيب الجذور والأصول اللغوية.',
    entryCount: '5,000 مادة',
    icon: '◧',
  },
  {
    title: 'القاموس المحيط',
    scholar: 'الفيروزآبادي',
    description: 'معجم واسع يشرح الألفاظ ويُبيّن معانيها واشتقاقاتها.',
    entryCount: '20,000 مادة',
    icon: '◎',
  },
  {
    title: 'مقاييس اللغة',
    scholar: 'ابن فارس',
    description: 'معجم يعتمد على تحليل الجذور وإرجاع المعاني إلى أصولها الثلاثية.',
    entryCount: '2,000 مادة',
    icon: '△',
  },
  {
    title: 'بصائر ذوي التمييز في لطائف الكتاب العزيز',
    scholar: 'مجد الدين الفيروزآبادي',
    description: 'معجم لغوي يوضح غريب القرآن الكريم وشرح معاني ألفاظه.',
    entryCount: '4,500 مادة',
    icon: '◇',
  },
];

@Component({
  selector: 'km-lexicon-page',
  standalone: true,
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
})
export class LexiconPageComponent implements AfterViewInit {
  @ViewChild('grid') grid?: ElementRef<HTMLElement>;

  readonly searchTerm = signal('');

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return LEXICON_SOURCES;
    return LEXICON_SOURCES.filter((s) =>
      `${s.title} ${s.scholar} ${s.description}`.toLowerCase().includes(q),
    );
  });

  ngAfterViewInit(): void {
    this.animateIn();
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
  }

  private animateIn(): void {
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
}
