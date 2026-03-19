import type { D1Database } from '@cloudflare/workers-types';

export interface BrainstormIdeaDto {
  id: string;
  topicId: string;
  text: string;
  created_at: string;
  updated_at: string;
  highlighted: boolean;
  pinned: boolean;
  tags: string[];
  reference: string;
  context: string;
}

export interface BrainstormTopicDto {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  ideas: BrainstormIdeaDto[];
}

type BrainstormSessionRow = Record<string, unknown>;

type StoredBrainstormIdea = {
  id?: unknown;
  text?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  highlighted?: unknown;
  pinned?: unknown;
  tags?: unknown;
  reference?: unknown;
  context?: unknown;
};

type StoredBrainstormPayload = Record<string, unknown> & {
  entity_type?: unknown;
  schema_version?: unknown;
  topic?: unknown;
  status?: unknown;
  stage?: unknown;
  mobile_topic?: unknown;
  pane_bundle?: unknown;
  sources?: unknown;
  brain_items?: unknown;
  topic_concept_ids?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  user_id?: unknown;
};

export const BRAINSTORM_SESSION_COLUMNS = [
  'id',
  'user_id',
  'topic',
  'status',
  'stage',
  'schema_version',
  'revision',
  'session_json',
  'created_at',
  'updated_at',
].join(', ');

export const jsonHeaders: HeadersInit = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const payload = (await request.json().catch(() => null)) as unknown;
  return asRecord(payload);
}

export function readParam(
  params: Record<string, unknown> | undefined,
  key: string,
): string {
  const raw = params?.[key];
  if (typeof raw === 'string') {
    return raw.trim();
  }

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    return raw[0].trim();
  }

  return '';
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
    )
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function ensureBrainstormTable(db: D1Database): Promise<void> {
  await db.prepare(
    `
    CREATE TABLE IF NOT EXISTS wv_brainstorm_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      topic TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      stage TEXT NOT NULL DEFAULT 'raw',
      schema_version INTEGER NOT NULL DEFAULT 2,
      revision INTEGER,
      session_json JSON NOT NULL CHECK (json_valid(session_json)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
    `
  ).run();

  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_wv_brainstorm_user_id ON wv_brainstorm_sessions(user_id)'
  ).run();
}

export async function listOwnedBrainstormRows(
  db: D1Database,
  userId: number,
): Promise<BrainstormSessionRow[]> {
  const { results = [] } = await db.prepare(
    `
    SELECT ${BRAINSTORM_SESSION_COLUMNS}
    FROM wv_brainstorm_sessions
    WHERE user_id = ?1
    ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
    `
  ).bind(userId).all<BrainstormSessionRow>();

  return results;
}

export async function fetchOwnedBrainstormRow(
  db: D1Database,
  topicId: string,
  userId: number,
): Promise<BrainstormSessionRow | null> {
  return db.prepare(
    `
    SELECT ${BRAINSTORM_SESSION_COLUMNS}
    FROM wv_brainstorm_sessions
    WHERE id = ?1 AND user_id = ?2
    LIMIT 1
    `
  ).bind(topicId, userId).first<BrainstormSessionRow>();
}

export function mapBrainstormRow(row: unknown): BrainstormTopicDto {
  const record = asRecord(row) ?? {};
  const topicId = readString(record['id']) ?? '';
  const createdAt = readString(record['created_at']) ?? nowIso();
  const updatedAt = readString(record['updated_at']) ?? createdAt;
  const payload = parseStoredPayload(record['session_json']);
  const mobileTopic = asRecord(payload?.['mobile_topic']);
  const rawIdeas = Array.isArray(mobileTopic?.['ideas']) ? mobileTopic?.['ideas'] : [];

  const ideas = rawIdeas
    .map((idea) => normalizeIdea(idea as StoredBrainstormIdea, topicId, createdAt, updatedAt))
    .filter((idea) => idea.text.length > 0)
    .sort(sortIdeas);

  return {
    id: topicId,
    title: readTrimmedString(record['topic'])
      ?? readTrimmedString(payload?.['topic'])
      ?? 'Untitled Topic',
    created_at: createdAt,
    updated_at: updatedAt,
    archived: (readString(record['status']) ?? readString(payload?.['status']) ?? 'open') === 'archived',
    ideas,
  };
}

export async function insertBrainstormTopic(
  db: D1Database,
  userId: number,
  topic: BrainstormTopicDto,
): Promise<void> {
  const sessionJson = JSON.stringify(buildSessionPayload(null, topic, userId));

  await db.prepare(
    `
    INSERT INTO wv_brainstorm_sessions (
      id,
      user_id,
      topic,
      status,
      stage,
      schema_version,
      revision,
      session_json,
      created_at,
      updated_at
    )
    VALUES (?1, ?2, ?3, ?4, 'raw', 2, 1, ?5, ?6, ?7)
    `
  ).bind(
    topic.id,
    userId,
    topic.title,
    topic.archived ? 'archived' : 'open',
    sessionJson,
    topic.created_at,
    topic.updated_at,
  ).run();
}

