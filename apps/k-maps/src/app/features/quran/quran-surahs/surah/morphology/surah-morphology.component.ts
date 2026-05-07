import {
  Component, OnInit, AfterViewInit, ViewChildren, QueryList,
  ElementRef, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { QuranApiService } from '../../../../../shared/services/quran/quran-api.service';
import { QuranAyahWord, QuranAyah } from '../../../../../shared/models/quran/quran.models';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../../shared/services/quran/quran-gsap.service';

export type MorphFilter = 'all' | 'noun' | 'verb' | 'particle';

export interface MorphWordVm extends QuranAyahWord {
  surah: number;
  ayah: number;
  pos: MorphFilter;        // derived from ar_u_token
  posLabel: string;        // human-readable role
  caseOrTense: string;     // case for nouns, tense for verbs
}

// Parse a minimal POS from QAC-style ar_u_token
function parsePosToken(token: string | null | undefined): { pos: MorphFilter; label: string; caseOrTense: string } {
  if (!token) return { pos: 'particle', label: 'Particle', caseOrTense: '' };
  const t = token.toUpperCase();
  // Verb patterns: V, IV (imperfect verb), PV (perfect verb), CV (command verb)
  if (/^(V|IV|PV|CV|IMPV|PASS\.V)/.test(t)) {
    const tense = t.startsWith('IV') ? 'Imperfect' : t.startsWith('CV') || t.includes('IMPV') ? 'Command' : 'Perfect';
    return { pos: 'verb', label: 'Verb', caseOrTense: tense };
  }
  // Noun patterns: N, PN (proper noun), ADJ
  if (/^(N\b|PN\b|ADJ\b|N:|PN:|ADJ:)/.test(t)) {
    const isProper = t.startsWith('PN');
    const caseMatch = t.match(/:(NOM|ACC|GEN)/);
    const nounCase = caseMatch ? caseMatch[1].charAt(0) + caseMatch[1].slice(1).toLowerCase() : '';
    return { pos: 'noun', label: isProper ? 'Proper Noun' : 'Noun', caseOrTense: nounCase };
  }
  return { pos: 'particle', label: 'Particle', caseOrTense: '' };
}

@Component({
  selector: 'km-surah-morphology',
  standalone: true,
  imports: [QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-morphology.component.html',
  styleUrl: './surah-morphology.component.scss',
})
export class SurahMorphologyComponent implements OnInit, AfterViewInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private qrApi  = inject(QuranApiService);
  private gsap   = inject(QuranGsapService);

  @ViewChildren('wordCard') cardEls!: QueryList<ElementRef>;

  surahId    = signal(0);
  allWords   = signal<MorphWordVm[]>([]);
  filter     = signal<MorphFilter>('all');
  loading    = signal(true);
  error      = signal<string | null>(null);

  readonly filters: { id: MorphFilter; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'noun',     label: 'Nouns' },
    { id: 'verb',     label: 'Verbs' },
    { id: 'particle', label: 'Particles' },
  ];

  readonly visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.allWords() : this.allWords().filter(w => w.pos === f);
  });

  ngAfterViewInit(): void {
    this.cardEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsap.revealOnScroll(els);
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);

    this.qrApi.getSurahReader(id).subscribe({
      next: (res) => {
        const ayahs: QuranAyah[] = (res as any)?.data?.results ?? (res as any)?.data ?? [];
        const words: MorphWordVm[] = [];
        for (const ayah of ayahs) {
          for (const w of ayah.words ?? []) {
            if (!w.text && !w.simple && !w.word_diacritic) continue;
            const { pos, label, caseOrTense } = parsePosToken(w.ar_u_token);
            words.push({ ...w, surah: ayah.surah, ayah: ayah.ayah, pos, posLabel: label, caseOrTense });
          }
        }
        this.allWords.set(words);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  setFilter(f: MorphFilter): void { this.filter.set(f); }

  back(): void { this.router.navigate(['/quran']); }
}
