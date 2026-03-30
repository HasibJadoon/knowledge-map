import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import gsap from 'gsap';
import { QuranStateService } from '../../../shared/services/quran-state.service';
import { SurahActionsComponent } from '../surah-actions/surah-actions.component';

@Component({
  selector: 'km-quran-landing',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, SurahActionsComponent],
  templateUrl: './quran-landing.component.html',
  styleUrl: './quran-landing.component.scss',
})
export class QuranLandingComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  readonly quranState = inject(QuranStateService);

  @ViewChild('cardsContainer') cardsContainer!: ElementRef<HTMLElement>;

  searchQuery = signal('');
  typeFilter = signal<'all' | 'makki' | 'madani'>('all');
  viewMode = signal<'grid' | 'list'>('grid');

  filteredSurahs = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const t = this.typeFilter();
    return this.quranState.surahs().filter((s) => {
      const matchesSearch =
        !q ||
        s.transliteratedName.toLowerCase().includes(q) ||
        s.arabicName.includes(q);
      const matchesType = t === 'all' || s.revelationType === t;
      return matchesSearch && matchesType;
    });
  });

  ngOnInit(): void {
    this.quranState.load();
  }

  ngAfterViewInit(): void {
    this.animateCards();
  }

  animateCards(): void {
    const cards = this.cardsContainer?.nativeElement?.querySelectorAll(
      '.surah-card, .surah-row'
    );
    if (cards && cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.025, ease: 'power2.out' }
      );
    }
  }

  setSearch(value: string): void { this.searchQuery.set(value); }
  setTypeFilter(value: 'all' | 'makki' | 'madani'): void { this.typeFilter.set(value); }
  setViewMode(mode: 'grid' | 'list'): void { this.viewMode.set(mode); }

  navigateToSurah(surahNumber: number): void {
    this.router.navigate(['/quran', surahNumber]);
  }

  back(): void {
    this.router.navigate(['/landing']);
  }
}
