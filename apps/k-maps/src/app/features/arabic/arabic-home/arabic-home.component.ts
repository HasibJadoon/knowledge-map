import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { ArabicMenuCardComponent } from '../arabic-menu-card/arabic-menu-card.component';


@Component({
  selector: 'km-arabic-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BackButtonComponent, ArabicMenuCardComponent],
  templateUrl: './arabic-home.component.html',
  styleUrl: './arabic-home.component.scss',
})
export class ArabicHomeComponent implements AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('pageRef') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('headerRef') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('cardsRef') cardsRef!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }
    );

    gsap.fromTo(
      this.cardsRef.nativeElement,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.3 }
    );
  }

  back(): void {
    this.router.navigate(['/landing']);
  }
}
