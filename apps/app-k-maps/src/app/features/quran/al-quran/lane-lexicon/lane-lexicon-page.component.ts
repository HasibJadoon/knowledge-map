import {
  ChangeDetectionStrategy, Component, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlDictionaryApiService, LaneGroupedRow,
} from '../../../../shared/services/al-dictionary-api.service';

// ── Local types ───────────────────────────────────────────────────────────────

type LaneStatus = 'clean' | 'needs_review' | 'raw' | 'broken';

interface LaneEntry {
  id:                string;
  headingAr:         string;
  pageLabel:         string | null;
  definitionPreview: string;
  definitionFull:    string;
  forms:             string[];
  status:            LaneStatus;
  statusLabel:       string;
  warnings:          string[];
}

// ── Arabic helpers ────────────────────────────────────────────────────────────

const ARABIC_RE  = /[؀-ۿ]/;
const TASHKIL_RE = /[ً-ٰٟـ]/g;

function stripTashkil(s: string): string { return s.replace(TASHKIL_RE, '').replace(/ـ/g, ''); }
function isMostlyLatin(s: string): boolean {
  return (s.match(/[A-Za-z]/g) ?? []).length > (s.match(/[؀-ۿ]/g) ?? []).length;
}
function firstArabic(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) if (v && ARABIC_RE.test(v) && !isMostlyLatin(v)) return v.trim();
  return null;
}
function parseForms(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split('·').map(x => x.trim()).filter(x => x && ARABIC_RE.test(x));
}

// ── Definition repair ─────────────────────────────────────────────────────────

const MISSING_AR = '[صيغة ناقصة]';

function pickAorist(forms: string[]): string | null {
  return forms.find(f => stripTashkil(f).startsWith('ي')) ?? null;
}
function pickInfinitive(forms: string[]): string | null {
  return forms.find(f => /[ًٌٍةال]/.test(f) || stripTashkil(f).length >= 3) ?? null;
}
function pickSynonym(forms: string[], inf: string | null): string | null {
  return forms.find(f => f !== inf) ?? null;
}

function buildDisplay(raw: string, forms: string[]): string {
  let t = raw.trim()
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  t = t.replace(/\[◌\]|\[form missing\]/g, '( )');
  t = t.replace(/\band\s+and\b/g, 'and');
  const aor = pickAorist(forms);
  const inf  = pickInfinitive(forms);
  const syn  = pickSynonym(forms, inf);
  t = t.replace(/\baor\.\s+(?:\(\s*\)\s*)?(,)/g, `aor. ${aor ?? MISSING_AR}$1`);
  t = t.replace(/\binf\.\s*n\.\s+(?:\(\s*\)\s*)?(,)/g, `inf. n. ${inf ?? MISSING_AR}$1`);
  t = t.replace(/\bsyn\.\s+(?:\(\s*\)\s*)?(:)/g, `syn. ${syn ?? MISSING_AR}$1`);
  t = t.replace(/\(\s*\)/g, MISSING_AR);
  t = t.replace(/,\s*,+/g, ',').replace(/;\s*;+/g, ';').replace(/\s{2,}/g, ' ');
  return t.trim();
}

function makePreview(text: string, max = 160): string {
  const c = text.replace(/\[صيغة ناقصة\]/g, '…');
  return c.length <= max ? c : c.slice(0, max).replace(/\s+$/, '') + '…';
}

function classifyStatus(warnings: string[], def: string, heading: string): LaneStatus {
  if (!heading || heading === 'عنوان غير متوفر') return 'broken';
  if (!def || def.length < 20) return 'raw';
  if (warnings.some(w => ['remaining_missing_form', 'empty_aor_slot', 'empty_infinitive_slot',
                            'empty_synonym_slot', 'duplicate_and'].includes(w))) return 'needs_review';
  return 'clean';
}

const STATUS_LABELS: Record<LaneStatus, string> = {
  clean: 'قابل للعرض', needs_review: 'يحتاج مراجعة', raw: 'خام', broken: 'ناقص',
};

