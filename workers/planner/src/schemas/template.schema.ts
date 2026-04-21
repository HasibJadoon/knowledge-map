// ─── PlanTemplate schemas & types ────────────────────────────────────────────

export type TemplatePlanType =
  | 'reading'
  | 'quran'
  | 'arabic'
  | 'worldview_research'
  | 'revision'
  | 'curriculum'
  | 'class'
  | 'sprint'
  | 'personal'
  | 'team'
  | 'other';

export interface PlanTemplate {
  id: string;              // PL:ULID
  slug: string;
  title: string;
  plan_type: TemplatePlanType;
  description_md: string | null;
  template_json: string | null;   // raw JSON string — full plan scaffold definition
  is_public: boolean;
  created_by_ref: string | null;  // CORE:<user_id>
  created_at: string;
}

export interface PlanTemplateCreate {
  slug: string;
  title: string;
  plan_type?: TemplatePlanType;
  description_md?: string | null;
  template_json?: string | null;
  is_public?: boolean;
  created_by_ref?: string | null;
}

export interface PlanTemplatePatch {
  title?: string;
  plan_type?: TemplatePlanType;
  description_md?: string | null;
  template_json?: string | null;
  is_public?: boolean;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const TEMPLATE_PLAN_TYPES: TemplatePlanType[] = [
  'reading', 'quran', 'arabic', 'worldview_research', 'revision',
  'curriculum', 'class', 'sprint', 'personal', 'team', 'other',
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTemplatePlanType(v: unknown): v is TemplatePlanType {
  return typeof v === 'string' && (TEMPLATE_PLAN_TYPES as string[]).includes(v);
}

function isValidSlug(v: unknown): boolean {
  return typeof v === 'string' && SLUG_PATTERN.test(v);
}

export function validatePlanTemplateCreate(
  body: unknown,
): { data: PlanTemplateCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (!isValidSlug(b['slug']))
    return {
      error:
        'slug is required and must be a lowercase kebab-case string (e.g. "quran-30-days")',
    };

  if (typeof b['title'] !== 'string' || b['title'].trim() === '')
    return { error: 'title is required and must be a non-empty string' };

  if (b['plan_type'] !== undefined && !isValidTemplatePlanType(b['plan_type']))
    return { error: `plan_type must be one of: ${TEMPLATE_PLAN_TYPES.join(', ')}` };

  if (b['description_md'] !== undefined && b['description_md'] !== null && typeof b['description_md'] !== 'string')
    return { error: 'description_md must be a string or null' };

  if (b['template_json'] !== undefined && b['template_json'] !== null && typeof b['template_json'] !== 'string')
    return { error: 'template_json must be a JSON string or null' };

  if (b['is_public'] !== undefined && typeof b['is_public'] !== 'boolean')
    return { error: 'is_public must be a boolean' };

  if (b['created_by_ref'] !== undefined && b['created_by_ref'] !== null && typeof b['created_by_ref'] !== 'string')
    return { error: 'created_by_ref must be a string or null' };

  const data: PlanTemplateCreate = {
    slug: b['slug'] as string,
    title: (b['title'] as string).trim(),
  };

  if (b['plan_type'] !== undefined) data.plan_type = b['plan_type'] as TemplatePlanType;
  if (b['description_md'] !== undefined) data.description_md = b['description_md'] as string | null;
  if (b['template_json'] !== undefined) data.template_json = b['template_json'] as string | null;
  if (b['is_public'] !== undefined) data.is_public = b['is_public'] as boolean;
  if (b['created_by_ref'] !== undefined) data.created_by_ref = b['created_by_ref'] as string | null;

  return { data };
}

export function validatePlanTemplatePatch(
  body: unknown,
): { data: PlanTemplatePatch } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };

  const b = body as Record<string, unknown>;

  if (b['title'] !== undefined && (typeof b['title'] !== 'string' || (b['title'] as string).trim() === ''))
    return { error: 'title must be a non-empty string' };

  if (b['plan_type'] !== undefined && !isValidTemplatePlanType(b['plan_type']))
    return { error: `plan_type must be one of: ${TEMPLATE_PLAN_TYPES.join(', ')}` };

  if (b['description_md'] !== undefined && b['description_md'] !== null && typeof b['description_md'] !== 'string')
    return { error: 'description_md must be a string or null' };

  if (b['template_json'] !== undefined && b['template_json'] !== null && typeof b['template_json'] !== 'string')
    return { error: 'template_json must be a JSON string or null' };

  if (b['is_public'] !== undefined && typeof b['is_public'] !== 'boolean')
    return { error: 'is_public must be a boolean' };

  const data: PlanTemplatePatch = {};

  if (b['title'] !== undefined) data.title = (b['title'] as string).trim();
  if (b['plan_type'] !== undefined) data.plan_type = b['plan_type'] as TemplatePlanType;
  if (b['description_md'] !== undefined) data.description_md = b['description_md'] as string | null;
  if (b['template_json'] !== undefined) data.template_json = b['template_json'] as string | null;
  if (b['is_public'] !== undefined) data.is_public = b['is_public'] as boolean;

  return { data };
}
