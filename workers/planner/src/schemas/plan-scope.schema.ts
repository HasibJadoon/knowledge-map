// ─── PlanScope schemas & types ────────────────────────────────────────────────

export type PlanScopeType =
  | 'source'
  | 'surah_range'
  | 'arabic_class'
  | 'wv_node'
  | 'cm_document'
  | 'custom';

export interface PlanScope {
  id: string;               // PL:ULID
  plan_id: string;
  title: string;
  scope_type: PlanScopeType;
  resource_ref: string | null;   // typed cross-module ref (e.g. 'WV:<id>', 'QR:2:1-286')
  resource_label: string | null; // denormalized display name — never truth
  total_units: number | null;
  completed_units: number;
  sort_order: number;
  meta_json: string | null;
  created_at: string;
}

export interface PlanScopeCreate {
  plan_id: string;
  title: string;
  scope_type?: PlanScopeType;
  resource_ref?: string | null;
  resource_label?: string | null;
  total_units?: number | null;
  sort_order?: number;
  meta_json?: string | null;
}

export interface PlanScopePatch {
  title?: string;
  scope_type?: PlanScopeType;
  resource_ref?: string | null;
  resource_label?: string | null;
  total_units?: number | null;
  sort_order?: number;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const SCOPE_TYPES: PlanScopeType[] = [
  'source', 'surah_range', 'arabic_class', 'wv_node', 'cm_document', 'custom',
];

function isValidScopeType(v: unknown): v is PlanScopeType {
  return typeof v === 'string' && (SCOPE_TYPES as string[]).includes(v);
}

function isNullableNonNegativeInt(v: unknown): boolean {
  return v === null || (typeof v === 'number' && Number.isInteger(v) && (v as number) >= 0);
}

export function validatePlanScopeCreate(
  body: unknown,
): { data: PlanScopeCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (typeof b['plan_id'] !== 'string' || b['plan_id'].trim() === '')
    return { error: 'plan_id is required and must be a non-empty string' };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['scope_type'] !== undefined && !isValidScopeType(b['scope_type']))
    return { error: `scope_type must be one of: ${SCOPE_TYPES.join(', ')}` };

  if (b['resource_ref'] !== undefined && b['resource_ref'] !== null && typeof b['resource_ref'] !== 'string')
    return { error: 'resource_ref must be a string or null' };

  if (b['resource_label'] !== undefined && b['resource_label'] !== null && typeof b['resource_label'] !== 'string')
    return { error: 'resource_label must be a string or null' };

  if (b['total_units'] !== undefined && !isNullableNonNegativeInt(b['total_units']))
    return { error: 'total_units must be a non-negative integer or null' };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  const data: PlanScopeCreate = {
    plan_id: (b['plan_id'] as string).trim(),
    title: (b['title'] as string).trim(),
  };

  if (b['scope_type'] !== undefined) data.scope_type = b['scope_type'] as PlanScopeType;
  if (b['resource_ref'] !== undefined) data.resource_ref = b['resource_ref'] as string | null;
  if (b['resource_label'] !== undefined) data.resource_label = b['resource_label'] as string | null;
  if (b['total_units'] !== undefined) data.total_units = b['total_units'] as number | null;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}

export function validatePlanScopePatch(
  body: unknown,
): { data: PlanScopePatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['scope_type'] !== undefined && !isValidScopeType(b['scope_type']))
    return { error: `scope_type must be one of: ${SCOPE_TYPES.join(', ')}` };

  if (b['resource_ref'] !== undefined && b['resource_ref'] !== null && typeof b['resource_ref'] !== 'string')
    return { error: 'resource_ref must be a string or null' };

  if (b['resource_label'] !== undefined && b['resource_label'] !== null && typeof b['resource_label'] !== 'string')
    return { error: 'resource_label must be a string or null' };

  if (b['total_units'] !== undefined && !isNullableNonNegativeInt(b['total_units']))
    return { error: 'total_units must be a non-negative integer or null' };

  if (b['sort_order'] !== undefined && !(typeof b['sort_order'] === 'number' && Number.isInteger(b['sort_order'])))
    return { error: 'sort_order must be an integer' };

  const data: PlanScopePatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['scope_type'] !== undefined) data.scope_type = b['scope_type'] as PlanScopeType;
  if (b['resource_ref'] !== undefined) data.resource_ref = b['resource_ref'] as string | null;
  if (b['resource_label'] !== undefined) data.resource_label = b['resource_label'] as string | null;
  if (b['total_units'] !== undefined) data.total_units = b['total_units'] as number | null;
  if (b['sort_order'] !== undefined) data.sort_order = b['sort_order'] as number;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string | null;

  return { data };
}
