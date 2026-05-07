import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';

type QuranLandingCardId = 'quran' | 'surahs';

interface QuranLandingCard {
  id: QuranLandingCardId;
  label: string;
  route: string;
  glyph: string;
}

@Component({
  selector: 'km-quran-landing',
  standalone: true,
  imports: [HomePlaneButtonComponent],
  templateUrl: './quran-landing.component.html',
  styleUrl: './quran-landing.component.scss',
})
export class QuranLandingComponent implements AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('cardsRow') cardsRow!: ElementRef<HTMLElement>;

  readonly cards: QuranLandingCard[] = [
    {
      id: 'quran',
      label: 'Quran',
      route: '/quran/al-quran',
      glyph: '☽',
    },
    {
      id: 'surahs',
      label: 'Surahs',
      route: '/quran/surahs',
      glyph: '١١٤',
    },
  ];

  ngAfterViewInit(): void {
    const cards = this.cardsRow.nativeElement.querySelectorAll('.km-module-card');
    if (!cards.length) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 18, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: 'power3.out' },
    );
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
  }

  back(): void {
    this.router.navigate(['/home']);
  }
}