export async function persistBrainstormTopic(
  db: D1Database,
  row: BrainstormSessionRow,
  userId: number,
  topic: BrainstormTopicDto,
): Promise<void> {
  const revision = parseFiniteNumber(row['revision']) + 1;
  const payload = parseStoredPayload(row['session_json']);
  const sessionJson = JSON.stringify(buildSessionPayload(payload, topic, userId));

  await db.prepare(
    `
    UPDATE wv_brainstorm_sessions
    SET topic = ?3,
        status = ?4,
        stage = 'raw',
        schema_version = 2,
        revision = ?5,
        session_json = ?6,
        updated_at = ?7
    WHERE id = ?1 AND user_id = ?2
    `
  ).bind(
    topic.id,
    userId,
    topic.title,
    topic.archived ? 'archived' : 'open',
    revision,
    sessionJson,
    topic.updated_at,
  ).run();
}

export function applyIdeaUpdate(
  idea: BrainstormIdeaDto,
  changes: Record<string, unknown>,
  updatedAt: string,
): BrainstormIdeaDto | null {
  const nextText = readTrimmedString(changes['text']) ?? idea.text;
  if (!nextText) {
    return null;
  }

  const nextReference = readString(changes['reference']);
  const nextContext = readString(changes['context']);
  const nextHighlighted = readBoolean(changes['highlighted']);
  const nextPinned = readBoolean(changes['pinned']);
  const nextTags = changes['tags'] === undefined ? idea.tags : readStringArray(changes['tags']);

  return {
    ...idea,
    text: nextText,
    highlighted: nextHighlighted ?? idea.highlighted,
    pinned: nextPinned ?? idea.pinned,
    tags: nextTags,
    reference: nextReference === null ? idea.reference : nextReference.trim(),
    context: nextContext === null ? idea.context : nextContext.trim(),
    updated_at: updatedAt,
  };
}

function normalizeIdea(
  rawIdea: StoredBrainstormIdea,
  topicId: string,
  fallbackCreatedAt: string,
  fallbackUpdatedAt: string,
): BrainstormIdeaDto {
  const createdAt = readString(rawIdea.created_at) ?? fallbackCreatedAt;
  const updatedAt = readString(rawIdea.updated_at) ?? createdAt ?? fallbackUpdatedAt;

  return {
    id: readString(rawIdea.id) ?? crypto.randomUUID(),
    topicId,
    text: readTrimmedString(rawIdea.text) ?? '',
    created_at: createdAt,
    updated_at: updatedAt,
    highlighted: Boolean(rawIdea.highlighted),
    pinned: Boolean(rawIdea.pinned),
    tags: readStringArray(rawIdea.tags),
    reference: readString(rawIdea.reference)?.trim() ?? '',
    context: readString(rawIdea.context)?.trim() ?? '',
  };
}

function sortIdeas(left: BrainstormIdeaDto, right: BrainstormIdeaDto): number {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }

  if (left.highlighted !== right.highlighted) {
    return left.highlighted ? -1 : 1;
  }

  return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
}

function parseStoredPayload(value: unknown): StoredBrainstormPayload | null {
  const direct = asRecord(value);
  if (direct) {
    return direct as StoredBrainstormPayload;
  }

  const raw = readString(value);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return asRecord(parsed) as StoredBrainstormPayload | null;
  } catch {
    return null;
  }
}

function buildSessionPayload(
  currentPayload: StoredBrainstormPayload | null,
  topic: BrainstormTopicDto,
  userId: number,
): Record<string, unknown> {
  const payload = currentPayload ?? {};
  const paneBundle = asRecord(payload['pane_bundle']) ?? {
    bundle_type: 'custom',
    origin: null,
    panes: [],
  };

  return {
    ...payload,
    entity_type: 'brainstorm_session',
    schema_version: 2,
    id: topic.id,
    topic: topic.title,
    topic_concept_ids: Array.isArray(payload['topic_concept_ids']) ? payload['topic_concept_ids'] : [],
    status: topic.archived ? 'archived' : 'open',
    stage: readTrimmedString(payload['stage']) ?? 'raw',
    user_id: userId,
    sources: Array.isArray(payload['sources']) ? payload['sources'] : [],
    pane_bundle: {
      bundle_type: readTrimmedString(paneBundle['bundle_type']) ?? 'custom',
      origin: paneBundle['origin'] ?? null,
      panes: Array.isArray(paneBundle['panes']) ? paneBundle['panes'] : [],
    },
    brain_items: Array.isArray(payload['brain_items']) ? payload['brain_items'] : [],
    mobile_topic: {
      version: 1,
      ideas: topic.ideas.map((idea) => ({
        id: idea.id,
        text: idea.text,
        created_at: idea.created_at,
        updated_at: idea.updated_at,
        highlighted: idea.highlighted,
        pinned: idea.pinned,
        tags: idea.tags,
        reference: idea.reference,
        context: idea.context,
      })),
    },
    created_at: readString(payload['created_at']) ?? topic.created_at,
    updated_at: topic.updated_at,
  };
}

function parseFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
