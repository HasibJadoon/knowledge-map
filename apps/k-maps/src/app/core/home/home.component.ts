import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { PageTransitionService } from '../../shared/services/page-transition.service';

interface ModuleCard {
  id: string;
  label: string;
  route: string;
  icon: string;  // SVG path or emoji placeholder
  glyph: string; // Large decorative character
}

@Component({
  selector: 'km-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly transitions = inject(PageTransitionService);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('logo') logoRef!: ElementRef<HTMLElement>;
  @ViewChild('subtitle') subtitleRef!: ElementRef<HTMLElement>;
  @ViewChild('cardsRow') cardsRowRef!: ElementRef<HTMLElement>;
  @ViewChild('domainLabel') domainLabelRef!: ElementRef<HTMLElement>;

  readonly particles = Array.from({ length: 15 }, (_, i) => i);

  readonly modules: ModuleCard[] = [
    { id: 'hub',       label: 'Hub',       route: '/hub',            icon: '◈', glyph: '⬡' },
    { id: 'quran',     label: 'Quran',     route: '/quran',          icon: '◉', glyph: '☽' },
    { id: 'arabic',    label: 'Arabic',    route: '/arabic',         icon: '◆', glyph: 'ع' },
    { id: 'worldview', label: 'Worldview', route: '/worldview',      icon: '◎', glyph: '◉' },
    { id: 'planner',   label: 'Planner',   route: '/planner',        icon: '▦', glyph: '⊞' },
    { id: 'content',   label: 'Content',   route: '/content',        icon: '▷', glyph: '▶' },
  ];

  ngAfterViewInit(): void {
    this.runEntryAnimation();
  }

  private runEntryAnimation(): void {
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
      '.km-module-card',
      { opacity: 0, y: 32, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.09, clearProps: 'transform' },
      '-=0.3'
    )
    .fromTo(
      this.domainLabelRef.nativeElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.6 },
      '-=0.1'
    );
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
