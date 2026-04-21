// ─── Curriculum schemas & types ───────────────────────────────────────────────

export type ArCurriculumDiscipline =
  | 'nahw'
  | 'sarf'
  | 'balagha'
  | 'vocabulary'
  | 'reading'
  | 'custom';

export interface ArCurriculum {
  id: string;                        // AR:ULID
  slug: string;
  title: string;
  discipline: ArCurriculumDiscipline;
  level: string | null;              // A1–C2
  track_id: string | null;
  container_id: string | null;
  description_md: string | null;
  sort_order: number;
  created_at: string;
}

export interface ArCurriculumCreate {
  title: string;
  discipline?: ArCurriculumDiscipline;
  slug?: string;
  level?: string | null;
  track_id?: string | null;
  container_id?: string | null;
  description_md?: string | null;
}

export interface ArCurriculumPatch {
  title?: string;
  discipline?: ArCurriculumDiscipline;
  slug?: string;
  level?: string | null;
  track_id?: string | null;
  container_id?: string | null;
  description_md?: string | null;
  sort_order?: number;
}

// ─── Curriculum Unit ──────────────────────────────────────────────────────────

export interface ArCurriculumUnit {
  id: string;                        // AR:ULID
  curriculum_id: string;
  parent_id: string | null;
  title: string;
  al_concept_ref: string | null;     // AL:<nahw|sarf|balagha_concept_id>
  unit_index: number;
  description_md: string | null;
  examples_json: string | null;      // JSON [{arabic, translation, notes}]
  created_at: string;
}

export interface ArCurriculumUnitCreate {
  curriculum_id: string;
  title: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
  parent_id?: string | null;
}

export interface ArCurriculumUnitPatch {
  title?: string;
  al_concept_ref?: string | null;
  unit_index?: number;
  description_md?: string | null;
  examples_json?: string | null;
  parent_id?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_DISCIPLINES: ArCurriculumDiscipline[] = [
  'nahw', 'sarf', 'balagha', 'vocabulary', 'reading', 'custom',
];

export function validateArCurriculumCreate(
  body: unknown,
): { data: ArCurriculumCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  if (b.discipline !== undefined && !VALID_DISCIPLINES.includes(b.discipline as ArCurriculumDiscipline)) {
    return { error: `discipline must be one of: ${VALID_DISCIPLINES.join(', ')}` };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      discipline: b.discipline !== undefined ? (b.discipline as ArCurriculumDiscipline) : undefined,
      slug: typeof b.slug === 'string' ? b.slug.trim() : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      track_id: typeof b.track_id === 'string' ? b.track_id : b.track_id === null ? null : undefined,
      container_id: typeof b.container_id === 'string' ? b.container_id : b.container_id === null ? null : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
    },
  };
}

export function validateArCurriculumUnitCreate(
  body: unknown,
): { data: ArCurriculumUnitCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.curriculum_id || typeof b.curriculum_id !== 'string') {
    return { error: 'curriculum_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      curriculum_id: b.curriculum_id as string,
      title: (b.title as string).trim(),
      al_concept_ref: typeof b.al_concept_ref === 'string' ? b.al_concept_ref : b.al_concept_ref === null ? null : undefined,
      unit_index: typeof b.unit_index === 'number' ? b.unit_index : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      examples_json: typeof b.examples_json === 'string' ? b.examples_json : b.examples_json === null ? null : undefined,
      parent_id: typeof b.parent_id === 'string' ? b.parent_id : b.parent_id === null ? null : undefined,
    },
  };
}
