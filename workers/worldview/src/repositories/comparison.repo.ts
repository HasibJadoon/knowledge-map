// ─── ComparisonRepo — wv_comparisons + wv_comparison_axes + wv_comparison_rows + cells ──
// Parallel comparison grids: multi-tradition side-by-side moral analysis.
//
// Canonical schema (001_wv_schema.sql §8.1-8.4):
//   wv_comparisons      — the comparison object (id, slug, title, comparison_type, ...)
//   wv_comparison_axes  — the ATTRIBUTES being compared (rows in the rendered grid)
//   wv_comparison_rows  — the ENTITIES being compared (traditions, schools, persons)
//   wv_comparison_cells — (row_id × axis_id) → cell_text + stance + evidence
//
// NOTE: "axes" = what's being compared on (e.g. "Covenant", "Sacrifice")
//       "rows" = who is compared (e.g. "Islam", "Christianity")
// In the UI the traditions appear as columns but the DB calls them "rows".

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Column lists ─────────────────────────────────────────────────────────────

const CMP_COLS  = `id, slug, title, comparison_type, description_md, meta_json, created_at, updated_at`;
const AXIS_COLS = `id, comparison_id, moral_axis_id, axis_label, axis_description, sort_order, created_at`;
const ROW_COLS  = `id, comparison_id, entity_type, entity_id, row_label, sort_order, created_at`;
const CELL_COLS = `id, comparison_id, row_id, axis_id, cell_text, stance, evidence_ids, tension_note, created_at, updated_at`;

// ── Repo ─────────────────────────────────────────────────────────────────────

export class ComparisonRepo {
  constructor(private db: D1Database) {}

