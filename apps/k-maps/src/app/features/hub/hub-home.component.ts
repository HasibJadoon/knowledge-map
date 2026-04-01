import {
  Component, ChangeDetectionStrategy, AfterViewInit,
  ElementRef, ViewChild, inject, OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { HubSectionDef } from './models/hub.models';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';

const SECTION_DEFS: HubSectionDef[] = [
  {
    id: 'quran',
    icon: '☽',
    glyph: '☽',
    title: 'Quran',
    subtitle: '5 data points',
    description: 'Surahs, passages, tafsir notes, highlights and SRS review queue.',
    tag: 'SCRIPTURE',
    accentColor: '#1a6e3a',
    route: '/hub/quran',
  },
  {
    id: 'arabic',
    icon: 'ع',
    glyph: 'ع',
    title: 'Arabic',
    subtitle: '8 data points',
    description: 'Content library, grammar, balagha rhetoric, vocabulary domains and SRS.',
    tag: 'LANGUAGE',
    accentColor: '#8a3a1a',
    route: '/hub/arabic',
  },
  {
    id: 'worldview',
    icon: '◎',
    glyph: '◎',
    title: 'Worldview',
    subtitle: '11 data points',
    description: 'Sources, highlights, brainstorm sessions, comparisons, podcasts and plans.',
    tag: 'KNOWLEDGE',
    accentColor: '#1a3a6e',
    route: '/hub/worldview',
  },
  {
    id: 'workspace',
    icon: '⊞',
    glyph: '⊞',
    title: 'Workspace',
    subtitle: '4 data points',
    description: 'Collaborative workspaces, members, documents and activity log.',
    tag: 'EXECUTION',
    accentColor: '#3a1a6e',
    route: '/hub/workspace',
  },
];

@Component({
  selector: 'km-hub-home',
  standalone: true,
  imports: [BackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub-home.component.html',
  styleUrl: './hub-home.component.scss'
})
export class HubHomeComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('grid') gridRef!: ElementRef<HTMLElement>;
  @ViewChild('footer') footerRef!: ElementRef<HTMLElement>;

  readonly particles = Array.from({ length: 12 }, (_, i) => i);
  readonly sections = SECTION_DEFS;
  private animationContext: gsap.Context | null = null;

  ngAfterViewInit(): void {
    this.animationContext?.revert();
    this.animationContext = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(this.headerRef.nativeElement,
        { opacity: 0, y: -24, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, clearProps: 'filter' }
      )
      .fromTo('.hh__card',
        { opacity: 0, y: 36, scale: .94, rotateX: -10 },
        { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: .62, stagger: .08, clearProps: 'transform' },
        '-=.4'
      )
      .fromTo(this.footerRef.nativeElement,
        { opacity: 0 }, { opacity: 1, duration: .5 }, '-=.1'
      );

      gsap.to('.hh__rule', {
        scaleX: 1.18,
        opacity: 1,
        duration: 2.6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        transformOrigin: '50% 50%',
      });

      gsap.utils.toArray<HTMLElement>('.hh__card').forEach((card, index) => {
        gsap.to(card, {
          y: index % 2 === 0 ? -8 : -4,
          duration: 2.8 + index * 0.2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 0.9 + index * 0.06,
        });
      });

      gsap.utils.toArray<HTMLElement>('.hh__glyph').forEach((glyph, index) => {
        gsap.to(glyph, {
          scale: 1.05,
          duration: 2.2 + index * 0.14,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.1 + index * 0.05,
          transformOrigin: '50% 50%',
        });
      });
    }, this.pageRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
  }

  navigate(route: string): void {
    gsap.to('.hh__card', {
      opacity: 0, y: -16, stagger: .04, duration: .28, ease: 'power2.in',
      onComplete: () => { void this.router.navigateByUrl(route); }
    });
  }
}
