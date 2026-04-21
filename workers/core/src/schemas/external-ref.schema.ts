// ─── External Ref schemas & types ─────────────────────────────────────────────

// core_external_refs
export interface ExternalRef {
  id: string;                                           // CORE:ULID
  legacy_source: string;                                // e.g. 'knowledgemap'|'old_wv'|'import_v1'
  legacy_id: string;
  legacy_type: string | null;                           // old table/type name
  new_module: string;                                   // module code: 'QR'|'AL'|'WV'|'CM'|etc.
  new_typed_ref: string;                                // 'QR:<id>' | 'AL:<id>' etc.
  migration_batch: string | null;
  note: string | null;
  migrated_at: string;
}

export interface ExternalRefCreate {
  legacy_source: string;
  legacy_id: string;
  legacy_type?: string;
  new_module: string;
  new_typed_ref: string;
  migration_batch?: string;
  note?: string;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateExternalRefCreate(
  body: unknown,
): { data: ExternalRefCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.legacy_source !== 'string' || !b.legacy_source.trim())
    return { error: 'legacy_source is required' };
  if (typeof b.legacy_id !== 'string' || !b.legacy_id.trim())
    return { error: 'legacy_id is required' };
  if (typeof b.new_module !== 'string' || !b.new_module.trim())
    return { error: 'new_module is required' };
  if (typeof b.new_typed_ref !== 'string' || !b.new_typed_ref.trim())
    return { error: 'new_typed_ref is required' };

  // Validate typed ref format — must contain a colon
  if (!b.new_typed_ref.includes(':'))
    return { error: 'new_typed_ref must be in MODULE:ID format (e.g. QR:01HW...)' };

  const data: ExternalRefCreate = {
    legacy_source: b.legacy_source.trim(),
    legacy_id: b.legacy_id.trim(),
    new_module: b.new_module.trim().toUpperCase(),
    new_typed_ref: b.new_typed_ref.trim(),
  };

  if (typeof b.legacy_type === 'string') data.legacy_type = b.legacy_type;
  if (typeof b.migration_batch === 'string') data.migration_batch = b.migration_batch;
  if (typeof b.note === 'string') data.note = b.note;

  return { data };
}