const WARNING_LABELS: Record<string, string> = {
  missing_heading: 'عنوان غير متوفر', missing_definition: 'تعريف غير متوفر',
  empty_aor_slot: 'خانة المضارع ناقصة', empty_infinitive_slot: 'خانة المصدر ناقصة',
  empty_synonym_slot: 'خانة المرادف ناقصة', empty_parentheses: 'أقواس فارغة',
  duplicate_and: 'تكرار لغوي أُصلح للعرض', remaining_missing_form: 'بقيت صيغة ناقصة',
};

function getWarnings(headingAr: string, raw: string, display: string): string[] {
  const w: string[] = [];
  if (!headingAr || headingAr === 'عنوان غير متوفر') w.push('missing_heading');
  if (!raw || raw.trim().length < 20) w.push('missing_definition');
  if (/\baor\.\s+,/.test(raw)) w.push('empty_aor_slot');
  if (/\binf\.\s*n\.\s*,/.test(raw)) w.push('empty_infinitive_slot');
  if (/\bsyn\.\s*:/.test(raw)) w.push('empty_synonym_slot');
  if (/\(\s*\)/.test(raw)) w.push('empty_parentheses');
  if (/\band\s+and\b/.test(raw)) w.push('duplicate_and');
  if (display.includes('[صيغة ناقصة]')) w.push('remaining_missing_form');
  return w;
}

function mapRow(row: LaneGroupedRow): LaneEntry {
  const headingAr   = firstArabic(row.heading_block_ar, row.display_heading_ar, row.lemma_text) ?? 'عنوان غير متوفر';
  const raw         = row.definition_block_en ?? row.definition_en ?? '';
  const forms       = parseForms(row.arabic_forms_text);
  const display     = buildDisplay(raw, forms);
  const warnings    = getWarnings(headingAr, raw, display);
  const status      = classifyStatus(warnings, display, headingAr);
  return {
    id: row.entry_id,
    headingAr,
    pageLabel:         row.page_label ?? (row.page_no ? `Lane p. ${row.page_no}` : null),
    definitionPreview: makePreview(display),
    definitionFull:    display,
    forms,
    status,
    statusLabel:       STATUS_LABELS[status],
    warnings,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-lane-lexicon-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './lane-lexicon-page.component.html',
  styleUrl:    './lane-lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaneLexiconPageComponent {
  private readonly api    = inject(AlDictionaryApiService);
  private readonly router = inject(Router);

  readonly searchTerm    = signal('');
  readonly loading       = signal(false);
  readonly entries       = signal<LaneEntry[]>([]);
  readonly totalCount    = signal(0);
  readonly error         = signal<string | null>(null);
  readonly selectedEntry = signal<LaneEntry | null>(null);

  readonly quickRoots = ['علم', 'كتب', 'قرأ', 'رحم', 'حمد', 'أمن', 'نزل', 'خلق'];

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => {
        const t = q.trim();
        if (!t) {
          this.entries.set([]);
          this.totalCount.set(0);
          this.error.set(null);
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
        this.error.set(null);
        return this.api.getLaneTableEntries(t).pipe(
          catchError(() => {
            this.error.set('تعذّر تحميل البيانات');
            this.loading.set(false);
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(res => {
      this.loading.set(false);
      if (!res) return;
      this.totalCount.set(res.total);
      this.entries.set(res.entries.map(mapRow));
    });
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  tryRoot(root: string): void { this.setSearch(root); }

  goBack(): void { this.router.navigate(['/quran/al-quran/lexicon']); }

  openEntry(entry: LaneEntry): void { this.selectedEntry.set(entry); }
  closeEntry(): void { this.selectedEntry.set(null); }

  warningLabel(w: string): string { return WARNING_LABELS[w] ?? w; }

  statusClass(status: LaneStatus): string {
    return `ll-status ll-status--${status}`;
  }
}
