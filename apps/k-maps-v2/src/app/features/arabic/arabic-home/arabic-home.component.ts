import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import gsap from 'gsap';

interface ArabicSection {
  label: string;
  arabicLabel: string;
  desc: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'km-arabic-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './arabic-home.component.html',
  styleUrl: './arabic-home.component.scss',
})
export class ArabicHomeComponent implements AfterViewInit {
  private router = inject(Router);

  @ViewChild('pageRef') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('cardsRef') cardsRef!: ElementRef<HTMLElement>;

  sections: ArabicSection[] = [
    {
      label: 'Quran',
      arabicLabel: 'القرآن',
      desc: 'Explore the Quran through a linguistic and worldview lens',
      route: '/arabic/quran',
      icon: '٣',
    },
    {
      label: 'Roots',
      arabicLabel: 'الجذور',
      desc: 'Browse and manage Arabic root entries',
      route: '/arabic/roots',
      icon: 'ج',
    },
    {
      label: 'Lexicon',
      arabicLabel: 'المعجم',
      desc: 'Comprehensive Arabic word dictionary',
      route: '/arabic/lexicon',
      icon: 'ل',
    },
    {
      label: 'Library',
      arabicLabel: 'المكتبة',
      desc: 'Classical Arabic works collection',
      route: '/arabic/library',
      icon: 'م',
    },
    {
      label: 'Grammar',
      arabicLabel: 'النحو',
      desc: 'Grammatical rules and paradigms',
      route: '/arabic/grammar',
      icon: 'ن',
    },
    {
      label: 'Authors',
      arabicLabel: 'المؤلفون',
      desc: 'Scholar and author profiles',
      route: '/arabic/authors',
      icon: 'أ',
    },
  ];

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.pageRef.nativeElement,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );

    const cards = this.cardsRef.nativeElement.querySelectorAll('.section-card');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 32, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.07,
        ease: 'power3.out',
        delay: 0.2,
      }
    );
  }

  back(): void {
    this.router.navigate(['/landing']);
  }
}
