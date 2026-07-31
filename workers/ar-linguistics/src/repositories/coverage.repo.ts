// ─── CoverageRepo — registry-driven root completeness ─────────────────────────
// "How complete is this root?" is answered from the registry, never from a
// hardcoded checklist: ar_ling_reg_sub_layer.tables_json names the carrier
// tables, and each table's root key is discovered at runtime. Adding a
// sub-layer or a carrier to the registry makes it appear here with no code
// change — which is the point.
//
// How a carrier reaches a root is itself data: ar_ling_reg_root_key maps a
// column name to the identity value to bind, in precedence order. A table with
// none of those columns is reported as no_carrier and excluded from the
// percentage — currently 22-BAB (global wazn templates keyed on root_type) and
// 50-META (source/display metadata), both correctly not per-root.

import { query } from '../../../shared/src/db';

/** How a carrier column reaches a root. Seeded in ar_ling_reg_root_key — this
 *  is a registry lookup, not a constant, so a new carrier convention is a row
 *  insert rather than a deploy. */
type BindKind = 'root_norm' | 'root_id' | 'buckwalter' | 'lemma';

interface RootKeyRule {
  column_name: string;
  bind_kind: BindKind;
  precedence: number;
}

type Resolver =
  | { kind: 'direct'; column: string; bind: Exclude<BindKind, 'lemma'> }
  | { kind: 'lemma'; column: string };

export interface RootIdentity {
  root_norm: string;
  root_id: string;
  buckwalter: string | null;
}

export interface SubLayer {
  sub_code: string;
  name_en: string;
  name_ar: string;
  band: number;
  band_key: string;
  scope_level: string;
  display_order: number;
  display_icon: string | null;
  tables: string[];
}

export interface CarrierCoverage {
  table: string;
  resolved_by: 'direct' | 'lemma';
  key_column: string;
  rows: number;
}

export interface SubLayerCoverage extends Omit<SubLayer, 'tables'> {
  carriers: CarrierCoverage[];
  /** Carriers that exist but can't be keyed to a root — reported, not hidden. */
  unkeyed_tables: string[];
  rows: number;
  /** built = some carrier has rows · empty = keyable carriers, none populated
   *  · no_carrier = nothing in this sub-layer can be keyed to a root */
  state: 'built' | 'empty' | 'no_carrier';
}

export class CoverageRepo {
  constructor(private db: D1Database) {}

  /** Live sub-layers with their declared carrier tables, in display order. */
  async subLayers(): Promise<SubLayer[]> {
    const rows = await query<Record<string, unknown>>(
      this.db,
      `SELECT sub_code, name_en, name_ar, band, band_key, scope_level,
              display_order, display_icon, tables_json
         FROM ar_ling_reg_sub_layer
        WHERE status = 'live'
        ORDER BY display_order`,
    );

    return rows.map((r) => ({
      sub_code: String(r.sub_code),
      name_en: String(r.name_en),
      name_ar: String(r.name_ar),
      band: Number(r.band),
      band_key: String(r.band_key),
      scope_level: String(r.scope_level),
      display_order: Number(r.display_order),
      display_icon: (r.display_icon as string) ?? null,
      tables: safeParseTables(r.tables_json),
    }));
  }

