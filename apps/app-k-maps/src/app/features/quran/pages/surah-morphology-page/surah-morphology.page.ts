import {
  ChangeDetectionStrategy, Component, OnInit,
  computed, inject, signal,
} from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BackendApiService } from '../../../../shared/services/core/backend-api.service';

// ── Raw shapes from qr/surahs/:id/reader ─────────────────────────────────────
interface QrWord {
  text?: string | null;
  simple?: string | null;
  word_diacritic?: string | null;
  ar_u_token?: string | null;
  token_index?: number | null;
  root?: string | null;
  lemma_text?: string | null;
}

interface QrAyah {
  surah: number;
  ayah: number;
  words?: QrWord[];
}

interface QrReaderResponse {
  results?: QrAyah[];
  data?: QrAyah[] | { results?: QrAyah[] };
}

// ── View model ────────────────────────────────────────────────────────────────
export type MorphFilter = 'all' | 'noun' | 'verb' | 'particle';

export interface MorphWordVm {
  text: string | null;
  root: string | null;
  lemma_text: string | null;
  surah: number;
  ayah: number;
  token_index: number;
  pos: MorphFilter;
  posLabel: string;
  caseOrTense: string;
}

function parsePosToken(token: string | null | undefined): { pos: MorphFilter; label: string; caseOrTense: string } {
  if (!token) return { pos: 'particle', label: 'Particle', caseOrTense: '' };
  const t = token.toUpperCase();
  if (/^(V|IV|PV|CV|IMPV|PASS\.V)/.test(t)) {
    const tense = t.startsWith('IV') ? 'Imperfect' : (t.startsWith('CV') || t.includes('IMPV')) ? 'Command' : 'Perfect';
    return { pos: 'verb', label: 'Verb', caseOrTense: tense };
  }
  if (/^(N\b|PN\b|ADJ\b|N:|PN:|ADJ:)/.test(t)) {
    const caseMatch = t.match(/:(NOM|ACC|GEN)/);
    const nounCase = caseMatch ? caseMatch[1].charAt(0) + caseMatch[1].slice(1).toLowerCase() : '';
    return { pos: 'noun', label: t.startsWith('PN') ? 'Proper Noun' : 'Noun', caseOrTense: nounCase };
  }
  return { pos: 'particle', label: 'Particle', caseOrTense: '' };
}

@Component({
  selector: 'app-surah-morphology-page',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-morphology.page.html',
  styleUrl: './surah-morphology.page.scss',
})
export class SurahMorphologyPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api   = inject(BackendApiService);

  readonly surahId  = signal(0);
  readonly allWords = signal<MorphWordVm[]>([]);
  readonly filter   = signal<MorphFilter>('all');
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

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

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);

    this.api.getData<QrReaderResponse>('qr', ['surahs', id, 'reader'], {
      params: new HttpParams().set('page_size', '400'),
    }).subscribe({
      next: (res) => {
        const payload = res as unknown as QrReaderResponse;
        const ayahs: QrAyah[] =
          payload?.results ??
          (Array.isArray((payload as any)?.data) ? (payload as any).data : null) ??
          (payload as any)?.data?.results ??
          [];
        const words: MorphWordVm[] = [];
        for (const ayah of ayahs) {
          for (const w of ayah.words ?? []) {
            if (!w.text && !w.simple && !w.word_diacritic) continue;
            const { pos, label, caseOrTense } = parsePosToken(w.ar_u_token);
            words.push({
              text: w.text ?? w.word_diacritic ?? w.simple ?? null,
              root: w.root ?? null,
              lemma_text: w.lemma_text ?? null,
              surah: ayah.surah,
              ayah: ayah.ayah,
              token_index: w.token_index ?? 0,
              pos, posLabel: label, caseOrTense,
            });
          }
        }
        this.allWords.set(words);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(e instanceof Error ? e.message : 'Failed to load morphology');
        this.loading.set(false);
      },
    });
  }

  setFilter(f: MorphFilter): void { this.filter.set(f); }
}