  // ── List (filterable by comparison_type, and by unit_id / source_id via meta_json) ──
  // unit_id / source_id match the typed reference stamped into meta_json when the
  // comparison is scoped to a single source unit (chapter) or whole source.
  list(opts: {
    comparison_type?: string | null;
    unit_id?: string | null;
    source_id?: string | null;
  } & PaginateOptions = {}) {
    const conds: string[]  = [];
    const params: unknown[] = [];
    if (opts.comparison_type) {
      conds.push('comparison_type = ?');
      params.push(opts.comparison_type);
    }
    if (opts.unit_id) {
      conds.push("json_extract(meta_json, '$.source_unit_id') = ?");
      params.push(opts.unit_id);
    }
    if (opts.source_id) {
      conds.push("json_extract(meta_json, '$.source_id') = ?");
      params.push(opts.source_id);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvComparison>(
      this.db,
      `SELECT ${CMP_COLS} FROM wv_comparisons ${where} ORDER BY updated_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_comparisons ${where}`,
      params, opts,
    );
  }

  async findById(id: string): Promise<ComparisonDetail | null> {
    const comparison = await queryOne<WvComparison>(
      this.db,
      `SELECT ${CMP_COLS} FROM wv_comparisons WHERE id = ?`,
      [id],
    );
    if (!comparison) return null;

    const [axes, rows, cells] = await Promise.all([
      query<ComparisonAxis>(
        this.db,
        `SELECT ${AXIS_COLS} FROM wv_comparison_axes WHERE comparison_id = ? ORDER BY sort_order`,
        [id],
      ),
      query<ComparisonRow>(
        this.db,
        `SELECT ${ROW_COLS} FROM wv_comparison_rows WHERE comparison_id = ? ORDER BY sort_order`,
        [id],
      ),
      query<ComparisonCell>(
        this.db,
        `SELECT ${CELL_COLS} FROM wv_comparison_cells WHERE comparison_id = ?`,
        [id],
      ),
    ]);

    return { ...comparison, axes, rows, cells };
  }

  async create(input: ComparisonCreate): Promise<WvComparison> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    const slug = input.slug ?? id;  // fallback slug = ULID
    await execute(
      this.db,
      `INSERT INTO wv_comparisons
         (id, slug, title, comparison_type, description_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, slug, input.title, input.comparison_type ?? 'tradition',
       input.description_md ?? null, now, now],
    );
    return (await queryOne<WvComparison>(
      this.db, `SELECT ${CMP_COLS} FROM wv_comparisons WHERE id = ?`, [id],
    ))!;
  }

  async patch(id: string, patch: Partial<ComparisonCreate>): Promise<WvComparison | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.title           !== undefined) { sets.push('title = ?');           vals.push(patch.title); }
    if (patch.comparison_type !== undefined) { sets.push('comparison_type = ?'); vals.push(patch.comparison_type); }
    if (patch.description_md  !== undefined) { sets.push('description_md = ?');  vals.push(patch.description_md ?? null); }
    vals.push(id);
    await execute(this.db, `UPDATE wv_comparisons SET ${sets.join(', ')} WHERE id = ?`, vals);
    return queryOne<WvComparison>(this.db, `SELECT ${CMP_COLS} FROM wv_comparisons WHERE id = ?`, [id]);
  }

  // ── Axes (what is being compared) ────────────────────────────────────────

  async addAxis(input: AxisCreate): Promise<ComparisonAxis> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_comparison_axes
         (id, comparison_id, moral_axis_id, axis_label, axis_description, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.comparison_id, input.moral_axis_id ?? null, input.axis_label,
       input.axis_description ?? null, input.sort_order ?? 0, now],
    );
    return (await queryOne<ComparisonAxis>(
      this.db, `SELECT ${AXIS_COLS} FROM wv_comparison_axes WHERE id = ?`, [id],
    ))!;
  }

  // ── Rows (the entities being compared — traditions, schools, etc.) ────────

  async addRow(input: RowCreate): Promise<ComparisonRow> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_comparison_rows
         (id, comparison_id, entity_type, entity_id, row_label, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.comparison_id, input.entity_type, input.entity_id,
       input.row_label, input.sort_order ?? 0, now],
    );
    return (await queryOne<ComparisonRow>(
      this.db, `SELECT ${ROW_COLS} FROM wv_comparison_rows WHERE id = ?`, [id],
    ))!;
  }

  // ── Cells (row × axis intersections) ────────────────────────────────────

  /** Upsert a cell (unique on row_id, axis_id). */
  async upsertCell(input: CellUpsert): Promise<ComparisonCell> {
    const now = new Date().toISOString();
    // Check if exists
    const existing = await queryOne<ComparisonCell>(
      this.db,
      `SELECT ${CELL_COLS} FROM wv_comparison_cells WHERE row_id = ? AND axis_id = ?`,
      [input.row_id, input.axis_id],
    );
    if (existing) {
      const sets: string[]  = ['updated_at = ?'];
      const vals: unknown[] = [now];
      if (input.cell_text    !== undefined) { sets.push('cell_text = ?');    vals.push(input.cell_text ?? null); }
      if (input.stance       !== undefined) { sets.push('stance = ?');       vals.push(input.stance ?? null); }
      if (input.evidence_ids !== undefined) { sets.push('evidence_ids = ?'); vals.push(input.evidence_ids ?? null); }
      if (input.tension_note !== undefined) { sets.push('tension_note = ?'); vals.push(input.tension_note ?? null); }
      vals.push(existing.id);
      await execute(this.db, `UPDATE wv_comparison_cells SET ${sets.join(', ')} WHERE id = ?`, vals);
      return (await queryOne<ComparisonCell>(
        this.db, `SELECT ${CELL_COLS} FROM wv_comparison_cells WHERE id = ?`, [existing.id],
      ))!;
    }
    const id = typedId('WV');
    await execute(
      this.db,
      `INSERT INTO wv_comparison_cells
         (id, comparison_id, row_id, axis_id, cell_text, stance, evidence_ids, tension_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.comparison_id, input.row_id, input.axis_id,
       input.cell_text ?? null, input.stance ?? null,
       input.evidence_ids ?? null, input.tension_note ?? null, now, now],
    );
    return (await queryOne<ComparisonCell>(
      this.db, `SELECT ${CELL_COLS} FROM wv_comparison_cells WHERE id = ?`, [id],
    ))!;
  }

  async patchCell(id: string, patch: {
    cell_text?: string | null;
    stance?: string | null;
    tension_note?: string | null;
  }): Promise<ComparisonCell | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if ('cell_text'    in patch) { sets.push('cell_text = ?');    vals.push(patch.cell_text ?? null); }
    if ('stance'       in patch) { sets.push('stance = ?');       vals.push(patch.stance ?? null); }
    if ('tension_note' in patch) { sets.push('tension_note = ?'); vals.push(patch.tension_note ?? null); }
    vals.push(id);
    await execute(this.db, `UPDATE wv_comparison_cells SET ${sets.join(', ')} WHERE id = ?`, vals);
    return queryOne<ComparisonCell>(this.db, `SELECT ${CELL_COLS} FROM wv_comparison_cells WHERE id = ?`, [id]);
  }
}
