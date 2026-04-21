// ─── DocumentRepo — cm_documents aggregate ────────────────────────────────────
// Canonical document storage for authored CM content. Documents own structured
// blocks and versions; cross-module relationships are stored as typed refs.

import { execute, executeBatch, paginate, query, queryOne } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type {
  CmDocument,
  CmDocumentAggregate,
  CmDocumentBlock,
  CmDocumentBlockAggregate,
  CmDocumentBlockCreate,
  CmDocumentBlockEmbed,
  CmDocumentBlockEmbedCreate,
  CmDocumentBlockPatch,
  CmDocumentBlockRef,
  CmDocumentBlockRefCreate,
  CmDocumentCreate,
  CmDocumentLinkCreate,
  CmDocumentPatch,
  CmDocumentResourceLink,
  CmDocumentVersion,
  CmDocumentVersionCreate,
} from '../schemas/document.schema';

export type DocumentInclude = 'blocks' | 'links' | 'versions';

export interface DocumentListFilters {
  core_user_ref?: string;
  doc_type?: string;
  publication_state?: string;
  workspace_ref?: string;
  policy_ref?: string;
  primary_source_ref?: string;
  language?: string;
  q?: string;
  include_archived?: boolean;
}

const DOCUMENT_COLS = `doc_id, core_user_ref, doc_type, title, title_ar, slug, language,
  word_count, reading_time_min, publication_state, policy_ref, workspace_ref,
  primary_source_ref, tags_json, meta_json, created_at, updated_at`;

const BLOCK_COLS = `block_id, doc_id, parent_block_id, block_type, seq_order, depth,
  content_text, content_ar, attrs_json, annotations_json, meta_json, created_at, updated_at`;

const BLOCK_REF_COLS = `ref_id, block_id, target_ref, ref_type, anchor_text, note, seq_order, meta_json`;

const BLOCK_EMBED_COLS = `embed_id, block_id, embed_type, target_ref, embed_config_json, caption, meta_json`;

const VERSION_COLS = `version_id, doc_id, version_number, version_label, snapshot_json,
  change_summary, core_user_ref, created_at`;

const LINK_COLS = `link_id, source_ref, target_ref, link_type, anchor_text, note,
  core_user_ref, confidence, is_ai_suggested, meta_json, created_at`;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function documentRef(docId: string): string {
  return docId;
}

function addFilter(
  clauses: string[],
  params: unknown[],
  condition: string,
  value: unknown,
): void {
  if (value === undefined || value === null || value === '') return;
  clauses.push(condition);
  params.push(value);
}

