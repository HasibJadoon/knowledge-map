import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const pref = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

@Injectable({ providedIn: 'root' })
export class PlannerGsapService {

  /** Stagger-reveal column headers from above */
  revealColumns(elements: HTMLElement[]): void {
    if (!elements.length) return;
    if (pref()) { gsap.set(elements, { opacity: 1, y: 0 }); return; }
    gsap.fromTo(
      elements,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }
    );
  }

  /** Stagger-reveal cards (immediate) — mirrors QuranGsapService.revealCards */
  revealCards(elements: HTMLElement[], delay = 0): void {
    if (!elements.length) return;
    if (pref()) { gsap.set(elements, { opacity: 1, y: 0 }); return; }
    gsap.fromTo(
      elements,
      { opacity: 0, y: 18 },
      {
        opacity: 1, y: 0,
        duration: 0.38,
        stagger: 0.05,
        delay,
        ease: 'power2.out',
        clearProps: 'transform',
      }
    );
  }

  /**
   * Attach GSAP-driven hover lift to a card element.
   * Mirrors QuranGsapService.setupIconHover.
   * Returns a cleanup function.
   */
  setupCardHover(el: HTMLElement): () => void {
    const onEnter = () => {
      if (pref()) return;
      gsap.to(el, {
        y: -5,
        boxShadow: '0 10px 32px rgba(201,168,76,0.18), 0 0 0 1px rgba(201,168,76,0.45)',
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };
    const onLeave = () => {
      if (pref()) return;
      gsap.to(el, {
        y: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        duration: 0.28,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }

  /** Press feedback for buttons */
  setupButtonPress(el: HTMLElement): () => void {
    const onDown = () => {
      if (pref()) return;
      gsap.to(el, { scale: 0.9, duration: 0.08, ease: 'power2.in', overwrite: 'auto' });
    };
    const onUp = () => {
      if (pref()) return;
      gsap.to(el, { scale: 1.05, duration: 0.1, ease: 'back.out(2.2)', overwrite: 'auto' });
      gsap.to(el, { scale: 1, duration: 0.16, delay: 0.08, ease: 'power2.out' });
    };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('mouseleave', onUp);
    };
  }

  /** Fade-in a single panel (page-level) */
  revealPanel(el: HTMLElement, delay = 0): void {
    if (pref()) { gsap.set(el, { opacity: 1 }); return; }
    gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.42, delay, ease: 'power2.out', clearProps: 'transform' }
    );
  }
}