  /**
   * table → how to key it to a root. Doubles as the allow-list: a table absent
   * here is never interpolated into SQL, so a stale registry row can't reach
   * the query builder.
   */
  async resolvers(): Promise<Map<string, Resolver>> {
    const rules = await query<RootKeyRule>(
      this.db,
      `SELECT column_name, bind_kind, precedence
         FROM ar_ling_reg_root_key
        WHERE status = 'live'
        ORDER BY precedence`,
    );
    if (rules.length === 0) return new Map();

    const wanted = rules.map((r) => r.column_name);
    const rows = await query<{ tbl: string; col: string }>(
      this.db,
      `SELECT m.name AS tbl, p.name AS col
         FROM sqlite_master m
         JOIN pragma_table_info(m.name) p
        WHERE m.type = 'table'
          AND m.name LIKE 'ar_ling_%'
          AND p.name IN (${wanted.map(() => '?').join(',')})`,
      wanted,
    );

    const byTable = new Map<string, Set<string>>();
    for (const { tbl, col } of rows) {
      if (!byTable.has(tbl)) byTable.set(tbl, new Set());
      byTable.get(tbl)!.add(col);
    }

    const out = new Map<string, Resolver>();
    for (const [tbl, cols] of byTable) {
      // rules are precedence-ordered, so the first match wins
      const rule = rules.find((r) => cols.has(r.column_name));
      if (!rule) continue;
      out.set(
        tbl,
        rule.bind_kind === 'lemma'
          ? { kind: 'lemma', column: rule.column_name }
          : { kind: 'direct', column: rule.column_name, bind: rule.bind_kind },
      );
    }
    return out;
  }

  /** Resolve a root's identity triple, accepting text or normalized form. */
  async identity(root: string): Promise<RootIdentity | null> {
    const row = await query<RootIdentity>(
      this.db,
      `SELECT root_text AS root_norm, id AS root_id, buckwalter
         FROM ar_ling_roots
        WHERE root_text = ? OR root_normalized = ?
        LIMIT 1`,
      [root, root],
    );
    return row[0] ?? null;
  }

  /** Per-sub-layer coverage for one root. Counts run as one batched round trip. */
  async forRoot(id: RootIdentity): Promise<SubLayerCoverage[]> {
    const [subLayers, resolvers] = await Promise.all([this.subLayers(), this.resolvers()]);

    const targets = new Map<string, Resolver>();
    for (const layer of subLayers) {
      for (const table of layer.tables) {
        const r = resolvers.get(table);
        if (r) targets.set(table, r);
      }
    }

    const counts = await this.countRows(targets, id);

    return subLayers.map((layer) => {
      const { tables, ...rest } = layer;
      const carriers: CarrierCoverage[] = [];
      const unkeyed: string[] = [];

      for (const table of tables) {
        const r = resolvers.get(table);
        if (!r) {
          unkeyed.push(table);
          continue;
        }
        carriers.push({
          table,
          resolved_by: r.kind,
          key_column: r.column,
          rows: counts.get(table) ?? 0,
        });
      }

      const rows = carriers.reduce((sum, c) => sum + c.rows, 0);
      return {
        ...rest,
        carriers,
        unkeyed_tables: unkeyed,
        rows,
        state: carriers.length === 0 ? 'no_carrier' : rows > 0 ? 'built' : 'empty',
      };
    });
  }

  /** One COUNT(*) per carrier, batched. Table and column names come from the
   *  runtime allow-list above; the root identity is always bound. */
  private async countRows(
    targets: Map<string, Resolver>,
    id: RootIdentity,
  ): Promise<Map<string, number>> {
    const entries = [...targets.entries()];
    if (entries.length === 0) return new Map();

    const statements = entries.map(([table, r]) => {
      if (r.kind === 'lemma') {
        return this.db
          .prepare(
            `SELECT COUNT(*) AS n FROM ${table}
              WHERE ${r.column} IN (SELECT id FROM ar_ling_root_lemma WHERE root_id = ?)`,
          )
          .bind(id.root_id);
      }
      const value =
        r.bind === 'root_id'
          ? id.root_id
          : r.bind === 'buckwalter'
            ? id.buckwalter
            : id.root_norm;
      return this.db
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${r.column} = ?`)
        .bind(value);
    });

    const results = await this.db.batch<{ n: number }>(statements);
    const counts = new Map<string, number>();
    entries.forEach(([table], i) => {
      counts.set(table, results[i]?.results?.[0]?.n ?? 0);
    });
    return counts;
  }
}

function safeParseTables(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}
