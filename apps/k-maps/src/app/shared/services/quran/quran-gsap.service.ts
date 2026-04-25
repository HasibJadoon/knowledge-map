import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

@Injectable({ providedIn: 'root' })
export class QuranGsapService {

  /** Staggered reveal for icon tile host elements */
  revealIconTiles(elements: HTMLElement[], baseDelay = 0): void {
    if (!elements.length) return;
    if (prefersReducedMotion()) {
      gsap.set(elements, { opacity: 1, y: 0, scale: 1 });
      return;
    }
    gsap.fromTo(
      elements,
      { opacity: 0, y: 10, scale: 0.88 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.42,
        stagger: 0.055,
        delay: baseDelay,
        ease: 'back.out(1.5)',
        clearProps: 'transform',
      }
    );
  }

  /** Attach hover lift + scale to an element. Returns cleanup fn. */
  setupIconHover(el: HTMLElement): () => void {
    const iconEl = el.querySelector<HTMLElement>('.icon-tile__icon');

    const onEnter = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, {
        y: -5, scale: 1.06,
        boxShadow: '0 10px 28px rgba(201,168,76,0.28), 0 0 0 1px rgba(201,168,76,0.45)',
        duration: 0.2, ease: 'power2.out', overwrite: 'auto',
      });
      if (iconEl) gsap.to(iconEl, { scale: 1.14, duration: 0.2, ease: 'power2.out' });
    };

    const onLeave = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, {
        y: 0, scale: 1, boxShadow: 'none',
        duration: 0.26, ease: 'power2.inOut', overwrite: 'auto',
      });
      if (iconEl) gsap.to(iconEl, { scale: 1, duration: 0.26, ease: 'power2.inOut' });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }

  /** Attach press-in feedback. Returns cleanup fn. */
  setupIconPress(el: HTMLElement): () => void {
    const onDown = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, { scale: 0.93, y: 0, duration: 0.08, ease: 'power2.in', overwrite: 'auto' });
    };
    const onUp = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, { scale: 1.05, duration: 0.11, ease: 'back.out(2.2)', overwrite: 'auto' });
      gsap.to(el, { scale: 1, duration: 0.18, delay: 0.1, ease: 'power2.out' });
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

  /** Fade-up reveal for a page panel */
  revealPanel(el: HTMLElement, delay = 0): void {
    if (prefersReducedMotion()) { gsap.set(el, { opacity: 1 }); return; }
    gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.42, delay, ease: 'power2.out', clearProps: 'transform' }
    );
  }

  /** Slide-open detail panel inside a card. */
  slideInDetailPanel(el: HTMLElement): void {
    const items = Array.from(el.querySelectorAll<HTMLElement>('.syn-member'));
    gsap.killTweensOf([el, ...items]);
    if (prefersReducedMotion()) {
      gsap.set(el, { height: 'auto', opacity: 1, y: 0, clearProps: 'overflow,transform' });
      gsap.set(items, { opacity: 1, x: 0, clearProps: 'transform' });
      return;
    }

    gsap.fromTo(
      el,
      { height: 0, opacity: 0, y: -8, overflow: 'hidden' },
      {
        height: 'auto',
        opacity: 1,
        y: 0,
        duration: 0.34,
        ease: 'power3.out',
        clearProps: 'height,overflow,transform',
      },
    );

    if (items.length) {
      gsap.fromTo(
        items,
        { opacity: 0, x: -10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.28,
          delay: 0.08,
          stagger: 0.035,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    }
  }

  slideInSidePanel(el: HTMLElement): void {
    const members = Array.from(el.querySelectorAll<HTMLElement>('.syn-member'));
    gsap.killTweensOf([el, ...members]);
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, x: 0, y: 0 });
      gsap.set(members, { opacity: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, x: 34 },
      { opacity: 1, x: 0, duration: 0.34, ease: 'expo.out', clearProps: 'transform' },
    );
    if (members.length) {
      gsap.fromTo(
        members,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.28, delay: 0.1, stagger: 0.035, ease: 'power2.out', clearProps: 'transform' },
      );
    }
  }

  slideOutSidePanel(el: HTMLElement, onComplete: () => void): void {
    gsap.killTweensOf(el);
    if (prefersReducedMotion()) {
      onComplete();
      return;
    }
    gsap.to(el, {
      opacity: 0,
      x: 28,
      duration: 0.22,
      ease: 'power2.in',
      onComplete,
    });
  }

  /** Stagger-reveal card grid items (immediate, no scroll) */
  revealCards(elements: Element[], delay = 0): void {
    if (!elements.length) return;
    if (prefersReducedMotion()) { gsap.set(elements, { opacity: 1 }); return; }
    gsap.fromTo(
      elements,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.04, delay, ease: 'power2.out', clearProps: 'transform' }
    );
  }

  /** ScrollTrigger-based reveal: each element fades in as it enters viewport */
  revealOnScroll(elements: Element[]): void {
    if (!elements.length) return;
    if (prefersReducedMotion()) { gsap.set(elements, { opacity: 1, y: 0 }); return; }
    elements.forEach((el, i) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 22 },
        {
          opacity: 1, y: 0,
          duration: 0.42,
          delay: (i % 4) * 0.06,
          ease: 'power2.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        }
      );
    });
  }
}
