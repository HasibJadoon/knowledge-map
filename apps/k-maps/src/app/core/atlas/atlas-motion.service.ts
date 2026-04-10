import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { SceneLayer, SceneState } from './atlas.models';

/**
 * AtlasMotionService — owns all GSAP timelines for the atlas experience.
 *
 * Design principles:
 *   • No bouncy / toy easing — all transitions use power2/expo/cubic families
 *   • One single transition style per layer boundary
 *   • Reusable presets called by the orchestrating component
 *   • History arc has its own reveal timeline
 *   • All timelines return a gsap.core.Timeline so callers can chain or kill
 */
@Injectable({ providedIn: 'root' })
export class AtlasMotionService {
  private activeTransition: gsap.core.Timeline | null = null;

  // ─── Entry / first-load ──────────────────────────────────────────────────

  /**
   * Entry animation: sky fades in and the mode indicator resolves.
   * Optional header elements can still be animated when present.
   */
  entrySequence(
    starHost: HTMLElement,
    modeIndicatorEl: HTMLElement,
    titleEl?: HTMLElement | null,
    subtitleEl?: HTMLElement | null,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Starfield fades in slowly
    tl.fromTo(starHost, { opacity: 0 }, { opacity: 1, duration: 2.2 }, 0);

    if (titleEl) {
      tl.fromTo(
        titleEl,
        { opacity: 0, filter: 'blur(12px)', y: 6 },
        { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.4 },
        0.8,
      );
    }

    if (subtitleEl) {
      tl.fromTo(
        subtitleEl,
        { opacity: 0, y: 10, letterSpacing: '0.25em' },
        { opacity: 0.68, y: 0, letterSpacing: '0.06em', duration: 1.1 },
        1.4,
      );
    }

    // Mode indicator whispers in
    tl.fromTo(
      modeIndicatorEl,
      { opacity: 0, x: -8 },
      { opacity: 0.52, x: 0, duration: 0.7 },
      2.0,
    );

    this.activeTransition = tl;
    return tl;
  }

  // ─── Layer transitions ───────────────────────────────────────────────────

