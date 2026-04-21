// ─── Disciplinary schemas & types ───────────────────────────────────────────────

export interface DisciplineContainer {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  discipline: string;
  description_md: string | null;
}

export interface DisciplineContainerCreate {
  name_ar: string;
  name_en: string;
  parent_id?: string | null;
  discipline: string;
  description_md?: string | null;
}

export type DisciplineContainerPatch = Partial<
  Omit<DisciplineContainerCreate, 'discipline'>
>;

export interface DisciplineUnit {
  id: string;
  container_id: string;
  parent_unit_id: string | null;
  name_ar: string;
  name_en: string;
  unit_type: string;
  description_md: string | null;
  seq: number;
}

export interface DisciplineUnitCreate {
  container_id: string;
  parent_unit_id?: string | null;
  name_ar: string;
  name_en: string;
  unit_type?: string;
  description_md?: string | null;
  seq?: number;
}

export interface DisciplineRelation {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  relation_type: string;
  note_md: string | null;
}

export interface DisciplineRelationCreate {
  from_unit_id: string;
  to_unit_id: string;
  relation_type: string;
  note_md?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateDisciplineContainerCreate(body: unknown): SchemaValidationResult<DisciplineContainerCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.name_ar !== 'string' || !b.name_ar.trim()) return { error: 'name_ar is required and must be a non-empty string' };
  data.name_ar = b.name_ar.trim();
  if (typeof b.name_en !== 'string' || !b.name_en.trim()) return { error: 'name_en is required and must be a non-empty string' };
  data.name_en = b.name_en.trim();
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
  }
  if (typeof b.discipline !== 'string' || !b.discipline.trim()) return { error: 'discipline is required and must be a non-empty string' };
  data.discipline = b.discipline.trim();
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as DisciplineContainerCreate };
}

export function validateDisciplineUnitCreate(body: unknown): SchemaValidationResult<DisciplineUnitCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.container_id !== 'string' || !b.container_id.trim()) return { error: 'container_id is required and must be a non-empty string' };
  data.container_id = b.container_id.trim();
  if ('parent_unit_id' in b) {
    if (b.parent_unit_id !== null && typeof b.parent_unit_id !== 'string') return { error: 'parent_unit_id must be a string or null' };
    data.parent_unit_id = b.parent_unit_id;
  }
  if (typeof b.name_ar !== 'string' || !b.name_ar.trim()) return { error: 'name_ar is required and must be a non-empty string' };
  data.name_ar = b.name_ar.trim();
  if (typeof b.name_en !== 'string' || !b.name_en.trim()) return { error: 'name_en is required and must be a non-empty string' };
  data.name_en = b.name_en.trim();
  if ('unit_type' in b) {
    if (typeof b.unit_type !== 'string') return { error: 'unit_type must be a string' };
    data.unit_type = b.unit_type;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('seq' in b) {
    if (typeof b.seq !== 'number' || !Number.isFinite(b.seq)) return { error: 'seq must be a number' };
    data.seq = b.seq;
  }

  return { data: data as unknown as DisciplineUnitCreate };
}

export function validateDisciplineRelationCreate(body: unknown): SchemaValidationResult<DisciplineRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_unit_id !== 'string' || !b.from_unit_id.trim()) return { error: 'from_unit_id is required and must be a non-empty string' };
  data.from_unit_id = b.from_unit_id.trim();
  if (typeof b.to_unit_id !== 'string' || !b.to_unit_id.trim()) return { error: 'to_unit_id is required and must be a non-empty string' };
  data.to_unit_id = b.to_unit_id.trim();
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string') return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md;
  }

  return { data: data as unknown as DisciplineRelationCreate };
}

export function validateDisciplineContainerPatch(body: unknown): SchemaValidationResult<DisciplineContainerPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as DisciplineContainerPatch };
}
