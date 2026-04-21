// ─── Bridge schemas & types ───────────────────────────────────────────────

export interface QuranLink {
  id: string;
  al_entity_ref: string;   // AL:<ULID>
  al_entity_type: string;
  qr_scope_ref: string;    // QR:<ULID> or QR:surah:ayah
  link_type: string;
  note_md: string | null;
  confidence: number;
  created_at: string;
}

export interface QuranLinkCreate {
  al_entity_ref: string;
  al_entity_type: string;
  qr_scope_ref: string;
  link_type?: string;
  note_md?: string | null;
  confidence?: number;
}

export interface ArabicLink {
  id: string;
  al_entity_ref: string;   // AL:<ULID>
  al_entity_type: string;
  ar_entity_ref: string;   // AR:<ULID>
  ar_entity_type: string;
  link_type: string;
  note_md: string | null;
  created_at: string;
}

export interface ArabicLinkCreate {
  al_entity_ref: string;
  al_entity_type: string;
  ar_entity_ref: string;
  ar_entity_type: string;
  link_type?: string;
  note_md?: string | null;
}

export interface ContentLink {
  id: string;
  al_entity_ref: string;   // AL:<ULID>
  al_entity_type: string;
  cm_entity_ref: string;   // CM:<ULID>
  cm_entity_type: string;
  link_type: string;
  note_md: string | null;
  created_at: string;
}

export interface ContentLinkCreate {
  al_entity_ref: string;
  al_entity_type: string;
  cm_entity_ref: string;
  cm_entity_type: string;
  link_type?: string;
  note_md?: string | null;
}

export interface ProjectionCache {
  id: string;
  cache_key: string;
  cache_type: string;
  payload_json: string;
  source_refs: string | null;
  expires_at: string | null;
  created_at: string;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateQuranLinkCreate(body: unknown): SchemaValidationResult<QuranLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.al_entity_ref !== 'string' || !b.al_entity_ref.trim()) return { error: 'al_entity_ref is required and must be a non-empty string' };
  data.al_entity_ref = b.al_entity_ref.trim();
  if (typeof b.al_entity_type !== 'string' || !b.al_entity_type.trim()) return { error: 'al_entity_type is required and must be a non-empty string' };
  data.al_entity_type = b.al_entity_type.trim();
  if (typeof b.qr_scope_ref !== 'string' || !b.qr_scope_ref.trim()) return { error: 'qr_scope_ref is required and must be a non-empty string' };
  data.qr_scope_ref = b.qr_scope_ref.trim();
  if ('link_type' in b) {
    if (typeof b.link_type !== 'string') return { error: 'link_type must be a string' };
    data.link_type = b.link_type;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }
  if ('confidence' in b) {
    if (typeof b.confidence !== 'number' || !Number.isFinite(b.confidence)) return { error: 'confidence must be a number' };
    data.confidence = b.confidence;
  }

  return { data: data as unknown as QuranLinkCreate };
}

export function validateArabicLinkCreate(body: unknown): SchemaValidationResult<ArabicLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.al_entity_ref !== 'string' || !b.al_entity_ref.trim()) return { error: 'al_entity_ref is required and must be a non-empty string' };
  data.al_entity_ref = b.al_entity_ref.trim();
  if (typeof b.al_entity_type !== 'string' || !b.al_entity_type.trim()) return { error: 'al_entity_type is required and must be a non-empty string' };
  data.al_entity_type = b.al_entity_type.trim();
  if (typeof b.ar_entity_ref !== 'string' || !b.ar_entity_ref.trim()) return { error: 'ar_entity_ref is required and must be a non-empty string' };
  data.ar_entity_ref = b.ar_entity_ref.trim();
  if (typeof b.ar_entity_type !== 'string' || !b.ar_entity_type.trim()) return { error: 'ar_entity_type is required and must be a non-empty string' };
  data.ar_entity_type = b.ar_entity_type.trim();
  if ('link_type' in b) {
    if (typeof b.link_type !== 'string') return { error: 'link_type must be a string' };
    data.link_type = b.link_type;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ArabicLinkCreate };
}

export function validateContentLinkCreate(body: unknown): SchemaValidationResult<ContentLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.al_entity_ref !== 'string' || !b.al_entity_ref.trim()) return { error: 'al_entity_ref is required and must be a non-empty string' };
  data.al_entity_ref = b.al_entity_ref.trim();
  if (typeof b.al_entity_type !== 'string' || !b.al_entity_type.trim()) return { error: 'al_entity_type is required and must be a non-empty string' };
  data.al_entity_type = b.al_entity_type.trim();
  if (typeof b.cm_entity_ref !== 'string' || !b.cm_entity_ref.trim()) return { error: 'cm_entity_ref is required and must be a non-empty string' };
  data.cm_entity_ref = b.cm_entity_ref.trim();
  if (typeof b.cm_entity_type !== 'string' || !b.cm_entity_type.trim()) return { error: 'cm_entity_type is required and must be a non-empty string' };
  data.cm_entity_type = b.cm_entity_type.trim();
  if ('link_type' in b) {
    if (typeof b.link_type !== 'string') return { error: 'link_type must be a string' };
    data.link_type = b.link_type;
  }
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as ContentLinkCreate };
}
