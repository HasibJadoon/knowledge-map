// ─── Surah Profile schemas & types ────────────────────────────────────────────

// ── qr_surah_profiles ─────────────────────────────────────────────────────────

export type SurahProfileAddresseeType =
  | 'believers'
  | 'prophet'
  | 'mankind'
  | 'all'
  | 'implied';

export type SurahProfileToneType =
  | 'exhortative'
  | 'narrative'
  | 'argumentative'
  | 'legislative'
  | 'consolatory';

export interface QrSurahProfile {
  surah: number;                          // PK — 1–114
  governing_movement: string | null;
  central_claim: string | null;
  opening_force: string | null;
  closure_force: string | null;
  dominant_addressee: SurahProfileAddresseeType | string | null;
  dominant_tone: SurahProfileToneType | string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrSurahProfileUpsert {
  governing_movement?: string | null;
  central_claim?: string | null;
  opening_force?: string | null;
  closure_force?: string | null;
  dominant_addressee?: string | null;
  dominant_tone?: string | null;
  note_md?: string | null;
}

// ── qr_surah_atomic_profiles ──────────────────────────────────────────────────

export type SurahStructuralType =
  | 'linear_escalation'
  | 'ring_concentric'
  | 'diamond_cross'
  | 'parallel_panels'
  | 'staircase'
  | 'mirror_symmetry'
  | 'mosaic'
  | 'mixed';

export interface QrSurahAtomicProfile {
  surah: number;                          // PK — 1–114
  atomic_center: string;
  atomic_center_ar: string | null;
  structural_type: SurahStructuralType | string;
  structural_type_note: string | null;
  resolution_pattern: string | null;
  interpretive_lens: string | null;
  note_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrSurahAtomicProfileUpsert {
  atomic_center?: string;
  atomic_center_ar?: string | null;
  structural_type?: string;
  structural_type_note?: string | null;
  resolution_pattern?: string | null;
  interpretive_lens?: string | null;
  note_md?: string | null;
}

// ── qr_surah_ayah_meta (from 001_corpus_base.sql) ────────────────────────────

export interface QrSurahAyahMeta {
  surah: number;
  ayah: number;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;
  manzil: number | null;
  sajda: boolean;
}

export interface QrSurahAyahMetaUpsert {
  juz?: number | null;
  hizb?: number | null;
  ruku?: number | null;
  manzil?: number | null;
  sajda?: boolean;
}

// ── Validators ────────────────────────────────────────────────────────────────

export function validateQrSurahProfileUpsert(
  body: unknown,
): { data: QrSurahProfileUpsert } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const data: QrSurahProfileUpsert = {};

  if ('governing_movement' in b) {
    if (b.governing_movement !== null && typeof b.governing_movement !== 'string')
      return { error: 'governing_movement must be a string or null' };
    data.governing_movement = b.governing_movement as string | null;
  }
  if ('central_claim' in b) {
    if (b.central_claim !== null && typeof b.central_claim !== 'string')
      return { error: 'central_claim must be a string or null' };
    data.central_claim = b.central_claim as string | null;
  }
  if ('opening_force' in b) {
    if (b.opening_force !== null && typeof b.opening_force !== 'string')
      return { error: 'opening_force must be a string or null' };
    data.opening_force = b.opening_force as string | null;
  }
  if ('closure_force' in b) {
    if (b.closure_force !== null && typeof b.closure_force !== 'string')
      return { error: 'closure_force must be a string or null' };
    data.closure_force = b.closure_force as string | null;
  }
  if ('dominant_addressee' in b) {
    if (b.dominant_addressee !== null && typeof b.dominant_addressee !== 'string')
      return { error: 'dominant_addressee must be a string or null' };
    data.dominant_addressee = b.dominant_addressee as string | null;
  }
  if ('dominant_tone' in b) {
    if (b.dominant_tone !== null && typeof b.dominant_tone !== 'string')
      return { error: 'dominant_tone must be a string or null' };
    data.dominant_tone = b.dominant_tone as string | null;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string')
      return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md as string | null;
  }

  return { data };
}

export function validateQrSurahAtomicProfileUpsert(
  body: unknown,
): { data: QrSurahAtomicProfileUpsert } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const data: QrSurahAtomicProfileUpsert = {};

  if ('atomic_center' in b) {
    if (typeof b.atomic_center !== 'string' || !b.atomic_center.trim())
      return { error: 'atomic_center must be a non-empty string' };
    data.atomic_center = b.atomic_center as string;
  }
  if ('atomic_center_ar' in b) {
    if (b.atomic_center_ar !== null && typeof b.atomic_center_ar !== 'string')
      return { error: 'atomic_center_ar must be a string or null' };
    data.atomic_center_ar = b.atomic_center_ar as string | null;
  }
  if ('structural_type' in b) {
    if (typeof b.structural_type !== 'string' || !b.structural_type.trim())
      return { error: 'structural_type must be a non-empty string' };
    data.structural_type = b.structural_type as string;
  }
  if ('structural_type_note' in b) {
    if (b.structural_type_note !== null && typeof b.structural_type_note !== 'string')
      return { error: 'structural_type_note must be a string or null' };
    data.structural_type_note = b.structural_type_note as string | null;
  }
  if ('resolution_pattern' in b) {
    if (b.resolution_pattern !== null && typeof b.resolution_pattern !== 'string')
      return { error: 'resolution_pattern must be a string or null' };
    data.resolution_pattern = b.resolution_pattern as string | null;
  }
  if ('interpretive_lens' in b) {
    if (b.interpretive_lens !== null && typeof b.interpretive_lens !== 'string')
      return { error: 'interpretive_lens must be a string or null' };
    data.interpretive_lens = b.interpretive_lens as string | null;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string')
      return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md as string | null;
  }

  return { data };
}

export function validateQrSurahAyahMetaUpsert(
  body: unknown,
): { data: QrSurahAyahMetaUpsert } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const data: QrSurahAyahMetaUpsert = {};

  for (const field of ['juz', 'hizb', 'ruku', 'manzil'] as const) {
    if (field in b) {
      if (b[field] !== null && typeof b[field] !== 'number')
        return { error: `${field} must be a number or null` };
      data[field] = b[field] as number | null;
    }
  }
  if ('sajda' in b) {
    if (typeof b.sajda !== 'boolean') return { error: 'sajda must be a boolean' };
    data.sajda = b.sajda;
  }

  return { data };
}
