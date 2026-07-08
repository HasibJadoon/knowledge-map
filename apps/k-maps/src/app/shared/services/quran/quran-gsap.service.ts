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

  setupSynonymCardMotion(el: HTMLElement): () => void {
    const chainEl = el.querySelector<HTMLElement>('.syn-card__chain');
    const urEl = el.querySelector<HTMLElement>('.syn-card__ur');

    const onEnter = () => {
      if (prefersReducedMotion()) return;
      const glow = getComputedStyle(el).getPropertyValue('--syn-glow').trim() || 'rgba(201,168,76,0.30)';
      gsap.to(el, {
        y: -4,
        scale: 1.012,
        boxShadow: `0 18px 40px rgba(0,0,0,0.32), 0 0 0 1px ${glow}`,
        duration: 0.24,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      if (chainEl) {
        gsap.to(chainEl, { x: -3, duration: 0.24, ease: 'power2.out', overwrite: 'auto' });
      }
      if (urEl) {
        gsap.to(urEl, { opacity: 0.95, duration: 0.18, ease: 'power2.out', overwrite: 'auto' });
      }
    };

    const onLeave = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, {
        y: 0,
        scale: 1,
        boxShadow: 'none',
        duration: 0.28,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
      if (chainEl) gsap.to(chainEl, { x: 0, duration: 0.28, ease: 'power2.inOut', overwrite: 'auto' });
      if (urEl) gsap.to(urEl, { opacity: 0.78, duration: 0.24, ease: 'power2.inOut', overwrite: 'auto' });
    };

    const onDown = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, { scale: 0.992, duration: 0.08, ease: 'power2.in', overwrite: 'auto' });
    };

    const onUp = () => {
      if (prefersReducedMotion()) return;
      gsap.to(el, { scale: 1.012, duration: 0.16, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
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

  /**
   * 3D entrance for morphology cards — each card tips up from a back-tilted
   * plane on mount. Fires immediately (NOT ScrollTrigger): these cards live in
   * containers that scroll internally (the study panel's overflow:auto), where a
   * window-scroll trigger never fires and would leave off-screen cards stuck at
   * opacity 0. An immediate reveal always lands them visible.
   */
  reveal3dCards(elements: Element[]): void {
    if (!elements.length) return;
    if (prefersReducedMotion()) { gsap.set(elements, { opacity: 1, y: 0 }); return; }
    gsap.fromTo(
      elements,
      { opacity: 0, y: 24, rotateX: -14, transformPerspective: 900 },
      {
        opacity: 1, y: 0, rotateX: 0,
        duration: 0.5,
        stagger: 0.04,
        ease: 'power3.out',
        clearProps: 'transform',
      },
    );
  }

  /**
   * Pointer-tracked 3D tilt + parallax for one morphology card.
   * The inner plane rotates toward the cursor; layers marked `[data-depth]`
   * float at their depth; a gold glare follows the pointer. Returns a cleanup.
   */
  setup3dCard(el: HTMLElement): () => void {
    if (prefersReducedMotion()) return () => { /* motion disabled */ };

    const inner  = el.querySelector<HTMLElement>('.wcard__inner') ?? el;
    const glare  = el.querySelector<HTMLElement>('.wcard__glare');
    const layers = Array.from(el.querySelectorAll<HTMLElement>('[data-depth]'));
    const MAX = 10; // max tilt in degrees

    const onEnter = (): void => {
      gsap.to(el, {
        scale: 1.035, z: 44,
        boxShadow: '0 34px 64px -30px rgba(0,0,0,.85), 0 0 0 1px rgba(201,168,76,.4)',
        duration: 0.3, ease: 'power2.out', overwrite: 'auto',
      });
    };

    const onMove = (e: MouseEvent): void => {
      const r  = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top) / r.height;   // 0..1
      gsap.to(inner, {
        rotateX: (0.5 - py) * MAX, rotateY: (px - 0.5) * MAX,
        transformPerspective: 720, transformOrigin: 'center',
        duration: 0.4, ease: 'power2.out', overwrite: 'auto',
      });
      layers.forEach((l) => {
        const d = parseFloat(l.dataset['depth'] ?? '0');
        gsap.to(l, { x: (px - 0.5) * d * 24, y: (py - 0.5) * d * 24, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      });
      if (glare) {
        gsap.to(glare, {
          opacity: 1,
          background: `radial-gradient(220px circle at ${px * 100}% ${py * 100}%, rgba(232,201,106,.22), transparent 62%)`,
          duration: 0.3, ease: 'power2.out', overwrite: 'auto',
        });
      }
    };

    const onLeave = (): void => {
      gsap.to(inner, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1,.55)', overwrite: 'auto' });
      gsap.to(layers, { x: 0, y: 0, duration: 0.55, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(el, { scale: 1, z: 0, boxShadow: '0 0 0 0 rgba(0,0,0,0)', duration: 0.55, ease: 'power2.out', overwrite: 'auto' });
      if (glare) gsap.to(glare, { opacity: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
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
