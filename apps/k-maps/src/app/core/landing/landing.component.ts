import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';

interface ModuleCard {
  id: string;
  label: string;
  route: string;
  icon: string;  // SVG path or emoji placeholder
  glyph: string; // Large decorative character
}

interface ConceptNode {
  id: string;
  label: string;
  x: number;
  y: number;
  tone: 'gold' | 'sage' | 'blue';
  size: 'sm' | 'md' | 'lg';
}

interface ConceptLink {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'km-landing',
  standalone: true,
  imports: [],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('logo') logoRef!: ElementRef<HTMLElement>;
  @ViewChild('subtitle') subtitleRef!: ElementRef<HTMLElement>;
  @ViewChild('cardsRow') cardsRowRef!: ElementRef<HTMLElement>;
  @ViewChild('domainLabel') domainLabelRef!: ElementRef<HTMLElement>;
  @ViewChildren('conceptNode') conceptNodeRefs!: QueryList<ElementRef<HTMLElement>>;

  readonly particles = Array.from({ length: 15 }, (_, i) => i);

  readonly modules: ModuleCard[] = [
    { id: 'hub',       label: 'Hub',       route: '/hub',            icon: '◈', glyph: '⬡' },
    { id: 'quran',     label: 'Quran',     route: '/quran',          icon: '◉', glyph: '☽' },
    { id: 'arabic',    label: 'Arabic',    route: '/arabic',         icon: '◆', glyph: 'ع' },
    { id: 'worldview', label: 'Worldview', route: '/worldview',      icon: '◎', glyph: '◉' },
    { id: 'planner',   label: 'Planner',   route: '/planner',        icon: '▦', glyph: '⊞' },
    { id: 'srs',       label: 'SRS',       route: '/srs',            icon: '↻', glyph: '↻' },
    { id: 'content',   label: 'Content',   route: '/content',        icon: '▷', glyph: '▶' },
  ];

  readonly conceptNodes: ConceptNode[] = [
    { id: 'revelation', label: 'Revelation', x: 13, y: 22, tone: 'gold', size: 'md' },
    { id: 'language', label: 'Language', x: 27, y: 14, tone: 'blue', size: 'sm' },
    { id: 'patterns', label: 'Patterns', x: 42, y: 20, tone: 'sage', size: 'sm' },
    { id: 'worldview', label: 'Worldview', x: 73, y: 18, tone: 'blue', size: 'md' },
    { id: 'story', label: 'Story', x: 84, y: 34, tone: 'gold', size: 'sm' },
    { id: 'grammar', label: 'Grammar', x: 18, y: 61, tone: 'blue', size: 'sm' },
    { id: 'concepts', label: 'Concepts', x: 34, y: 74, tone: 'sage', size: 'lg' },
    { id: 'memory', label: 'Memory', x: 52, y: 67, tone: 'gold', size: 'md' },
    { id: 'claims', label: 'Claims', x: 68, y: 76, tone: 'blue', size: 'sm' },
    { id: 'signs', label: 'Signs', x: 88, y: 63, tone: 'sage', size: 'md' },
  ];

  readonly conceptLinks: ConceptLink[] = [
    { id: 'revelation-language', x1: 13, y1: 22, x2: 27, y2: 14 },
    { id: 'language-patterns', x1: 27, y1: 14, x2: 42, y2: 20 },
    { id: 'patterns-worldview', x1: 42, y1: 20, x2: 73, y2: 18 },
    { id: 'worldview-story', x1: 73, y1: 18, x2: 84, y2: 34 },
    { id: 'revelation-grammar', x1: 13, y1: 22, x2: 18, y2: 61 },
    { id: 'grammar-concepts', x1: 18, y1: 61, x2: 34, y2: 74 },
    { id: 'concepts-memory', x1: 34, y1: 74, x2: 52, y2: 67 },
    { id: 'memory-claims', x1: 52, y1: 67, x2: 68, y2: 76 },
    { id: 'claims-signs', x1: 68, y1: 76, x2: 88, y2: 63 },
    { id: 'patterns-memory', x1: 42, y1: 20, x2: 52, y2: 67 },
    { id: 'worldview-signs', x1: 73, y1: 18, x2: 88, y2: 63 },
  ];

  private animationContext: gsap.Context | null = null;

  ngAfterViewInit(): void {
    this.runEntryAnimation();
  }

  ngOnDestroy(): void {
    this.animationContext?.revert();
  }

  private runEntryAnimation(): void {
    this.animationContext?.revert();
    this.animationContext = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        this.logoRef.nativeElement,
        { opacity: 0, y: -24, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, clearProps: 'filter' }
      )
      .fromTo(
        this.subtitleRef.nativeElement,
        { opacity: 0, letterSpacing: '0.5em' },
        { opacity: 1, letterSpacing: '0.18em', duration: 0.8 },
        '-=0.5'
      )
      .fromTo(
        '.landing__concept-node',
        { opacity: 0, scale: 0.7, y: 18, filter: 'blur(10px)' },
        { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.72, stagger: 0.04, clearProps: 'filter,transform' },
        '-=0.35'
      )
      .fromTo(
        '.landing__concept-links line',
        { opacity: 0, strokeDashoffset: 48 },
        { opacity: 1, strokeDashoffset: 0, duration: 0.9, stagger: 0.03 },
        '-=0.48'
      )
      .fromTo(
        '.km-module-card',
        { opacity: 0, y: 32, scale: 0.94, rotateX: -10 },
        { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.6, stagger: 0.09, clearProps: 'transform' },
        '-=0.42'
      )
      .fromTo(
        this.domainLabelRef.nativeElement,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
        '-=0.1'
      );

      gsap.to('.landing__logo-emblem', {
        y: -8,
        scale: 1.04,
        duration: 2.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      gsap.utils.toArray<HTMLElement>('.landing__concept-node').forEach((node, index) => {
        gsap.to(node, {
          x: (index % 3 - 1) * 8,
          y: index % 2 === 0 ? -10 : 10,
          duration: 4.2 + index * 0.18,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 0.8 + index * 0.05,
        });
      });

      gsap.utils.toArray<HTMLElement>('.km-module-card').forEach((card, index) => {
        gsap.to(card, {
          y: index % 2 === 0 ? -8 : -4,
          duration: 3 + index * 0.16,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1.1 + index * 0.08,
        });
      });
    }, this.pageRef.nativeElement);
  }

  navigate(route: string): void {
    // Animate cards out, then navigate
    gsap.to('.km-module-card', {
      opacity: 0,
      y: -16,
      stagger: 0.04,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => { void this.router.navigateByUrl(route); },
    });
  }
}
