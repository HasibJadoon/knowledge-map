import { Injectable } from '@angular/core';
import gsap from 'gsap';

export type TransitionPreset = 'rise' | 'fade' | 'slide-left' | 'slide-right';

@Injectable({ providedIn: 'root' })
export class PageTransitionService {
  /**
   * Animate a page element in when it first loads.
   * Call this in ngAfterViewInit from each page component.
   */
  enterPage(el: HTMLElement, preset: TransitionPreset = 'rise'): void {
    const presets: Record<TransitionPreset, gsap.TweenVars> = {
      rise: { opacity: 0, y: 28, duration: 0.55, ease: 'power3.out' },
      fade: { opacity: 0, duration: 0.45, ease: 'power2.out' },
      'slide-left': { opacity: 0, x: -40, duration: 0.48, ease: 'power3.out' },
      'slide-right': { opacity: 0, x: 40, duration: 0.48, ease: 'power3.out' },
    };

    const from = presets[preset];
    const to: gsap.TweenVars = { opacity: 1, y: 0, x: 0, clearProps: 'transform' };

    gsap.fromTo(el, from, to);
  }

  /**
   * Stagger-reveal children of a container.
   */
  staggerReveal(
    parent: HTMLElement,
    selector: string,
    stagger = 0.08,
    delay = 0.1
  ): void {
    const targets = parent.querySelectorAll(selector);
    gsap.fromTo(
      targets,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger,
        delay,
        clearProps: 'transform',
      }
    );
  }

  /**
   * Animate a text element with a letter-by-letter reveal.
   */
  textReveal(el: HTMLElement, delay = 0): void {
    gsap.fromTo(
      el,
      { opacity: 0, letterSpacing: '0.3em', filter: 'blur(4px)' },
      {
        opacity: 1,
        letterSpacing: '',
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power3.out',
        delay,
        clearProps: 'filter',
      }
    );
  }
}
