import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonFooter, IonIcon, IonSpinner, IonTabBar, IonTabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline, languageOutline } from 'ionicons/icons';
import gsap from 'gsap';
import {
  QuranReaderService,
  QuranAyah,
  AyahsSurah,
  TranslationPassage,
} from '../../../../../shared/services/quran/quran-reader.service';

export type ViewMode = 'verse' | 'arabic' | 'translation';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

@Component({
  selector: 'app-quran-text',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonFooter, IonIcon, IonSpinner,
    IonTabBar, IonTabButton,
  ],
  templateUrl: './quran-text.component.html',
  styleUrl: './quran-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranTextComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly quranReader = inject(QuranReaderService);

  @ViewChild('contentEl', { read: ElementRef }) contentEl!: ElementRef<HTMLElement>;

  readonly bismillah = BISMILLAH;
  readonly surahId = signal<number>(1);
  readonly surahInfo = signal<AyahsSurah | null>(null);
  readonly ayahs = signal<QuranAyah[]>([]);
  readonly passages = signal<TranslationPassage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly viewMode = signal<ViewMode>('arabic');

  constructor() {
    addIcons({ listOutline, languageOutline });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 1;
    this.surahId.set(id);
    this.loadAyahs(id);
  }

  get shouldShowBismillah(): boolean {
    return this.surahId() !== 9;
  }

  get ayahsByPage(): { page: number; ayahs: QuranAyah[] }[] {
    const map = new Map<number, QuranAyah[]>();
    for (const ayah of this.ayahs()) {
      const p = ayah.page_number ?? 0;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(ayah);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([page, ayahs]) => ({ page, ayahs }));
  }

  getAyahBody(ayah: QuranAyah): string {
    return (ayah.text_uthmani_clean ?? ayah.text_uthmani ?? ayah.text ?? '').replace(/\s+$/, '');
  }

  getVerseMark(ayah: QuranAyah): string {
    return ayah.verse_mark ?? '';
  }

  getWords(ayah: QuranAyah): string[] {
    const src = ayah.text_uthmani_clean ?? ayah.text_uthmani ?? ayah.text ?? '';
    return src.split(/\s+/).filter(w => w.length > 0);
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.animateContent();
  }

  retry(): void { this.loadAyahs(this.surahId()); }

  private loadAyahs(surah: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.quranReader.getSurahAyahs(surah).subscribe({
      next: res => {
        this.surahInfo.set(res.surah ?? null);
        this.ayahs.set(res.results ?? res.verses ?? []);
        this.passages.set(res.translation_passages ?? []);
        this.loading.set(false);
        this.animateContent();
      },
      error: (err: Error) => {
        this.error.set(err?.message ?? 'Failed to load ayahs');
        this.loading.set(false);
      },
    });
  }

  private animateContent(): void {
    setTimeout(() => {
      const host = this.contentEl?.nativeElement;
      if (!host) return;
      const mode = this.viewMode();

      const selectors: Record<ViewMode, string> = {
        arabic: '.mushaf-flow',
        verse: '.vrow',
        translation: '.t-row',
      };

      const targets = host.querySelectorAll(selectors[mode]);
      if (targets.length) {
        gsap.fromTo(targets,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.42, stagger: 0.02, ease: 'power2.out', clearProps: 'transform' }
        );
      }

      // Animate page-break dividers
      const breaks = host.querySelectorAll<HTMLElement>('.page-break');
      breaks.forEach((pb, i) => {
        const delay = 0.2 + i * 0.07;
        gsap.fromTo(pb, { opacity: 0 }, { opacity: 1, duration: 0.01, delay });
        pb.querySelectorAll<HTMLElement>('.page-break__line').forEach(line =>
          gsap.fromTo(line, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, delay, ease: 'power3.out', clearProps: 'transform' })
        );
        const badge = pb.querySelector<HTMLElement>('.page-break__num');
        if (badge) gsap.fromTo(badge, { opacity: 0, scale: 0.6 }, { opacity: 0.75, scale: 1, duration: 0.4, delay: delay + 0.15, ease: 'back.out(1.7)', clearProps: 'transform' });
      });
    }, 16);
  }
}
