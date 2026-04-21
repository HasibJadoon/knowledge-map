// ─── BridgeRepo — ar_ling_quran_links + arabic_links + content_links + projection_cache ──

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuranLink {
  id: string;
  al_entity_ref: string;   // AL:<ULID>
  al_entity_type: string;
  qr_scope_ref: string;    // QR:<ULID> or QR:surah:ayah
  link_type: string;
  note_md: string | null;
  confidence: number;
  created_at: string;
}

export interface QuranLinkCreate {
  al_entity_ref: string;
  al_entity_type: string;
  qr_scope_ref: string;
  link_type?: string;
  note_md?: string | null;
  confidence?: number;
}

export interface ArabicLink {
  id: string;
  al_entity_ref: string;   // AL:<ULID>
  al_entity_type: string;
  ar_entity_ref: string;   // AR:<ULID>
  ar_entity_type: string;
  link_type: string;
  note_md: string | null;
  created_at: string;
}

export interface ArabicLinkCreate {
  al_entity_ref: string;
  al_entity_type: string;
  ar_entity_ref: string;
  ar_entity_type: string;
  link_type?: string;
  note_md?: string | null;
}

export interface ContentLink {
  id: string;
  al_entity_ref: string;   // AL:<ULID>
  al_entity_type: string;
  cm_entity_ref: string;   // CM:<ULID>
  cm_entity_type: string;
  link_type: string;
  note_md: string | null;
  created_at: string;
}

export interface ContentLinkCreate {
  al_entity_ref: string;
  al_entity_type: string;
  cm_entity_ref: string;
  cm_entity_type: string;
  link_type?: string;
  note_md?: string | null;
}

export interface ProjectionCache {
  id: string;
  cache_key: string;
  cache_type: string;
  payload_json: string;
  source_refs: string | null;
  expires_at: string | null;
  created_at: string;
}

// ── Repo ─────────────────────────────────────────────────────────────────────

export class BridgeRepo {
  constructor(private db: D1Database) {}

  // ── Quran Links ────────────────────────────────────────────────────────────

