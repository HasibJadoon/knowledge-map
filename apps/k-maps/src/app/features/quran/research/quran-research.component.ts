import { AfterViewInit, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import gsap from 'gsap';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';

type QuranResearchId = 'lexicon' | 'tafseer' | 'iraab';

interface QuranResearchSource {
  title: string;
  subtitle: string;
  meta: string;
  category: string;
  tag: string;
}

interface QuranResearchSection {
  id: QuranResearchId;
  label: string;
  labelAr: string;
  route: string;
  glyph: string;
  title: string;
  titleAr: string;
  searchPlaceholder: string;
  searchSeed: string;
  accent: 'gold' | 'teal' | 'violet';
  sources: QuranResearchSource[];
}

@Component({
  selector: 'km-quran-research',
  standalone: true,
  imports: [HomePlaneButtonComponent],
  templateUrl: './quran-research.component.html',
  styleUrl: './quran-research.component.scss',
})
export class QuranResearchComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('panel') panel?: ElementRef<HTMLElement>;
  @ViewChild('nav') nav?: ElementRef<HTMLElement>;

  readonly sections: QuranResearchSection[] = [
    {
      id: 'lexicon',
      label: 'Lexicon',
      labelAr: 'معاجم',
      route: '/quran/lexicon',
      glyph: 'ع',
      title: 'Lexicon',
      titleAr: 'معاجم',
      searchPlaceholder: 'Search root, lemma, or Arabic phrase',
      searchSeed: 'ن ب أ',
      accent: 'gold',
      sources: [
        { title: 'مفردات ألفاظ القرآن', subtitle: 'al-Raghib al-Isfahani', meta: 'Quran-focused lexical meanings', category: 'غريب ومعاني', tag: 'Raghib' },
        { title: 'مقاييس اللغة', subtitle: 'Ibn Faris', meta: 'Root sense and semantic field', category: 'أصول اللغة', tag: 'Root' },
        { title: 'لسان العرب', subtitle: 'Ibn Manzur', meta: 'Expanded classical lexicon', category: 'معاجم', tag: 'Lexicon' },
        { title: 'Quranic Morphology', subtitle: 'Forms and occurrences', meta: 'Attested forms by ayah', category: 'صرف', tag: 'AL' },
      ],
    },
    {
      id: 'tafseer',
      label: 'Tafseer',
      labelAr: 'تفسير',
      route: '/quran/tafseer',
      glyph: '◫',
      title: 'Tafseer',
      titleAr: 'تفسير',
      searchPlaceholder: 'Search tafseer titles, authors, or topics',
      searchSeed: 'فتح البيان',
      accent: 'teal',
      sources: [
        { title: 'جامع البيان', subtitle: 'Ibn Jarir al-Tabari', meta: 'Primary classical tafsir', category: 'أمهات', tag: '31 vols' },
        { title: 'تفسير القرآن العظيم', subtitle: 'Ibn Kathir', meta: 'Narration-led tafsir path', category: 'أمهات', tag: '19 vols' },
        { title: 'فتح البيان', subtitle: 'Siddiq Hasan Khan', meta: 'General tafsir collection', category: 'عامّة', tag: '12 vols' },
        { title: 'التحرير والتنوير', subtitle: 'Ibn Ashur', meta: 'Language, rhetoric, and maqasid', category: 'لغة وبلاغة', tag: '24 vols' },
      ],
    },
    {
      id: 'iraab',
      label: 'Iraab',
      labelAr: 'إعراب',
      route: '/quran/iraab',
      glyph: 'إ',
      title: 'Iraab',
      titleAr: 'إعراب',
      searchPlaceholder: 'Search iraab, syntax, term, or ayah',
      searchSeed: 'فاعل',
      accent: 'violet',
      sources: [
        { title: 'إعراب القرآن وبيانه', subtitle: 'Muhyi al-Din Darwish', meta: 'Grammar and bayan notes', category: 'إعراب ولغة', tag: 'Iraab' },
        { title: 'الجدول في إعراب القرآن', subtitle: 'Mahmud Safi', meta: 'Structured grammatical parsing', category: 'إعراب', tag: 'Syntax' },
        { title: 'الدر المصون', subtitle: 'al-Samin al-Halabi', meta: 'Deep language and grammar analysis', category: 'لغة', tag: 'Nahw' },
        { title: 'Quran sentence structure', subtitle: 'K-maps study graph', meta: 'Ayah-level syntactic relations', category: 'تركيب', tag: 'Graph' },
      ],
    },
  ];

  readonly selectedId = signal<QuranResearchId>(this.initialSection());
  readonly searchTerm = signal(this.initialSelected().searchSeed);
  readonly selected = computed(() => this.sections.find((section) => section.id === this.selectedId()) ?? this.sections[0]);
  readonly filteredSources = computed(() => {
    const query = this.normalize(this.searchTerm());
    const sources = this.selected().sources;
    if (!query) return sources;
    return sources.filter((source) => this.normalize(`${source.title} ${source.subtitle} ${source.meta} ${source.category} ${source.tag}`).includes(query));
  });

  ngAfterViewInit(): void {
    const navItems = Array.from(this.nav?.nativeElement.querySelectorAll<HTMLElement>('.research-nav__item') ?? []);
    if (navItems.length) {
      gsap.fromTo(navItems, { opacity: 0, x: 28 }, { opacity: 1, x: 0, duration: 0.48, stagger: 0.06, ease: 'expo.out' });
    }
    if (this.panel?.nativeElement) this.animatePanel(this.panel.nativeElement);
  }

  selectSection(section: QuranResearchSection): void {
    this.selectedId.set(section.id);
    this.searchTerm.set(section.searchSeed);
    this.router.navigateByUrl(section.route);
    window.requestAnimationFrame(() => {
      if (this.panel?.nativeElement) this.animatePanel(this.panel.nativeElement);
    });
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
  }

  back(): void {
    this.router.navigateByUrl('/quran');
  }

  private animatePanel(panel: HTMLElement): void {
    const rows = Array.from(panel.querySelectorAll<HTMLElement>('.source-row'));
    gsap.killTweensOf([panel, ...rows]);
    gsap.fromTo(
      panel,
      { opacity: 0, x: 64, clipPath: 'inset(0 0 0 94% round 24px)' },
      { opacity: 1, x: 0, clipPath: 'inset(0 0 0 0% round 24px)', duration: 0.62, ease: 'expo.out', clearProps: 'transform,clip-path' },
    );
    if (rows.length) {
      gsap.fromTo(rows, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.34, delay: 0.14, stagger: 0.035, ease: 'power2.out', clearProps: 'transform' });
    }
  }

  private initialSelected(): QuranResearchSection {
    return this.sections.find((section) => section.id === this.initialSection()) ?? this.sections[0];
  }

  private initialSection(): QuranResearchId {
    const section = this.route.snapshot.data['section'];
    return section === 'tafseer' || section === 'iraab' || section === 'lexicon' ? section : 'lexicon';
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
