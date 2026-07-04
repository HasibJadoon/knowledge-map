// ─── QAC morphology parser ────────────────────────────────────────────────────
// Pure, I/O-free. Turns the QAC-derived `morphology_tag_json` stored on
// qr_word_occurrences into a structured sarf card with Arabic + English labels.
//
// Input shape (QAC-0.4), e.g. for آيَاتُ:
//   { source, raw, stem:{ tag:"N", flags:["FP","NOM"], features:{POS,LEM,ROOT},
//                         lemma_ar, root_ar, pos }, segments:[{kind,form_ar,tag,flags}] }
// Everything is defensive: the column may be a JSON string, an object, or null.

export interface QacSegment {
  kind: string;            // PREFIX | STEM | SUFFIX
  form_ar: string | null;
  tag: string | null;      // raw QAC tag (P, DET, N, PRON…)
  label_ar: string | null; // human label for the segment role
  role: 'prefix' | 'stem' | 'suffix';
}

export interface QacMorphology {
  pos: string | null;           // raw QAC pos code (N, V, PN, ADJ…)
  pos_ar: string | null;        // اسم / فعل / …
  pos_en: string | null;        // noun / verb / …
  case: string | null;          // nom | acc | gen
  case_ar: string | null;       // مرفوع / منصوب / مجرور
  state: string | null;         // definite | indefinite
  state_ar: string | null;      // معرفة / نكرة
  gender: string | null;        // m | f
  gender_ar: string | null;     // مذكّر / مؤنّث
  number: string | null;        // singular | dual | plural
  number_ar: string | null;     // مفرد / مثنّى / جمع
  person: string | null;        // 1 | 2 | 3
  aspect: string | null;        // perfect | imperfect | imperative
  aspect_ar: string | null;     // ماضٍ / مضارع / أمر
  voice: string | null;         // active | passive
  voice_ar: string | null;      // معلوم / مبني للمجهول
  form: string | null;          // I..XII (verb form / وزن)
  lemma_ar: string | null;
  root_ar: string | null;
  prefixes: QacSegment[];
  stem: QacSegment | null;
  suffixes: QacSegment[];
  raw: string | null;           // the raw QAC feature string, for provenance
}

type Rec = Record<string, unknown>;

function asObj(v: unknown): Rec | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return p && typeof p === 'object' && !Array.isArray(p) ? p as Rec : null; }
    catch { return null; }
  }
  return typeof v === 'object' && !Array.isArray(v) ? v as Rec : null;
}
function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

// ── label maps ────────────────────────────────────────────────────────────────

const POS_AR: Record<string, string> = {
  N: 'اسم', PN: 'اسم علم', ADJ: 'صفة', IMPN: 'اسم مبني', V: 'فعل', PRON: 'ضمير',
  DEM: 'اسم إشارة', REL: 'اسم موصول', T: 'ظرف زمان', LOC: 'ظرف مكان', P: 'حرف جر',
  CONJ: 'حرف عطف', SUB: 'حرف مصدري', ACC: 'حرف نصب', COND: 'أداة شرط', NEG: 'حرف نفي',
  INTG: 'أداة استفهام', DET: 'أداة تعريف', CERT: 'حرف تحقيق', RES: 'أداة حصر',
  EXP: 'حرف تفسير', INC: 'حرف ابتداء', SUR: 'حرف فجاءة', VOC: 'حرف نداء',
  EMPH: 'لام التوكيد', PRP: 'لام التعليل', FUT: 'حرف استقبال', INL: 'حروف مقطعة',
};
const POS_EN: Record<string, string> = {
  N: 'noun', PN: 'proper noun', ADJ: 'adjective', IMPN: 'indeclinable noun', V: 'verb',
  PRON: 'pronoun', DEM: 'demonstrative', REL: 'relative', T: 'time adverb', LOC: 'place adverb',
  P: 'preposition', CONJ: 'conjunction', SUB: 'subordinator', ACC: 'accusative particle',
  COND: 'conditional', NEG: 'negation', INTG: 'interrogative', DET: 'determiner',
  CERT: 'particle of certainty', RES: 'restriction', EXP: 'explanation', INC: 'inceptive',
  SUR: 'surprise', VOC: 'vocative', EMPH: 'emphatic lām', PRP: 'purpose lām',
  FUT: 'future particle', INL: 'disconnected letters',
};