  quranLinks(alRef: string, opts: PaginateOptions = {}) {
    return paginate<QuranLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, qr_scope_ref,
              link_type, note_md, confidence, created_at
       FROM ar_ling_quran_links
       WHERE al_entity_ref = ?
       ORDER BY confidence DESC, created_at DESC`,
      `SELECT COUNT(*) AS count FROM ar_ling_quran_links WHERE al_entity_ref = ?`,
      [alRef],
      opts,
    );
  }

  /** All AL entities linked to a specific QR scope (reverse lookup). */
  quranLinksByQrRef(qrRef: string, opts: PaginateOptions = {}) {
    return paginate<QuranLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, qr_scope_ref,
              link_type, note_md, confidence, created_at
       FROM ar_ling_quran_links
       WHERE qr_scope_ref = ?
       ORDER BY al_entity_type, confidence DESC`,
      `SELECT COUNT(*) AS count FROM ar_ling_quran_links WHERE qr_scope_ref = ?`,
      [qrRef],
      opts,
    );
  }

  async addQuranLink(input: QuranLinkCreate): Promise<QuranLink> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_quran_links
         (id, al_entity_ref, al_entity_type, qr_scope_ref,
          link_type, note_md, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.al_entity_ref,
        input.al_entity_type,
        input.qr_scope_ref,
        input.link_type ?? 'attests',
        input.note_md ?? null,
        input.confidence ?? 1.0,
      ],
    );
    return (await queryOne<QuranLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, qr_scope_ref,
              link_type, note_md, confidence, created_at
       FROM ar_ling_quran_links WHERE id = ?`,
      [id],
    ))!;
  }

  async removeQuranLink(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_ling_quran_links WHERE id = ?`,
      [id],
    );
  }

  // ── Arabic Links ───────────────────────────────────────────────────────────

  arabicLinks(alRef: string): Promise<ArabicLink[]> {
    return query<ArabicLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, ar_entity_ref,
              ar_entity_type, link_type, note_md, created_at
       FROM ar_ling_arabic_links
       WHERE al_entity_ref = ?
       ORDER BY ar_entity_type, created_at DESC`,
      [alRef],
    );
  }

  async addArabicLink(input: ArabicLinkCreate): Promise<ArabicLink> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_arabic_links
         (id, al_entity_ref, al_entity_type, ar_entity_ref,
          ar_entity_type, link_type, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.al_entity_ref,
        input.al_entity_type,
        input.ar_entity_ref,
        input.ar_entity_type,
        input.link_type ?? 'referenced_by',
        input.note_md ?? null,
      ],
    );
    return (await queryOne<ArabicLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, ar_entity_ref,
              ar_entity_type, link_type, note_md, created_at
       FROM ar_ling_arabic_links WHERE id = ?`,
      [id],
    ))!;
  }

  async removeArabicLink(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_ling_arabic_links WHERE id = ?`,
      [id],
    );
  }

  // ── Content Links ──────────────────────────────────────────────────────────

  contentLinks(alRef: string): Promise<ContentLink[]> {
    return query<ContentLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, cm_entity_ref,
              cm_entity_type, link_type, note_md, created_at
       FROM ar_ling_content_links
       WHERE al_entity_ref = ?
       ORDER BY cm_entity_type, created_at DESC`,
      [alRef],
    );
  }

  async addContentLink(input: ContentLinkCreate): Promise<ContentLink> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_content_links
         (id, al_entity_ref, al_entity_type, cm_entity_ref,
          cm_entity_type, link_type, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.al_entity_ref,
        input.al_entity_type,
        input.cm_entity_ref,
        input.cm_entity_type,
        input.link_type ?? 'cited_in',
        input.note_md ?? null,
      ],
    );
    return (await queryOne<ContentLink>(
      this.db,
      `SELECT id, al_entity_ref, al_entity_type, cm_entity_ref,
              cm_entity_type, link_type, note_md, created_at
       FROM ar_ling_content_links WHERE id = ?`,
      [id],
    ))!;
  }

  async removeContentLink(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_ling_content_links WHERE id = ?`,
      [id],
    );
  }

  // ── Projection Cache ───────────────────────────────────────────────────────

  /** Fetch a cache entry by (cache_key = entityRef + ':' + projectionType). */
  getCache(
    entityRef: string,
    projectionType: string,
  ): Promise<ProjectionCache | null> {
    const cacheKey = `${entityRef}:${projectionType}`;
    return queryOne<ProjectionCache>(
      this.db,
      `SELECT id, cache_key, cache_type, payload_json,
              source_refs, expires_at, created_at
       FROM ar_ling_projection_cache
       WHERE cache_key = ?
         AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      [cacheKey],
    );
  }

  /** Upsert a cache entry. */
  async setCache(
    entityRef: string,
    projectionType: string,
    payloadJson: string,
    expiresAt?: string | null,
    sourceRefs?: string | null,
  ): Promise<ProjectionCache> {
    const cacheKey = `${entityRef}:${projectionType}`;
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_projection_cache
         (id, cache_key, cache_type, payload_json, source_refs, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (cache_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         source_refs  = excluded.source_refs,
         expires_at   = excluded.expires_at,
         created_at   = datetime('now')`,
      [
        id,
        cacheKey,
        projectionType,
        payloadJson,
        sourceRefs ?? null,
        expiresAt ?? null,
      ],
    );
    return (await queryOne<ProjectionCache>(
      this.db,
      `SELECT id, cache_key, cache_type, payload_json,
              source_refs, expires_at, created_at
       FROM ar_ling_projection_cache WHERE cache_key = ?`,
      [cacheKey],
    ))!;
  }

  /** Invalidate all cache entries for a given entity ref. */
  async invalidateCache(entityRef: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_ling_projection_cache WHERE cache_key LIKE ?`,
      [`${entityRef}:%`],
    );
  }

  /** Invalidate all expired cache entries. */
  async purgeExpired(): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM ar_ling_projection_cache
       WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`,
      [],
    );
  }

  /** List all cached entries for an entity ref (including expired). */
  listCache(entityRef: string): Promise<ProjectionCache[]> {
    return query<ProjectionCache>(
      this.db,
      `SELECT id, cache_key, cache_type, payload_json,
              source_refs, expires_at, created_at
       FROM ar_ling_projection_cache
       WHERE cache_key LIKE ?
       ORDER BY cache_type`,
      [`${entityRef}:%`],
    );
  }
}
