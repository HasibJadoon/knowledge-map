import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonFooter, IonIcon, IonSpinner,
  IonTabBar, IonTabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline, infiniteOutline, moonOutline, sunnyOutline,
  gridOutline, reorderThreeOutline, searchOutline,
} from 'ionicons/icons';
import gsap from 'gsap';
import { QuranReaderService, QuranSurahListItem } from '../../../../shared/services/quran/quran-reader.service';
import { SurahActionsComponent } from '../../components/surah-actions/surah-actions.component';

@Component({
  selector: 'app-quran-browse-page',
  standalone: true,
  imports: [
    TitleCasePipe,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonFooter, IonIcon, IonSpinner,
    IonTabBar, IonTabButton,
    SurahActionsComponent,
  ],
  templateUrl: './quran-browse.page.html',
  styleUrl: './quran-browse.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranBrowsePage implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly quranReader = inject(QuranReaderService);

  @ViewChild('cardsContainer') cardsContainer!: ElementRef<HTMLElement>;

  readonly surahs = signal<QuranSurahListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly typeFilter = signal<'all' | 'makki' | 'madani'>('all');
  readonly viewMode = signal<'grid' | 'list'>('list');

  readonly filteredSurahs = computed(() => {
    const raw = this.searchQuery().trim();
    const t = this.typeFilter();

    // Split into tokens — "Yusuf 12" or "YUSUF" or "يوسف" or "12" all work
    const tokens = raw
      .split(/\s+/)
      .map(tok => tok.toLowerCase())
      .filter(tok => tok.length > 0);

    return this.surahs().filter(s => {
      if (tokens.length > 0) {
        // Normalize: strip diacritics for Latin, keep Arabic as-is
        const normalize = (str: string) =>
          str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const name  = normalize(s.transliteratedName);
        const eng   = normalize(s.englishName ?? '');
        const ar    = s.arabicName; // Arabic exact match
        const slug  = normalize(s.slug ?? '');
        const num   = String(s.surahNumber);

        // Every token must hit at least one field
        const matchSearch = tokens.every(tok => {
          const normTok = normalize(tok);
          return (
            name.includes(normTok)  ||
            eng.includes(normTok)   ||
            slug.includes(normTok)  ||
            ar.includes(tok)        || // Arabic — no normalize
            num === tok             ||
            num.includes(tok)
          );
        });
        if (!matchSearch) return false;
      }

      return t === 'all' || s.revelationType === t;
    });
  });

  constructor() {
    addIcons({ chevronForwardOutline, infiniteOutline, moonOutline, sunnyOutline, gridOutline, reorderThreeOutline, searchOutline });
  }

  ngOnInit(): void {
    this.quranReader.getSurahs().subscribe({
      next: res => {
        this.surahs.set(res.surahs ?? []);
        this.loading.set(false);
        setTimeout(() => this.animateCards(), 16);
      },
      error: err => {
        this.error.set(err?.message ?? 'Failed to load surahs');
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {}

  animateCards(): void {
    const el = this.cardsContainer?.nativeElement;
    if (!el) return;
    const items = el.querySelectorAll('.surah-card, .surah-row');
    if (!items.length) return;

    gsap.fromTo(items,
      { opacity: 0, y: 18, scale: 0.97 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.4, stagger: 0.018,
        ease: 'power3.out',
        clearProps: 'transform',
      }
    );
  }

  setSearch(value: string): void { this.searchQuery.set(value); }
  setTypeFilter(v: 'all' | 'makki' | 'madani'): void { this.typeFilter.set(v); }
  setViewMode(v: 'grid' | 'list'): void {
    this.viewMode.set(v);
    setTimeout(() => this.animateCards(), 16);
  }

  navigateToSurah(surahId: number): void {
    this.router.navigate(['/quran', 'sura', surahId]);
  }
}