function buildWhere(filters: DocumentListFilters = {}): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  addFilter(clauses, params, 'core_user_ref = ?', filters.core_user_ref);
  addFilter(clauses, params, 'doc_type = ?', filters.doc_type);
  addFilter(clauses, params, 'workspace_ref = ?', filters.workspace_ref);
  addFilter(clauses, params, 'policy_ref = ?', filters.policy_ref);
  addFilter(clauses, params, 'primary_source_ref = ?', filters.primary_source_ref);
  addFilter(clauses, params, 'language = ?', filters.language);

  if (filters.publication_state && filters.publication_state !== 'all') {
    const states = filters.publication_state
      .split(',')
      .map((state) => state.trim())
      .filter(Boolean);
    if (states.length === 1) {
      clauses.push('publication_state = ?');
      params.push(states[0]);
    } else if (states.length > 1) {
      clauses.push(`publication_state IN (${states.map(() => '?').join(', ')})`);
      params.push(...states);
    }
  } else if (!filters.include_archived) {
    clauses.push(`publication_state != 'archived'`);
  }

  if (filters.q?.trim()) {
    const term = `%${escapeLike(filters.q.trim())}%`;
    clauses.push(`(
      title LIKE ? ESCAPE '\\'
      OR title_ar LIKE ? ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM cm_blocks b
        WHERE b.doc_id = cm_documents.doc_id
          AND (b.content_text LIKE ? ESCAPE '\\' OR b.content_ar LIKE ? ESCAPE '\\')
      )
    )`);
    params.push(term, term, term, term);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function bindNullableString(value: string | null | undefined): string | null {
  return value === undefined ? null : value;
}

function bindNullableNumber(value: number | null | undefined): number | null {
  return value === undefined ? null : value;
}

export class DocumentRepo {
  constructor(private db: D1Database) {}

  list(filters: DocumentListFilters = {}, opts: PaginateOptions = {}) {
    const { where, params } = buildWhere(filters);
    return paginate<CmDocument>(
      this.db,
      `SELECT ${DOCUMENT_COLS} FROM cm_documents ${where}
       ORDER BY updated_at DESC, created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_documents ${where}`,
      params,
      opts,
    );
  }

  search(filters: DocumentListFilters, opts: PaginateOptions = {}) {
    return this.list(filters, opts);
  }

  findById(docId: string): Promise<CmDocument | null> {
    return queryOne<CmDocument>(
      this.db,
      `SELECT ${DOCUMENT_COLS} FROM cm_documents WHERE doc_id = ?`,
      [docId],
    );
  }

  async exists(docId: string): Promise<boolean> {
    const row = await queryOne<{ n: number }>(
      this.db,
      `SELECT 1 AS n FROM cm_documents WHERE doc_id = ?`,
      [docId],
    );
    return row !== null;
  }

  async findAggregate(
    docId: string,
    includes: DocumentInclude[] = [],
  ): Promise<CmDocumentAggregate | null> {
    const doc = await this.findById(docId);
    if (!doc) return null;

    const aggregate: CmDocumentAggregate = { ...doc };
    const includeSet = new Set(includes);

    const tasks: Promise<void>[] = [];
    if (includeSet.has('blocks')) {
      tasks.push(this.blocksWithChildren(docId).then((blocks) => {
        aggregate.blocks = blocks;
      }));
    }
    if (includeSet.has('links')) {
      tasks.push(this.links(docId).then((links) => {
        aggregate.links = links;
      }));
    }
    if (includeSet.has('versions')) {
      tasks.push(this.versions(docId).then((versions) => {
        aggregate.versions = versions;
      }));
    }
    await Promise.all(tasks);

    return aggregate;
  }

  async create(input: CmDocumentCreate): Promise<CmDocumentAggregate> {
    const docId = typedId('CM');
    const now = new Date().toISOString();

    await execute(
      this.db,
      `INSERT INTO cm_documents
         (doc_id, core_user_ref, doc_type, title, title_ar, slug, language,
          word_count, reading_time_min, publication_state, policy_ref, workspace_ref,
          primary_source_ref, tags_json, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        input.core_user_ref,
        input.doc_type ?? 'note',
        input.title,
        bindNullableString(input.title_ar),
        bindNullableString(input.slug),
        input.language ?? 'en',
        bindNullableNumber(input.word_count),
        bindNullableNumber(input.reading_time_min),
        input.publication_state ?? 'draft',
        bindNullableString(input.policy_ref),
        bindNullableString(input.workspace_ref),
        bindNullableString(input.primary_source_ref),
        input.tags_json ?? '[]',
        input.meta_json ?? '{}',
        now,
        now,
      ],
    );

    if (input.blocks?.length) await this.replaceBlocks(docId, input.blocks);
    return (await this.findAggregate(docId, input.blocks?.length ? ['blocks'] : []))!;
  }

  async patch(docId: string, patch: CmDocumentPatch): Promise<CmDocument | null> {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now];

    if (patch.title !== undefined) { sets.push('title = ?'); vals.push(patch.title); }
    if (patch.doc_type !== undefined) { sets.push('doc_type = ?'); vals.push(patch.doc_type); }
    if (patch.title_ar !== undefined) { sets.push('title_ar = ?'); vals.push(patch.title_ar); }
    if (patch.slug !== undefined) { sets.push('slug = ?'); vals.push(patch.slug); }
    if (patch.language !== undefined) { sets.push('language = ?'); vals.push(patch.language); }
    if (patch.word_count !== undefined) { sets.push('word_count = ?'); vals.push(patch.word_count); }
    if (patch.reading_time_min !== undefined) { sets.push('reading_time_min = ?'); vals.push(patch.reading_time_min); }
    if (patch.publication_state !== undefined) { sets.push('publication_state = ?'); vals.push(patch.publication_state); }
    if (patch.policy_ref !== undefined) { sets.push('policy_ref = ?'); vals.push(patch.policy_ref); }
    if (patch.workspace_ref !== undefined) { sets.push('workspace_ref = ?'); vals.push(patch.workspace_ref); }
    if (patch.primary_source_ref !== undefined) { sets.push('primary_source_ref = ?'); vals.push(patch.primary_source_ref); }
    if (patch.tags_json !== undefined) { sets.push('tags_json = ?'); vals.push(patch.tags_json); }
    if (patch.meta_json !== undefined) { sets.push('meta_json = ?'); vals.push(patch.meta_json); }

    vals.push(docId);
    const result = await execute(
      this.db,
      `UPDATE cm_documents SET ${sets.join(', ')} WHERE doc_id = ?`,
      vals,
    );
    if (!result.meta.changes) return null;

    if (patch.blocks !== undefined) await this.replaceBlocks(docId, patch.blocks);
    return this.findById(docId);
  }

  async archive(docId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await execute(
      this.db,
      `UPDATE cm_documents
       SET publication_state = 'archived', updated_at = ?
       WHERE doc_id = ?`,
      [now, docId],
    );
    return (result.meta.changes ?? 0) > 0;
  }

  async hardDelete(docId: string): Promise<boolean> {
    const blocks = await this.blocks(docId);
    if (blocks.length) {
      const blockIds = blocks.map((block) => block.block_id);
      const placeholders = blockIds.map(() => '?').join(', ');
      await execute(this.db, `DELETE FROM cm_block_refs WHERE block_id IN (${placeholders})`, blockIds);
      await execute(this.db, `DELETE FROM cm_block_embeds WHERE block_id IN (${placeholders})`, blockIds);
    }

    await execute(this.db, `DELETE FROM cm_blocks WHERE doc_id = ?`, [docId]);
    await execute(this.db, `DELETE FROM cm_document_versions WHERE doc_id = ?`, [docId]);
    await execute(
      this.db,
      `DELETE FROM cm_resource_links WHERE source_ref = ? OR target_ref = ?`,
      [documentRef(docId), documentRef(docId)],
    );
    const result = await execute(this.db, `DELETE FROM cm_documents WHERE doc_id = ?`, [docId]);
    return (result.meta.changes ?? 0) > 0;
  }

  blocks(docId: string): Promise<CmDocumentBlock[]> {
    return query<CmDocumentBlock>(
      this.db,
      `SELECT ${BLOCK_COLS} FROM cm_blocks
       WHERE doc_id = ?
       ORDER BY seq_order ASC, created_at ASC`,
      [docId],
    );
  }

  async blocksWithChildren(docId: string): Promise<CmDocumentBlockAggregate[]> {
    const blocks = await this.blocks(docId);
    if (!blocks.length) return [];

    const blockIds = blocks.map((block) => block.block_id);
    const placeholders = blockIds.map(() => '?').join(', ');
    const [refs, embeds] = await Promise.all([
      query<CmDocumentBlockRef>(
        this.db,
        `SELECT ${BLOCK_REF_COLS} FROM cm_block_refs
         WHERE block_id IN (${placeholders})
         ORDER BY seq_order ASC`,
        blockIds,
      ),
      query<CmDocumentBlockEmbed>(
        this.db,
        `SELECT ${BLOCK_EMBED_COLS} FROM cm_block_embeds
         WHERE block_id IN (${placeholders})`,
        blockIds,
      ),
    ]);

    const refsByBlock = new Map<string, CmDocumentBlockRef[]>();
    for (const ref of refs) {
      const existing = refsByBlock.get(ref.block_id) ?? [];
      existing.push(ref);
      refsByBlock.set(ref.block_id, existing);
    }

    const embedsByBlock = new Map<string, CmDocumentBlockEmbed[]>();
    for (const embed of embeds) {
      const existing = embedsByBlock.get(embed.block_id) ?? [];
      existing.push(embed);
      embedsByBlock.set(embed.block_id, existing);
    }

    return blocks.map((block) => ({
      ...block,
      refs: refsByBlock.get(block.block_id) ?? [],
      embeds: embedsByBlock.get(block.block_id) ?? [],
    }));
  }

  async createBlock(docId: string, input: CmDocumentBlockCreate): Promise<CmDocumentBlock> {
    const blockId = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_blocks
         (block_id, doc_id, parent_block_id, block_type, seq_order, depth,
          content_text, content_ar, attrs_json, annotations_json, meta_json,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        blockId,
        docId,
        input.parent_block_id ?? null,
        input.block_type ?? 'paragraph',
        input.seq_order ?? 0,
        input.depth ?? 0,
        input.content_text ?? null,
        input.content_ar ?? null,
        input.attrs_json ?? '{}',
        input.annotations_json ?? '[]',
        input.meta_json ?? '{}',
        now,
        now,
      ],
    );
    return (await this.findBlock(docId, blockId))!;
  }

  findBlock(docId: string, blockId: string): Promise<CmDocumentBlock | null> {
    return queryOne<CmDocumentBlock>(
      this.db,
      `SELECT ${BLOCK_COLS} FROM cm_blocks WHERE doc_id = ? AND block_id = ?`,
      [docId, blockId],
    );
  }

  async patchBlock(
    docId: string,
    blockId: string,
    patch: CmDocumentBlockPatch,
  ): Promise<CmDocumentBlock | null> {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now];

    if (patch.parent_block_id !== undefined) { sets.push('parent_block_id = ?'); vals.push(patch.parent_block_id); }
    if (patch.block_type !== undefined) { sets.push('block_type = ?'); vals.push(patch.block_type); }
    if (patch.seq_order !== undefined) { sets.push('seq_order = ?'); vals.push(patch.seq_order); }
    if (patch.depth !== undefined) { sets.push('depth = ?'); vals.push(patch.depth); }
    if (patch.content_text !== undefined) { sets.push('content_text = ?'); vals.push(patch.content_text); }
    if (patch.content_ar !== undefined) { sets.push('content_ar = ?'); vals.push(patch.content_ar); }
    if (patch.attrs_json !== undefined) { sets.push('attrs_json = ?'); vals.push(patch.attrs_json); }
    if (patch.annotations_json !== undefined) { sets.push('annotations_json = ?'); vals.push(patch.annotations_json); }
    if (patch.meta_json !== undefined) { sets.push('meta_json = ?'); vals.push(patch.meta_json); }

    vals.push(docId, blockId);
    const result = await execute(
      this.db,
      `UPDATE cm_blocks SET ${sets.join(', ')}
       WHERE doc_id = ? AND block_id = ?`,
      vals,
    );
    if (!result.meta.changes) return null;
    return this.findBlock(docId, blockId);
  }

  async deleteBlock(docId: string, blockId: string): Promise<boolean> {
    await execute(this.db, `DELETE FROM cm_block_refs WHERE block_id = ?`, [blockId]);
    await execute(this.db, `DELETE FROM cm_block_embeds WHERE block_id = ?`, [blockId]);
    const result = await execute(
      this.db,
      `DELETE FROM cm_blocks WHERE doc_id = ? AND block_id = ?`,
      [docId, blockId],
    );
    return (result.meta.changes ?? 0) > 0;
  }

  async replaceBlocks(docId: string, blocks: CmDocumentBlockCreate[]): Promise<CmDocumentBlock[]> {
    const existing = await this.blocks(docId);
    const statements: Array<{ sql: string; params?: unknown[] }> = [];

    if (existing.length) {
      const blockIds = existing.map((block) => block.block_id);
      const placeholders = blockIds.map(() => '?').join(', ');
      statements.push(
        { sql: `DELETE FROM cm_block_refs WHERE block_id IN (${placeholders})`, params: blockIds },
        { sql: `DELETE FROM cm_block_embeds WHERE block_id IN (${placeholders})`, params: blockIds },
      );
    }

    statements.push({ sql: `DELETE FROM cm_blocks WHERE doc_id = ?`, params: [docId] });

    const now = new Date().toISOString();
    for (const [index, block] of blocks.entries()) {
      statements.push({
        sql: `INSERT INTO cm_blocks
          (block_id, doc_id, parent_block_id, block_type, seq_order, depth,
           content_text, content_ar, attrs_json, annotations_json, meta_json,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          typedId('CM'),
          docId,
          block.parent_block_id ?? null,
          block.block_type ?? 'paragraph',
          block.seq_order ?? index,
          block.depth ?? 0,
          block.content_text ?? null,
          block.content_ar ?? null,
          block.attrs_json ?? '{}',
          block.annotations_json ?? '[]',
          block.meta_json ?? '{}',
          now,
          now,
        ],
      });
    }

    await executeBatch(this.db, statements);
    await execute(
      this.db,
      `UPDATE cm_documents SET updated_at = ? WHERE doc_id = ?`,
      [now, docId],
    );
    return this.blocks(docId);
  }

  refs(blockId: string): Promise<CmDocumentBlockRef[]> {
    return query<CmDocumentBlockRef>(
      this.db,
      `SELECT ${BLOCK_REF_COLS} FROM cm_block_refs
       WHERE block_id = ? ORDER BY seq_order ASC`,
      [blockId],
    );
  }

  async createRef(blockId: string, input: CmDocumentBlockRefCreate): Promise<CmDocumentBlockRef> {
    const refId = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_block_refs
         (ref_id, block_id, target_ref, ref_type, anchor_text, note, seq_order, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        refId,
        blockId,
        input.target_ref,
        input.ref_type ?? 'link',
        input.anchor_text ?? null,
        input.note ?? null,
        input.seq_order ?? 0,
        input.meta_json ?? '{}',
      ],
    );
    return (await queryOne<CmDocumentBlockRef>(
      this.db,
      `SELECT ${BLOCK_REF_COLS} FROM cm_block_refs WHERE ref_id = ?`,
      [refId],
    ))!;
  }

  async deleteRef(blockId: string, refId: string): Promise<boolean> {
    const result = await execute(
      this.db,
      `DELETE FROM cm_block_refs WHERE block_id = ? AND ref_id = ?`,
      [blockId, refId],
    );
    return (result.meta.changes ?? 0) > 0;
  }

  embeds(blockId: string): Promise<CmDocumentBlockEmbed[]> {
    return query<CmDocumentBlockEmbed>(
      this.db,
      `SELECT ${BLOCK_EMBED_COLS} FROM cm_block_embeds WHERE block_id = ?`,
      [blockId],
    );
  }

  async createEmbed(blockId: string, input: CmDocumentBlockEmbedCreate): Promise<CmDocumentBlockEmbed> {
    const embedId = typedId('CM');
    await execute(
      this.db,
      `INSERT INTO cm_block_embeds
         (embed_id, block_id, embed_type, target_ref, embed_config_json, caption, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        embedId,
        blockId,
        input.embed_type ?? 'media',
        input.target_ref ?? null,
        input.embed_config_json ?? '{}',
        input.caption ?? null,
        input.meta_json ?? '{}',
      ],
    );
    return (await queryOne<CmDocumentBlockEmbed>(
      this.db,
      `SELECT ${BLOCK_EMBED_COLS} FROM cm_block_embeds WHERE embed_id = ?`,
      [embedId],
    ))!;
  }

  async deleteEmbed(blockId: string, embedId: string): Promise<boolean> {
    const result = await execute(
      this.db,
      `DELETE FROM cm_block_embeds WHERE block_id = ? AND embed_id = ?`,
      [blockId, embedId],
    );
    return (result.meta.changes ?? 0) > 0;
  }

  async links(docId: string): Promise<{ outgoing: CmDocumentResourceLink[]; incoming: CmDocumentResourceLink[] }> {
    const ref = documentRef(docId);
    const [outgoing, incoming] = await Promise.all([
      query<CmDocumentResourceLink>(
        this.db,
        `SELECT ${LINK_COLS} FROM cm_resource_links
         WHERE source_ref = ? ORDER BY created_at DESC`,
        [ref],
      ),
      query<CmDocumentResourceLink>(
        this.db,
        `SELECT ${LINK_COLS} FROM cm_resource_links
         WHERE target_ref = ? ORDER BY created_at DESC`,
        [ref],
      ),
    ]);
    return { outgoing, incoming };
  }

  async createLink(docId: string, input: CmDocumentLinkCreate): Promise<CmDocumentResourceLink> {
    const linkId = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_resource_links
         (link_id, source_ref, target_ref, link_type, anchor_text, note,
          core_user_ref, confidence, is_ai_suggested, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        linkId,
        documentRef(docId),
        input.target_ref,
        input.link_type ?? 'references',
        input.anchor_text ?? null,
        input.note ?? null,
        input.core_user_ref ?? null,
        input.confidence ?? 1.0,
        input.is_ai_suggested ?? 0,
        input.meta_json ?? '{}',
        now,
      ],
    );
    return (await queryOne<CmDocumentResourceLink>(
      this.db,
      `SELECT ${LINK_COLS} FROM cm_resource_links WHERE link_id = ?`,
      [linkId],
    ))!;
  }

  async deleteLink(docId: string, linkId: string): Promise<boolean> {
    const ref = documentRef(docId);
    const result = await execute(
      this.db,
      `DELETE FROM cm_resource_links
       WHERE link_id = ? AND (source_ref = ? OR target_ref = ?)`,
      [linkId, ref, ref],
    );
    return (result.meta.changes ?? 0) > 0;
  }

  versions(docId: string): Promise<CmDocumentVersion[]> {
    return query<CmDocumentVersion>(
      this.db,
      `SELECT ${VERSION_COLS} FROM cm_document_versions
       WHERE doc_id = ? ORDER BY version_number DESC`,
      [docId],
    );
  }

  async createVersion(docId: string, input: CmDocumentVersionCreate = {}): Promise<CmDocumentVersion | null> {
    const doc = await this.findAggregate(docId, ['blocks', 'links']);
    if (!doc) return null;

    const next = await queryOne<{ version_number: number }>(
      this.db,
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
       FROM cm_document_versions WHERE doc_id = ?`,
      [docId],
    );

    const versionId = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_document_versions
         (version_id, doc_id, version_number, version_label, snapshot_json,
          change_summary, core_user_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        versionId,
        docId,
        next?.version_number ?? 1,
        input.version_label ?? null,
        JSON.stringify(doc),
        input.change_summary ?? null,
        input.core_user_ref ?? doc.core_user_ref,
        now,
      ],
    );

    return queryOne<CmDocumentVersion>(
      this.db,
      `SELECT ${VERSION_COLS} FROM cm_document_versions WHERE version_id = ?`,
      [versionId],
    );
  }
}