  /**
   * Camera dolly into a constellation from sky.
   * The SVG canvas itself dims briefly as the focus resolves.
   */
  skyToConstellation(
    svgCanvas: SVGSVGElement,
    focusLabel: HTMLElement,
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete,
    });

    // Gentle density shift without a flash or blur pulse.
    tl.fromTo(
      svgCanvas,
      { opacity: 0.9 },
      { opacity: 0.78, duration: 0.34, ease: 'sine.inOut' },
      0,
    ).to(
      svgCanvas,
      { opacity: 1, duration: 1.05, ease: 'expo.out' },
      0.14,
    );

    // Focus label fades in
    tl.fromTo(
      focusLabel,
      { opacity: 0, y: 10, letterSpacing: '0.18em' },
      { opacity: 1, y: 0, letterSpacing: '0.08em', duration: 0.62, ease: 'power2.out' },
      0.24,
    );

    this.activeTransition = tl;
    return tl;
  }

  /**
   * Constellation star pattern morphs into node graph.
   * Stars fade while D3 nodes pulse in with stagger.
   */
  constellationToNode(
    constellationLayer: SVGGElement | null,
    nodeDots: NodeListOf<SVGCircleElement> | SVGCircleElement[],
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete,
    });

    if (constellationLayer) {
      tl.to(constellationLayer, { opacity: 0, duration: 0.32 }, 0);
    }

    // Node pulse entrance (staggered)
    if (nodeDots.length) {
      tl.fromTo(
        nodeDots,
        { scale: 0.4, opacity: 0, transformOrigin: 'center center' },
        { scale: 1, opacity: 1, duration: 0.48, stagger: 0.024 },
        0.2,
      );
    }

    this.activeTransition = tl;
    return tl;
  }

  /**
   * Node expands a temporal arc — brief node pulse, then arc draws itself.
   * The actual D3 arc path animation is driven by stroke-dashoffset in
   * AtlasGraphRenderer; this GSAP timeline handles the surrounding UI.
   */
  nodeToHistory(
    focusedNode: SVGCircleElement | null,
    historyPanel: HTMLElement | null,
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete,
    });

    if (focusedNode) {
      tl.to(focusedNode, { scale: 1.28, duration: 0.15, transformOrigin: 'center center', ease: 'power1.out' })
        .to(focusedNode, { scale: 1, duration: 0.22, ease: 'power1.inOut' });
    }

    if (historyPanel) {
      tl.fromTo(
        historyPanel,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.38 },
        0.1,
      );
    }

    this.activeTransition = tl;
    return tl;
  }

  // ─── Back transitions ────────────────────────────────────────────────────

  /**
   * Reverse: any inner layer → outer.
   * Fades the current focus context out, allows navigation.
   */
  stepBack(
    focusLabel: HTMLElement,
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete,
    });

    tl.to(focusLabel, { opacity: 0, y: -5, duration: 0.28 });

    this.activeTransition = tl;
    return tl;
  }

  // ─── Idle animations ─────────────────────────────────────────────────────

  /**
   * Continuous very-slow breathing on the Qur'an glow element.
   * Should be started once and never killed (lives for the entire session).
   */
  startQuranBreath(glowEl: SVGCircleElement | HTMLElement): gsap.core.Tween {
    return gsap.to(glowEl, {
      scale: 1.04,
      opacity: 0.85,
      duration: 3.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: 'center center',
    });
  }

  /**
   * Slow parallax drift on a single element — used for the skyfield overlay.
   */
  startDrift(el: HTMLElement, amplitude = 6, period = 14): gsap.core.Tween {
    return gsap.to(el, {
      y: amplitude,
      duration: period,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  // ─── Node focus pulse ────────────────────────────────────────────────────

  /**
   * Quick pulse on a node when it is selected.
   */
  pulseNode(nodeEl: SVGCircleElement): gsap.core.Timeline {
    return gsap.timeline()
      .to(nodeEl, { scale: 1.35, duration: 0.14, transformOrigin: 'center center', ease: 'power1.out' })
      .to(nodeEl, { scale: 1.0, duration: 0.22, ease: 'power1.inOut' });
  }

  // ─── Mode indicator ──────────────────────────────────────────────────────

  /**
   * Cross-fade the mode indicator text between two layer labels.
   */
  transitionModeLabel(el: HTMLElement, newLabel: string): gsap.core.Timeline {
    return gsap.timeline()
      .to(el, { opacity: 0, y: -4, duration: 0.18, ease: 'power1.in' })
      .call(() => { el.textContent = newLabel; })
      .to(el, { opacity: 0.52, y: 0, duration: 0.26, ease: 'power1.out' });
  }

  // ─── Focus card ──────────────────────────────────────────────────────────

  /** Reveal the focus info card with a clean ease-up. */
  revealCard(cardEl: HTMLElement): gsap.core.Tween {
    return gsap.fromTo(
      cardEl,
      { opacity: 0, y: 14, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out' },
    );
  }

  /** Dismiss the focus info card. */
  dismissCard(cardEl: HTMLElement, onComplete?: () => void): gsap.core.Tween {
    return gsap.to(cardEl, {
      opacity: 0,
      y: 8,
      scale: 0.97,
      duration: 0.22,
      ease: 'power1.in',
      onComplete,
    });
  }

  // ─── Module shortcuts ────────────────────────────────────────────────────

  /** Stagger-entrance of bottom module shortcut pills. */
  revealModuleShortcuts(items: HTMLElement[] | NodeListOf<HTMLElement>): gsap.core.Tween {
    return gsap.fromTo(
      items,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.34, stagger: 0.055, ease: 'power2.out', delay: 2.8 },
    );
  }

  // ─── Navigation exit ─────────────────────────────────────────────────────

  /** Full-page exit before router navigation — the sky dissolves. */
  exitToApp(host: HTMLElement, onComplete?: () => void): gsap.core.Tween {
    return gsap.to(host, {
      opacity: 0,
      duration: 0.52,
      ease: 'power1.inOut',
      onComplete,
    });
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  dispose(): void {
    this.kill();
  }

  private kill(): void {
    this.activeTransition?.kill();
    this.activeTransition = null;
  }

  /** Layer name formatted for the mode indicator. */
  static layerLabel(layer: SceneLayer): string {
    switch (layer) {
      case 'sky': return 'Sky';
      case 'constellation': return 'Constellation';
      case 'node': return 'Concept Map';
      case 'history': return 'History';
    }
  }
}
