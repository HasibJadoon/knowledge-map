import { Component, ElementRef, ViewChild, AfterViewInit, computed, signal } from '@angular/core';
import gsap from 'gsap';

interface TafseerSource {
  title: string;
  scholar: string;
  description: string;
  icon: string;
}

const TAFSEER_SOURCES: TafseerSource[] = [
  {
    title: 'تفسير الطبري',
    scholar: 'محمد بن جرير الطبري',
    description: 'أوّل تفسير جامع يعتمد على جمع الآثار عن الصحابة والتابعين بأسانيدها.',
    icon: '◫',
  },
  {
    title: 'تفسير ابن كثير',
    scholar: 'إسماعيل بن كثير الدمشقي',
    description: 'تفسير جامع يعتمد على القرآن والسنة وأقوال الصحابة والتابعين.',
    icon: '◨',
  },
  {
    title: 'تفسير القرطبي',
    scholar: 'محمد بن أحمد القرطبي',
    description: 'تفسير فقهي جامع يجمع بين المعاني والأحكام والاستنباط.',
    icon: '⊓',
  },
  {
    title: 'تفسير السعدي',
    scholar: 'عبد الرحمن بن ناصر السعدي',
    description: 'تفسير ميسّر يعتمد على بيان المعاني بأسلوب سهل ومختصر.',
    icon: '≡',
  },
  {
    title: 'تفسير الألوسي',
    scholar: 'محمود بن عبد الله الألوسي',
    description: 'تفسير شامل لغوي، فقهي، بلاغي مع ذكر الخلافات والترجيحات.',
    icon: 'Π',
  },
  {
    title: 'تفسير البغوي',
    scholar: 'الحسين بن مسعود البغوي',
    description: 'تفسير يعتمد على الروايات مع العناية بإعراب القرآن وبيان معانيه.',
    icon: '◧',
  },
];

@Component({
  selector: 'km-tafseer-page',
  standalone: true,
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
})
export class TafseerPageComponent implements AfterViewInit {
  @ViewChild('grid') grid?: ElementRef<HTMLElement>;

  readonly searchTerm = signal('');

  readonly filteredSources = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return TAFSEER_SOURCES;
    return TAFSEER_SOURCES.filter((s) =>
      `${s.title} ${s.scholar} ${s.description}`.toLowerCase().includes(q),
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
