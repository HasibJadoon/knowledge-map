// ─── Node schemas & types ───────────────────────────────────────────────

export interface WvNode {
  id: string;               // WV:ULID
  node_type: string;        // concept|claim|theme|tafsir_view|event|institution
  title: string;
  summary: string | null;
  tradition_id: string | null; // WV:ULID
  status: string;
  created_at: string;
}

export interface WvEdge {
  id: string;               // WV:ULID
  from_node_id: string;
  to_node_id: string;
  relation_type: string;    // supports|contradicts|related_to|part_of|etc.
  note: string | null;
  created_at: string;
}

export interface NodeCreate {
  node_type: string;
  title: string;
  summary?: string | null;
  tradition_id?: string | null;
}

export interface EdgeCreate {
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateNodeCreate(body: unknown): SchemaValidationResult<NodeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.node_type !== 'string' || !b.node_type.trim()) return { error: 'node_type is required and must be a non-empty string' };
  data.node_type = b.node_type.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('summary' in b) {
    if (b.summary !== null && typeof b.summary !== 'string') return { error: 'summary must be a string or null' };
    data.summary = b.summary;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }

  return { data: data as unknown as NodeCreate };
}

export function validateEdgeCreate(body: unknown): SchemaValidationResult<EdgeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_node_id !== 'string' || !b.from_node_id.trim()) return { error: 'from_node_id is required and must be a non-empty string' };
  data.from_node_id = b.from_node_id.trim();
  if (typeof b.to_node_id !== 'string' || !b.to_node_id.trim()) return { error: 'to_node_id is required and must be a non-empty string' };
  data.to_node_id = b.to_node_id.trim();
  if (typeof b.relation_type !== 'string' || !b.relation_type.trim()) return { error: 'relation_type is required and must be a non-empty string' };
  data.relation_type = b.relation_type.trim();
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as EdgeCreate };
}
