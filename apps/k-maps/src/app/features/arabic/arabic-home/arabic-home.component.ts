import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
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
  private http = inject(HttpClient);
  private readonly base = environment.apiBase;

  @ViewChild('pageRef') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('headerRef') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('statsRef') statsRef!: ElementRef<HTMLElement>;
  @ViewChild('cardsRef') cardsRef!: ElementRef<HTMLElement>;

  private cleanupCardTilts: Array<() => void> = [];

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

    cards.forEach((cardElement) => {
      const card = cardElement as HTMLElement;

      const onMove = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;

        gsap.to(card, {
          rotateX: py * -10,
          rotateY: px * 12,
          y: -6,
          duration: 0.32,
          ease: 'power2.out',
          transformPerspective: 1000,
          transformOrigin: 'center',
          overwrite: true,
        });
      };

      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          y: 0,
          duration: 0.42,
          ease: 'power3.out',
          overwrite: true,
        });
      };

      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
      this.cleanupCardTilts.push(() => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  ngOnDestroy(): void {
    this.cleanupCardTilts.forEach((cleanup) => cleanup());
    this.cleanupCardTilts = [];
  }
}
