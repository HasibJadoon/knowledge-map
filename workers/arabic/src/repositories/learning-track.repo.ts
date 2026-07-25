// ─── LearningTrackRepo — ar_curriculum_track + ar_learn_track_profile ──────────
// Fluency tracks (Quranic, Classical, MSA, Sarf, Nahw, Balagha) and per-user
// learner state. XP accumulates per track; current_level is a CEFR band.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface LearningTrack {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  track_type: string;         // classical|quranic|msa|dialect|academic|custom
  cefr_from: string | null;
  cefr_to: string | null;
  description_md: string | null;
  prerequisites_json: string | null;
  sort_order: number;
  is_public: number;
  created_at: string;
}

export interface LearningTrackCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  track_type?: string;
  cefr_from?: string | null;
  cefr_to?: string | null;
  description_md?: string | null;
  prerequisites_json?: string | null;
  sort_order?: number;
  is_public?: number;
}

export interface UserTrackProfile {
  id: string;
  core_user_ref: string;      // CORE:<user_id>
  track_id: string;
  current_level: string | null;
  started_at: string;
  last_activity_at: string | null;
  total_xp: number;
  meta_json: string | null;
}

export interface UserTrackProfilePatch {
  current_level?: string | null;
  last_activity_at?: string | null;
  meta_json?: string | null;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const TRACK_COLS = `id, slug, title, title_ar, track_type, cefr_from, cefr_to,
  description_md, prerequisites_json, sort_order, is_public, created_at`;

const PROFILE_COLS = `id, core_user_ref, track_id, current_level,
  started_at, last_activity_at, total_xp, meta_json`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class LearningTrackRepo {
  constructor(private db: D1Database) {}

  // ── Tracks ──────────────────────────────────────────────────────────────────

  list(opts: PaginateOptions = {}) {
    return paginate<LearningTrack>(
      this.db,
      `SELECT ${TRACK_COLS} FROM ar_curriculum_track ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_track`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<LearningTrack | null> {
    return queryOne<LearningTrack>(
      this.db,
      `SELECT ${TRACK_COLS} FROM ar_curriculum_track WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<LearningTrack | null> {
    return queryOne<LearningTrack>(
      this.db,
      `SELECT ${TRACK_COLS} FROM ar_curriculum_track WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: LearningTrackCreate): Promise<LearningTrack> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_track
         (id, slug, title, title_ar, track_type, cefr_from, cefr_to,
          description_md, prerequisites_json, sort_order, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.track_type ?? 'classical',
        input.cefr_from ?? null,
        input.cefr_to ?? null,
        input.description_md ?? null,
        input.prerequisites_json ?? null,
        input.sort_order ?? 0,
        input.is_public ?? 1,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  // ── User track profiles ──────────────────────────────────────────────────────

  userProfile(userRef: string, trackId: string): Promise<UserTrackProfile | null> {
    return queryOne<UserTrackProfile>(
      this.db,
      `SELECT ${PROFILE_COLS} FROM ar_learn_track_profile
       WHERE core_user_ref = ? AND track_id = ?`,
      [userRef, trackId],
    );
  }

  async upsertProfile(
    userRef: string,
    trackId: string,
    patch: UserTrackProfilePatch,
  ): Promise<UserTrackProfile> {
    const now = new Date().toISOString();
    // Try to find existing profile
    const existing = await this.userProfile(userRef, trackId);
    if (existing) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (patch.current_level    !== undefined) { sets.push('current_level = ?');    vals.push(patch.current_level); }
      if (patch.last_activity_at !== undefined) { sets.push('last_activity_at = ?'); vals.push(patch.last_activity_at); }
      if (patch.meta_json        !== undefined) { sets.push('meta_json = ?');        vals.push(patch.meta_json); }
      if (sets.length) {
        vals.push(existing.id);
        await execute(
          this.db,
          `UPDATE ar_learn_track_profile SET ${sets.join(', ')} WHERE id = ?`,
          vals,
        );
      }
      return (await this.userProfile(userRef, trackId))!;
    }
    // Insert fresh profile
    const id = typedId('AR');
    await execute(
      this.db,
      `INSERT INTO ar_learn_track_profile
         (id, core_user_ref, track_id, current_level, started_at, last_activity_at, total_xp, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        userRef,
        trackId,
        patch.current_level ?? null,
        now,
        patch.last_activity_at ?? null,
        patch.meta_json ?? null,
      ],
    );
    return (await this.userProfile(userRef, trackId))!;
  }

  /** Add XP to a user's track profile. Inserts a profile row if absent. */
  async addXp(userRef: string, trackId: string, xp: number): Promise<UserTrackProfile> {
    const now = new Date().toISOString();
    // Upsert ensures row exists
    await this.upsertProfile(userRef, trackId, { last_activity_at: now });
    await execute(
      this.db,
      `UPDATE ar_learn_track_profile
       SET total_xp = total_xp + ?, last_activity_at = ?
       WHERE core_user_ref = ? AND track_id = ?`,
      [xp, now, userRef, trackId],
    );
    return (await this.userProfile(userRef, trackId))!;
  }
}
