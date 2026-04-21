// ─── Comparison schemas & types ───────────────────────────────────────────────

export interface WvComparison {
  id: string;              // WV:ULID
  slug: string;
  title: string;
  comparison_type: string; // tradition|school|period|person|text|institution|practice|other
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComparisonAxis {
  id: string;
  comparison_id: string;
  moral_axis_id: string | null;
  axis_label: string;
  axis_description: string | null;
  sort_order: number;
  created_at: string;
}

export interface ComparisonRow {
  id: string;
  comparison_id: string;
  entity_type: string;    // tradition|school|person|period|text
  entity_id: string;
  row_label: string;
  sort_order: number;
  created_at: string;
}

export interface ComparisonCell {
  id: string;
  comparison_id: string;
  row_id: string;
  axis_id: string;
  cell_text: string | null;
  stance: string | null;  // affirms|denies|nuances|absent|contested
  evidence_ids: string | null;  // JSON [evidence_item_id]
  tension_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComparisonDetail extends WvComparison {
  axes: ComparisonAxis[];
  rows: ComparisonRow[];
  cells: ComparisonCell[];
}

export interface ComparisonCreate {
  title: string;
  slug?: string;
  comparison_type?: string;
  description_md?: string | null;
}

export interface AxisCreate {
  comparison_id: string;
  axis_label: string;
  moral_axis_id?: string | null;
  axis_description?: string | null;
  sort_order?: number;
}

export interface RowCreate {
  comparison_id: string;
  entity_type: string;
  entity_id: string;
  row_label: string;
  sort_order?: number;
}

export interface CellUpsert {
  comparison_id: string;
  row_id: string;
  axis_id: string;
  cell_text?: string | null;
  stance?: string | null;
  evidence_ids?: string | null;
  tension_note?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateComparisonCreate(body: unknown): SchemaValidationResult<ComparisonCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('comparison_type' in b) {
    if (typeof b.comparison_type !== 'string') return { error: 'comparison_type must be a string' };
    data.comparison_type = b.comparison_type;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ComparisonCreate };
}

export function validateAxisCreate(body: unknown): SchemaValidationResult<AxisCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.comparison_id !== 'string' || !b.comparison_id.trim()) return { error: 'comparison_id is required and must be a non-empty string' };
  data.comparison_id = b.comparison_id.trim();
  if (typeof b.axis_label !== 'string' || !b.axis_label.trim()) return { error: 'axis_label is required and must be a non-empty string' };
  data.axis_label = b.axis_label.trim();
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('axis_description' in b) {
    if (b.axis_description !== null && typeof b.axis_description !== 'string') return { error: 'axis_description must be a string or null' };
    data.axis_description = b.axis_description;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as AxisCreate };
}

export function validateRowCreate(body: unknown): SchemaValidationResult<RowCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.comparison_id !== 'string' || !b.comparison_id.trim()) return { error: 'comparison_id is required and must be a non-empty string' };
  data.comparison_id = b.comparison_id.trim();
  if (typeof b.entity_type !== 'string' || !b.entity_type.trim()) return { error: 'entity_type is required and must be a non-empty string' };
  data.entity_type = b.entity_type.trim();
  if (typeof b.entity_id !== 'string' || !b.entity_id.trim()) return { error: 'entity_id is required and must be a non-empty string' };
  data.entity_id = b.entity_id.trim();
  if (typeof b.row_label !== 'string' || !b.row_label.trim()) return { error: 'row_label is required and must be a non-empty string' };
  data.row_label = b.row_label.trim();
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as RowCreate };
}

export function validateCellUpsert(body: unknown): SchemaValidationResult<CellUpsert> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.comparison_id !== 'string' || !b.comparison_id.trim()) return { error: 'comparison_id is required and must be a non-empty string' };
  data.comparison_id = b.comparison_id.trim();
  if (typeof b.row_id !== 'string' || !b.row_id.trim()) return { error: 'row_id is required and must be a non-empty string' };
  data.row_id = b.row_id.trim();
  if (typeof b.axis_id !== 'string' || !b.axis_id.trim()) return { error: 'axis_id is required and must be a non-empty string' };
  data.axis_id = b.axis_id.trim();
  if ('cell_text' in b) {
    if (b.cell_text !== null && typeof b.cell_text !== 'string') return { error: 'cell_text must be a string or null' };
    data.cell_text = b.cell_text;
  }
  if ('stance' in b) {
    if (b.stance !== null && typeof b.stance !== 'string') return { error: 'stance must be a string or null' };
    data.stance = b.stance;
  }
  if ('evidence_ids' in b) {
    if (b.evidence_ids !== null && typeof b.evidence_ids !== 'string') return { error: 'evidence_ids must be a string or null' };
    data.evidence_ids = b.evidence_ids;
  }
  if ('tension_note' in b) {
    if (b.tension_note !== null && typeof b.tension_note !== 'string') return { error: 'tension_note must be a string or null' };
    data.tension_note = b.tension_note;
  }

  return { data: data as unknown as CellUpsert };
}
