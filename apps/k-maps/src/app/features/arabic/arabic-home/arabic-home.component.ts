import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import gsap from 'gsap';

interface FeatureCard {
  glyph: string;
  title: string;
  arabicTitle: string;
  desc: string;
  route: string;
}

interface ArabicCounts {
  containers: number;
  vocabRoots: number;
  grammarConcepts: number;
  balaghaTerms: number;
}

@Component({
  selector: 'km-arabic-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './arabic-home.component.html',
  styleUrl: './arabic-home.component.scss',
})
export class ArabicHomeComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private readonly base = environment.apiBase;

  @ViewChild('pageRef') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('headerRef') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('statsRef') statsRef!: ElementRef<HTMLElement>;
  @ViewChild('cardsRef') cardsRef!: ElementRef<HTMLElement>;

  counts = signal<ArabicCounts>({
    containers: 0,
    vocabRoots: 0,
    grammarConcepts: 0,
    balaghaTerms: 0,
  });

  cards: FeatureCard[] = [
    {
      glyph: 'ك',
      title: 'Content Library',
      arabicTitle: 'المكتبة',
      desc: 'Books, poetry, podcasts — structured Arabic learning',
      route: '/arabic/library',
    },
    {
      glyph: 'ن',
      title: 'Linguistics',
      arabicTitle: 'اللغويات',
      desc: 'Grammar, Balagha rhetoric and classical analysis',
      route: '/arabic/linguistics',
    },
    {
      glyph: 'م',
      title: 'Domains',
      arabicTitle: 'المجالات',
      desc: 'Context-specific vocabulary — home, market, mosque, travel',
      route: '/arabic/domains',
    },
    {
      glyph: '↻',
      title: 'Review',
      arabicTitle: 'المراجعة',
      desc: 'Spaced repetition flashcards for all Arabic content',
      route: '/arabic/review',
    },
  ];

  ngOnInit(): void {
    this.loadCounts();
  }

  private loadCounts(): void {
    this.http.get<any>(`${this.base}/hub/counts`).subscribe({
      next: (res) => {
        if (res?.ok) {
          const c = res.counts ?? {};
          this.counts.set({
            containers: c.ar_containers ?? c.containers ?? 0,
            vocabRoots: c.ar_roots ?? c.vocab_roots ?? 0,
            grammarConcepts: c.ar_grammar ?? c.grammar_concepts ?? 0,
            balaghaTerms: c.ar_balagha ?? c.balagha_terms ?? 0,
          });
        }
      },
      error: () => {
        // silently fail — counts stay at 0
      },
    });
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }
    );

    gsap.fromTo(
      this.statsRef.nativeElement,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.25 }
    );

    const cards = this.cardsRef.nativeElement.querySelectorAll('.feature-card');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 36, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.4,
      }
    );
  }

  back(): void {
    this.router.navigate(['/home']);
  }
}
