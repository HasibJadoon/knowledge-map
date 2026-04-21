// ─── PeopleRepo — core_people ─────────────────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  workspace_id: string;
  name: string;
  name_ar: string | null;
  email: string | null;
  relationship: 'family' | 'colleague' | 'friend' | 'contact' | 'other' | null;
  linked_user_id: string | null;
  visibility: 'private' | 'workspace';
  notes_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonCreate {
  workspaceId: string;
  name: string;
  nameAr?: string;
  email?: string;
  relationship?: Person['relationship'];
  linkedUserId?: string;
  visibility?: 'private' | 'workspace';
  notesMd?: string;
  metaJson?: string;
}

export type PersonPatch = Partial<Omit<PersonCreate, 'workspaceId'>>;

export interface PeopleListOptions extends PaginateOptions {
  visibility?: 'private' | 'workspace';
  relationship?: string;
}

// ── Column fragment ───────────────────────────────────────────────────────────

const COLS = `
  id, workspace_id, name, name_ar, email, relationship, linked_user_id,
  visibility, notes_md, meta_json, created_at, updated_at
FROM core_people`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class PeopleRepo {
  constructor(private db: D1Database) {}

  list(workspaceId: string, opts: PeopleListOptions = {}) {
    const conditions: string[] = ['workspace_id = ?'];
    const args: unknown[] = [workspaceId];

    if (opts.visibility) {
      conditions.push('visibility = ?');
      args.push(opts.visibility);
    }
    if (opts.relationship) {
      conditions.push('relationship = ?');
      args.push(opts.relationship);
    }

    const where = conditions.join(' AND ');
    return paginate<Person>(
      this.db,
      `SELECT ${COLS} WHERE ${where} ORDER BY name`,
      `SELECT COUNT(*) AS count FROM core_people WHERE ${where}`,
      args,
      opts,
    );
  }

  findById(id: string): Promise<Person | null> {
    return queryOne<Person>(
      this.db,
      `SELECT ${COLS} WHERE id = ?`,
      [id],
    );
  }

  findByLinkedUser(workspaceId: string, linkedUserId: string): Promise<Person | null> {
    return queryOne<Person>(
      this.db,
      `SELECT ${COLS} WHERE workspace_id = ? AND linked_user_id = ?`,
      [workspaceId, linkedUserId],
    );
  }

  async create(input: PersonCreate): Promise<Person> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_people
         (id, workspace_id, name, name_ar, email, relationship, linked_user_id,
          visibility, notes_md, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.name,
        input.nameAr ?? null,
        input.email ?? null,
        input.relationship ?? null,
        input.linkedUserId ?? null,
        input.visibility ?? 'private',
        input.notesMd ?? null,
        input.metaJson ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PersonPatch): Promise<Person | null> {
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [new Date().toISOString()];

    if (patch.name !== undefined)         { sets.push('name = ?');           vals.push(patch.name); }
    if (patch.nameAr !== undefined)       { sets.push('name_ar = ?');        vals.push(patch.nameAr); }
    if (patch.email !== undefined)        { sets.push('email = ?');          vals.push(patch.email); }
    if (patch.relationship !== undefined) { sets.push('relationship = ?');   vals.push(patch.relationship); }
    if (patch.linkedUserId !== undefined) { sets.push('linked_user_id = ?'); vals.push(patch.linkedUserId); }
    if (patch.visibility !== undefined)   { sets.push('visibility = ?');     vals.push(patch.visibility); }
    if (patch.notesMd !== undefined)      { sets.push('notes_md = ?');       vals.push(patch.notesMd); }
    if (patch.metaJson !== undefined)     { sets.push('meta_json = ?');      vals.push(patch.metaJson); }

    if (sets.length === 1) return this.findById(id);

    vals.push(id);
    await execute(
      this.db,
      `UPDATE core_people SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM core_people WHERE id = ?`, [id]);
  }

  /** All workspace-visible people (for podcast participant picker etc.). */
  workspaceVisible(workspaceId: string): Promise<Person[]> {
    return query<Person>(
      this.db,
      `SELECT ${COLS} WHERE workspace_id = ? AND visibility = 'workspace' ORDER BY name`,
      [workspaceId],
    );
  }
}
