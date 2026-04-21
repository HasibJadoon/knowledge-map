// ─── ExternalRefRepo — core_external_refs ─────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ExternalRef {
  id: string;
  legacy_source: string;
  legacy_id: string;
  legacy_type: string | null;
  new_module: string;
  new_typed_ref: string;
  migration_batch: string | null;
  note: string | null;
  migrated_at: string;
}

export interface ExternalRefCreate {
  legacySource: string;
  legacyId: string;
  legacyType?: string;
  newModule: string;
  newTypedRef: string;
  migrationBatch?: string;
  note?: string;
}

// ── Column fragment ───────────────────────────────────────────────────────────

const COLS = `
  id, legacy_source, legacy_id, legacy_type, new_module,
  new_typed_ref, migration_batch, note, migrated_at
FROM core_external_refs`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ExternalRefRepo {
  constructor(private db: D1Database) {}

  findByLegacy(
    source: string,
    legacyId: string,
    legacyType?: string,
  ): Promise<ExternalRef | null> {
    if (legacyType !== undefined) {
      return queryOne<ExternalRef>(
        this.db,
        `SELECT ${COLS} WHERE legacy_source = ? AND legacy_id = ? AND legacy_type = ?`,
        [source, legacyId, legacyType],
      );
    }
    return queryOne<ExternalRef>(
      this.db,
      `SELECT ${COLS} WHERE legacy_source = ? AND legacy_id = ?`,
      [source, legacyId],
    );
  }

  findByNew(typedRef: string): Promise<ExternalRef | null> {
    return queryOne<ExternalRef>(
      this.db,
      `SELECT ${COLS} WHERE new_typed_ref = ?`,
      [typedRef],
    );
  }

  /** All legacy refs that resolve to a given new typed ref. */
  allByNew(typedRef: string): Promise<ExternalRef[]> {
    return query<ExternalRef>(
      this.db,
      `SELECT ${COLS} WHERE new_typed_ref = ? ORDER BY migrated_at`,
      [typedRef],
    );
  }

  async create(input: ExternalRefCreate): Promise<ExternalRef> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO core_external_refs
         (id, legacy_source, legacy_id, legacy_type, new_module,
          new_typed_ref, migration_batch, note, migrated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.legacySource,
        input.legacyId,
        input.legacyType ?? null,
        input.newModule,
        input.newTypedRef,
        input.migrationBatch ?? null,
        input.note ?? null,
        now,
      ],
    );
    return (await this.findByLegacy(input.legacySource, input.legacyId, input.legacyType))!;
  }

  /** Paginated list of refs for a module (e.g. all QR legacy mappings). */
  list(module: string, opts: PaginateOptions = {}) {
    return paginate<ExternalRef>(
      this.db,
      `SELECT ${COLS} WHERE new_module = ? ORDER BY migrated_at DESC`,
      `SELECT COUNT(*) AS count FROM core_external_refs WHERE new_module = ?`,
      [module],
      opts,
    );
  }

  /** Refs belonging to a migration batch. */
  byBatch(migrationBatch: string): Promise<ExternalRef[]> {
    return query<ExternalRef>(
      this.db,
      `SELECT ${COLS} WHERE migration_batch = ? ORDER BY migrated_at`,
      [migrationBatch],
    );
  }

  /** Count unmapped refs per source (useful for migration audit). */
  countBySource(): Promise<Array<{ legacy_source: string; total: number }>> {
    return query(
      this.db,
      `SELECT legacy_source, COUNT(*) AS total
       FROM core_external_refs GROUP BY legacy_source ORDER BY total DESC`,
      [],
    );
  }
}
