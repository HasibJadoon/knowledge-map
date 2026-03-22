import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import gsap from 'gsap';
import { KMapsService, QuranAyah, AyahsSurah, TranslationPassage } from '../../../shared/services/k-maps.service';

export type ViewMode = 'verse' | 'arabic' | 'translation';

// Shown for every surah except At-Tawbah (9) which has no Bismillah
const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

@Component({
  selector: 'km-quran-text',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './quran-text.component.html',
  styleUrl: './quran-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranTextComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kmaps = inject(KMapsService);

  @ViewChild('contentEl') contentEl!: ElementRef<HTMLElement>;

  readonly bismillah = BISMILLAH;

  /** U+06DD glyph only — the ornate empty circle frame from UthmanicHafs.
   *  Rendered large so the arabesque border is visible; digit overlaid via CSS. */
  getVerseMarkFrame(): string {
    return '\u06DD';
  }

  /** Arabic-Indic digits only, stripped of U+06DD prefix.
   *  Positioned absolutely in the centre of the U+06DD frame. */
  getVerseMarkDigits(ayah: QuranAyah): string {
    return (ayah.verse_mark ?? '').replace(/^\u06DD/, '');
  }

  /** Arabic-Indic digits only — U+06DD stripped, rendered in AmiriQuran font. */
  getVerseMark(ayah: QuranAyah): string {
    return (ayah.verse_mark ?? '').replace(/^\u06DD/, '');
  }

  /** @deprecated */
  verseMarker(_n: number): string {
    return '';
  }

  surahId = signal<number>(1);
  surahInfo = signal<AyahsSurah | null>(null);
  ayahs = signal<QuranAyah[]>([]);
  passages = signal<TranslationPassage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewMode = signal<ViewMode>('arabic');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 1;
    this.surahId.set(id);
    this.loadAyahs(id);
  }

  ngAfterViewInit(): void {
    const header = this.contentEl?.nativeElement?.querySelector('.page-header');
    if (header) {
      gsap.fromTo(
        header,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.animateContent();
  }

  retry(): void {
    this.loadAyahs(this.surahId());
  }

  get shouldShowBismillah(): boolean {
    // At-Tawbah (9) is the only surah without a Bismillah opening
    return this.surahId() !== 9;
  }

  // Group ayahs by Mushaf page number for the paginated Arabic view.
  // Ayahs with no page_number fall into page 0 (no divider shown).
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

  // Prepared for morphology / lexicon lookup — full logic to be added later
  onWordClick(_word: string, _ayah: QuranAyah): void {}

  /** Clean verse body — text_uthmani_clean has no verse number or U+06DD. */
  getAyahBody(ayah: QuranAyah): string {
    return (ayah.text_uthmani_clean ?? ayah.text_uthmani ?? ayah.text ?? '').trimEnd();
  }

  /** @deprecated verse_mark is now served directly from DB via getVerseMark(). */
  getAyahMarker(ayah: QuranAyah): string {
    return ayah.verse_mark ?? '';
  }

  getWords(ayah: QuranAyah): string[] {
    // text_uthmani_clean is pre-stripped (no verse number, no U+06DD)
    const src = ayah.text_uthmani_clean ?? ayah.text_uthmani ?? ayah.text ?? '';
    return src.split(/\s+/).filter(w => w.length > 0);
  }

  toArabicIndic(n: number): string {
    return n.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  private loadAyahs(surah: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.kmaps.getAyahs(surah).subscribe({
      next: (res) => {
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
    // Wait one frame so Angular has flushed the DOM update
    setTimeout(() => {
      if (!this.contentEl?.nativeElement) return;
      const el = this.contentEl.nativeElement;
      const mode = this.viewMode();

      if (mode === 'arabic') {
        // Fade in the mushaf text block
        const wrap = el.querySelector('.mushaf-wrap');
        if (wrap) {
          gsap.fromTo(wrap, { opacity: 0, y: 14 }, {
            opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform',
          });
        }

        // Animate each page-break: lines grow from center, badge fades in
        const breaks = el.querySelectorAll<HTMLElement>('.page-break');
        breaks.forEach((pb, i) => {
          const lines = pb.querySelectorAll<HTMLElement>('.page-break__line');
          const badge = pb.querySelector<HTMLElement>('.page-break__num');
          const delay = 0.3 + i * 0.08;

          gsap.fromTo(pb, { opacity: 0 }, { opacity: 1, duration: 0.01, delay });
          lines.forEach(line => {
            gsap.fromTo(line,
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.7, delay, ease: 'power3.out', clearProps: 'transform' }
            );
          });
          if (badge) {
            gsap.fromTo(badge,
              { opacity: 0, scale: 0.6 },
              { opacity: 0.75, scale: 1, duration: 0.45, delay: delay + 0.15, ease: 'back.out(1.7)', clearProps: 'transform' }
            );
          }
        });
      } else {
        const selectors: Record<ViewMode, string> = {
          verse: '.vrow',
          arabic: '.mushaf-wrap',
          translation: '.t-row',
        };
        const targets = el.querySelectorAll(selectors[mode]);
        if (!targets.length) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.48, stagger: 0.038, ease: 'power2.out', clearProps: 'transform' }
        );

        // Animate page-break dividers after rows
        const breaks = el.querySelectorAll<HTMLElement>('.page-break');
        breaks.forEach((pb, i) => {
          const lines = pb.querySelectorAll<HTMLElement>('.page-break__line');
          const badge = pb.querySelector<HTMLElement>('.page-break__num');
          const delay = 0.4 + i * 0.06;
          gsap.fromTo(pb, { opacity: 0 }, { opacity: 1, duration: 0.01, delay });
          lines.forEach(line => {
            gsap.fromTo(line,
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.6, delay, ease: 'power3.out', clearProps: 'transform' }
            );
          });
          if (badge) {
            gsap.fromTo(badge,
              { opacity: 0, scale: 0.6 },
              { opacity: 0.75, scale: 1, duration: 0.4, delay: delay + 0.15, ease: 'back.out(1.7)', clearProps: 'transform' }
            );
          }
        });
      }
    }, 16);
  }

  back(): void {
    this.router.navigate(['/quran']);
  }
}
