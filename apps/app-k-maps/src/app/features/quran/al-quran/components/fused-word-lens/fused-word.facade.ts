import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  FiveLensEntry,
  FiveLensLexiconService,
  QuranWord,
} from '../../../../../shared/services/ar-linguistics/five-lens-lexicon.service';
import {
  QrMorphOccurrence,
  QrWordStudyService,
} from '../../../../../shared/services/quran/qr-word-study.service';
import { WordExtrasService } from './word-extras.service';
import { FusedWordVM, LexRow } from './fused-word.models';

const LEX_LABELS: Record<string, string> = {
  ketabonline_ibn_manzur_lisan_al_arab: 'Lisān al-ʿArab',
  ketabonline_al_zabidi_taj_al_arus: 'Tāj al-ʿArūs',
  ketabonline_al_raghib_mufradat: 'Mufradāt',
  ketabonline_al_fayyumi_misbah_munir: 'Miṣbāḥ al-Munīr',
  ketabonline_al_jawhari_al_sihah: 'al-Ṣiḥāḥ',
  saaid_maqayis_al_lugha: 'Maqāyīs al-Lugha',
  thahabi_al_khalil_kitab_al_ayn: 'Kitāb al-ʿAyn',
  qomra_al_qamus_al_muhit: 'al-Qāmūs al-Muḥīṭ',
  qomra_al_ubab_al_zakhir: 'al-ʿUbāb al-Zākhir',
  lane_lexicon: 'Lane',
};

/**
 * Assembles a FusedWordVM for a tapped word: Five-Lens (senses, ṣarf,
 * constellation, lexica, hook, āyah, occurrences) + QR (examples) + the extra
 * panels (verb government, antonyms, idioms, tafsīr). Display-only.
 */
@Injectable({ providedIn: 'root' })
export class FusedWordFacade {
  private readonly lexicon = inject(FiveLensLexiconService);
  private readonly qrWords = inject(QrWordStudyService);
  private readonly extras = inject(WordExtrasService);

  load(
    word: QuranWord,
    opts: { pos?: string; level?: string } = {},
  ): Observable<FusedWordVM | null> {
    const root = (word.root ?? '').trim();
    if (!root) return of(null);

    return forkJoin({
      entry: this.lexicon.getFiveLens(root),
      morph: this.qrWords.getMorphologyByRoot(root),
      vg: this.extras.verbGovernment(root),
      ant: this.extras.antonyms(root),
      idioms: this.extras.idioms(root),
      tafsir: this.extras.tafsir(word.surah, word.ayah),
    }).pipe(
      switchMap((d) =>
        this.qrWords.getExamples(this.pickExamples(d.morph)).pipe(
          map((examples) => ({ ...d, examples })),
        ),
      ),
      map((d) => this.assemble(word, opts, d)),
    );
  }

  private assemble(
    word: QuranWord,
    opts: { pos?: string; level?: string },
    d: {
      entry: FiveLensEntry;
      morph: QrMorphOccurrence[];
      vg: FusedWordVM['verbGovernment'];
      ant: FusedWordVM['antonyms'];
      idioms: FusedWordVM['idioms'];
      tafsir: FusedWordVM['tafsir'];
      examples: { ref: string; ar: string; text: string }[];
    },
  ): FusedWordVM {
    const e = d.entry;
    const en = e.entry;
    const ref = `${word.surah}:${word.ayah}`;

    const lexica: LexRow[] = (e.lexica ?? []).map((lx) => ({
      source: LEX_LABELS[lx.source] ?? this.humanize(lx.source),
      ar: lx.lang === 'ar' ? lx.text : undefined,
      en: lx.lang === 'en' ? lx.text : undefined,
    }));

    const variants = (e.constellation?.nodes ?? [])
      .slice(0, 6)
      .map((n) => ({ ar: n.ar, pos: n.pos ?? '', gloss: n.en ?? '' }));

    const iraabLens = (e.lenses ?? []).find((l) => l.headingAr === 'إعراب');

    return {
      pos: opts.pos ?? 'كلمة · Word',
      level: opts.level ?? `${en?.surahNameAr ?? ''} · ${ref}`.trim(),

      lemmaAr: en?.lemmaAr ?? word.text,
      translit: en?.translit ?? '',
      sense: en?.sense ?? '',
      rootSpaced: en?.rootSpaced ?? root(word),
      pattern: en?.pattern ?? undefined,
      ref,
      surahNameAr: en?.surahNameAr ?? e.ayah?.surahName ?? undefined,
      ayahAr: e.ayah?.titleAr ?? undefined,
      ayahEn: e.ayah?.titleEn ?? undefined,

      coreAr: undefined,
      coreEn: undefined,
      senses: (e.meaning?.senses ?? []).map((s) => ({ ar: s.ar, en: s.en })),

      ingredients: en
        ? {
            rootAr: en.rootSpaced,
            rootGloss: 'root',
            patternAr: en.pattern ?? '',
            patternGloss: 'pattern',
            synthesisAr: en.sense ?? '',
          }
        : undefined,

      hook: e.retention
        ? {
            line: e.retention.hook,
            anchors: e.retention.anchors ?? [],
            figureSvg: e.figure?.html ?? undefined,
            figureCap: e.figure?.label ?? undefined,
          }
        : undefined,

      verbGovernment: d.vg ?? [],
      sarf: (e.morphology?.forms ?? []).map((f) => ({
        form: f.form,
        wazn: f.wazn,
        past: f.past,
        present: f.present,
        masdar: f.masdar,
      })),
      iraab: iraabLens
        ? { sourceLabel: 'al-Iʿrāb', ar: undefined, en: undefined }
        : undefined,

      tafsir: d.tafsir ?? [],
      lexica,
      sinai: { text: '', pending: true },

      constellation: e.constellation
        ? {
            root: e.constellation.root,
            nodes: e.constellation.nodes.map((n) => ({
              ar: n.ar,
              en: n.en,
              isQuran: n.isQuran,
            })),
          }
        : undefined,
      nearSynonyms: [],
      antonyms: d.ant ?? [],
      idioms: d.idioms ?? [],
      variants,

      occurrences: e.occurrences?.refs ?? [],
      currentRef: ref,
      examples: (d.examples ?? []).map((x) => ({
        ar: x.ar,
        en: x.text,
        ref: x.ref,
      })),
    };
  }

  /** One representative occurrence per distinct lemma, capped. */
  private pickExamples(
    rows: QrMorphOccurrence[],
  ): { surah: number; ayah: number; wordAr: string }[] {
    const seen = new Set<string>();
    const out: { surah: number; ayah: number; wordAr: string }[] = [];
    for (const r of rows) {
      const key = r.lemmaAr ?? r.ref;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ surah: r.surah, ayah: r.ayah, wordAr: r.wordAr });
      if (out.length >= 6) break;
    }
    return out;
  }

  private humanize(slug: string): string {
    return slug
      .replace(/^[a-z]+_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function root(word: QuranWord): string {
  return (word.root ?? '').split('').join(' ');
}
