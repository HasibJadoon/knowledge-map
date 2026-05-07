import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import gsap from 'gsap';

interface ResearchTab {
  id: string;
  labelAr: string;
  icon: string;
  routePath: string;
}

@Component({
  selector: 'km-quran-researcher-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './quran-researcher-shell.component.html',
  styleUrl: './quran-researcher-shell.component.scss',
})
export class QuranResearcherShellComponent {
  private readonly router = inject(Router);

  @ViewChild('pageSlot') pageSlot?: ElementRef<HTMLElement>;

  readonly tabs: ResearchTab[] = [
    { id: 'tafseer', labelAr: 'تفسير',   icon: '◫', routePath: 'tafseer' },
    { id: 'uloom',   labelAr: 'علوم',    icon: '⧉', routePath: 'uloom'   },
    { id: 'lexicon', labelAr: 'معاجم',   icon: 'ع', routePath: 'lexicon' },
    { id: 'notes',   labelAr: 'ملاحظات', icon: '✎', routePath: 'notes'   },
  ];

  goHome(): void {
    this.router.navigateByUrl('/home');
  }

  navigateToAlQuran(): void {
    this.router.navigateByUrl('/quran/al-quran');
  }

  onRouteActivate(): void {
    const el = this.pageSlot?.nativeElement;
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: 0.48, ease: 'expo.out', clearProps: 'transform' },
    );
  }
}
