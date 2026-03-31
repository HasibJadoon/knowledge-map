import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';

@Component({
  selector: 'km-home-plane-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-plane-button.component.html',
  styleUrl: './home-plane-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePlaneButtonComponent implements AfterViewInit, OnDestroy {
  readonly route = input('/home');
  readonly ariaLabel = input('Go to K-MAPS home');

  @ViewChild('iconRef') private iconRef!: ElementRef<SVGElement>;
  @ViewChild('shadowRef') private shadowRef!: ElementRef<HTMLElement>;

  private ambientTween?: gsap.core.Timeline;
  private hoverTween?: gsap.core.Tween;

  ngAfterViewInit(): void {
    const icon = this.iconRef.nativeElement;
    const shadow = this.shadowRef.nativeElement;

    this.ambientTween = gsap.timeline({ repeat: -1, yoyo: true });
    this.ambientTween
      .to(icon, {
        y: -3,
        rotate: -4,
        duration: 1.8,
        ease: 'sine.inOut',
        transformOrigin: '50% 55%',
      })
      .to(
        shadow,
        {
          scaleX: 0.84,
          opacity: 0.38,
          duration: 1.8,
          ease: 'sine.inOut',
          transformOrigin: '50% 50%',
        },
        0
      );
  }

  playHover(active: boolean): void {
    const icon = this.iconRef?.nativeElement;
    const shadow = this.shadowRef?.nativeElement;
    if (!icon || !shadow) return;

    this.hoverTween?.kill();
    this.hoverTween = gsap.to(icon, { duration: 0 });

    gsap.to(icon, {
      y: active ? -6 : 0,
      scale: active ? 1.08 : 1,
      rotate: active ? -7 : 0,
      duration: active ? 0.24 : 0.32,
      ease: active ? 'power2.out' : 'power3.out',
      overwrite: true,
      transformOrigin: '50% 55%',
    });

    gsap.to(shadow, {
      scaleX: active ? 0.74 : 1,
      opacity: active ? 0.26 : 0.46,
      duration: active ? 0.24 : 0.32,
      ease: active ? 'power2.out' : 'power3.out',
      overwrite: true,
      transformOrigin: '50% 50%',
    });
  }

  ngOnDestroy(): void {
    this.ambientTween?.kill();
    this.hoverTween?.kill();
  }
}