const CASE_AR: Record<string, string> = { NOM: 'مرفوع', ACC: 'منصوب', GEN: 'مجرور' };
const CASE_EN: Record<string, string> = { NOM: 'nom', ACC: 'acc', GEN: 'gen' };
const ASPECT_AR: Record<string, string> = { PERF: 'ماضٍ', IMPF: 'مضارع', IMPV: 'أمر' };
const ASPECT_EN: Record<string, string> = { PERF: 'perfect', IMPF: 'imperfect', IMPV: 'imperative' };
const SEG_ROLE_AR: Record<string, string> = {
  DET: 'أل التعريف', P: 'حرف جر', CONJ: 'حرف عطف', EMPH: 'لام التوكيد', PRP: 'لام التعليل',
  FUT: 'حرف استقبال', PRON: 'ضمير متّصل', SUB: 'حرف مصدري', NEG: 'حرف نفي', VOC: 'حرف نداء',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ── core ──────────────────────────────────────────────────────────────────────

/** Parse the flags array of the STEM segment into structured features. */
function readFlags(flags: string[]): Partial<QacMorphology> {
  const out: Partial<QacMorphology> = {};
  for (const raw of flags) {
    const f = raw.toUpperCase();

    if (f === 'NOM' || f === 'ACC' || f === 'GEN') { out.case = CASE_EN[f]; out.case_ar = CASE_AR[f]; continue; }
    if (f === 'DEF') { out.state = 'definite'; out.state_ar = 'معرفة'; continue; }
    if (f === 'INDEF') { out.state = 'indefinite'; out.state_ar = 'نكرة'; continue; }
    if (f === 'PERF' || f === 'IMPF' || f === 'IMPV') { out.aspect = ASPECT_EN[f]; out.aspect_ar = ASPECT_AR[f]; continue; }
    if (f === 'PASS') { out.voice = 'passive'; out.voice_ar = 'مبني للمجهول'; continue; }
    if (f === 'ACT') { out.voice = 'active'; out.voice_ar = 'معلوم'; continue; }

    // Verb form: "(IV)", "(X)"…
    const form = /^\(([IVX]+)\)$/.exec(f);
    if (form) { out.form = form[1]; continue; }

    // Combined gender+number tokens: M, F, MS, FS, MD, FD, MP, FP, S, D, P
    if (/^[MF]?[SDP]$/.test(f) || f === 'M' || f === 'F') {
      if (f.includes('M')) { out.gender = 'm'; out.gender_ar = 'مذكّر'; }
      if (f.includes('F')) { out.gender = 'f'; out.gender_ar = 'مؤنّث'; }
      if (f.includes('S')) { out.number = 'singular'; out.number_ar = 'مفرد'; }
      if (f.includes('D')) { out.number = 'dual'; out.number_ar = 'مثنّى'; }
      if (f.includes('P')) { out.number = 'plural'; out.number_ar = 'جمع'; }
      continue;
    }

    // Person tokens for verbs/pronouns: 1S, 1P, 2MS, 2FP, 3MS, 3FS, 3MP, 3FP, 3D…
    const pgn = /^([123])(M|F)?(S|D|P)?$/.exec(f);
    if (pgn) {
      out.person = pgn[1];
      if (pgn[2] === 'M') { out.gender = 'm'; out.gender_ar = 'مذكّر'; }
      if (pgn[2] === 'F') { out.gender = 'f'; out.gender_ar = 'مؤنّث'; }
      if (pgn[3] === 'S') { out.number = 'singular'; out.number_ar = 'مفرد'; }
      if (pgn[3] === 'D') { out.number = 'dual'; out.number_ar = 'مثنّى'; }
      if (pgn[3] === 'P') { out.number = 'plural'; out.number_ar = 'جمع'; }
      continue;
    }
  }
  return out;
}

function readSegment(seg: Rec): QacSegment {
  const kind = (asStr(seg['kind']) ?? 'STEM').toUpperCase();
  const tag = asStr(seg['tag']);
  const role: QacSegment['role'] = kind === 'PREFIX' ? 'prefix' : kind === 'SUFFIX' ? 'suffix' : 'stem';
  const label_ar = tag ? (SEG_ROLE_AR[tag] ?? POS_AR[tag] ?? null) : null;
  return { kind, form_ar: asStr(seg['form_ar']), tag, label_ar, role };
}

const EMPTY: QacMorphology = {
  pos: null, pos_ar: null, pos_en: null, case: null, case_ar: null, state: null, state_ar: null,
  gender: null, gender_ar: null, number: null, number_ar: null, person: null,
  aspect: null, aspect_ar: null, voice: null, voice_ar: null, form: null,
  lemma_ar: null, root_ar: null, prefixes: [], stem: null, suffixes: [], raw: null,
};

/** Parse a qr_word_occurrences.morphology_tag_json value into a sarf card. */
export function parseQacMorphology(json: unknown): QacMorphology {
  const obj = asObj(json);
  if (!obj) return { ...EMPTY };

  const stem = asObj(obj['stem']) ?? {};
  const flags = asArr(stem['flags']).filter((x): x is string => typeof x === 'string');
  const feats = readFlags(flags);
  const pos = asStr(stem['pos']) ?? asStr(stem['tag']);

  const segRecs = asArr(obj['segments']).map(asObj).filter((s): s is Rec => !!s).map(readSegment);
  const prefixes = segRecs.filter(s => s.role === 'prefix');
  const suffixes = segRecs.filter(s => s.role === 'suffix');
  const stemSeg = segRecs.find(s => s.role === 'stem') ?? (stem ? readSegment(stem) : null);

  return {
    ...EMPTY,
    ...feats,
    pos,
    pos_ar: pos ? (POS_AR[pos] ?? null) : null,
    pos_en: pos ? (POS_EN[pos] ?? null) : null,
    form: feats.form ? formLabel(feats.form) : null,
    lemma_ar: asStr(stem['lemma_ar']),
    root_ar: asStr(stem['root_ar']),
    prefixes,
    stem: stemSeg,
    suffixes,
    raw: asStr(obj['raw']),
  };
}

/** Normalise "IV" → "IV (form 4)" style is left to the UI; keep the roman as-is. */
function formLabel(form: string): string {
  const idx = ROMAN.indexOf(form.toUpperCase());
  return idx >= 0 ? form.toUpperCase() : form;
}

/**
 * Coarse noun/verb classification used by vocabulary grouping.
 * QAC codes: V*→verb; N/PN/ADJ/IMPN→noun; everything else→other.
 */
export function posGroup(pos: string | null | undefined): 'verb' | 'noun' | 'other' {
  if (!pos) return 'other';
  const t = pos.toUpperCase();
  if (t === 'V' || t === 'VERB') return 'verb';
  if (t === 'N' || t === 'PN' || t === 'ADJ' || t === 'IMPN' || t === 'NOUN') return 'noun';
  return 'other';
}
