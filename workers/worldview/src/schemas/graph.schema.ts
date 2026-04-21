// ─── Graph schemas & types ───────────────────────────────────────────────

export interface WvCluster {
  id: string;
  slug: string;
  title: string;
  cluster_type: string;
  description_md: string | null;
  tradition_id: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvClusterMember {
  id: string;
  cluster_id: string;
  entity_type: string;
  entity_id: string;
  role: string | null;
  note: string | null;
  created_at: string;
}

export interface WvGraphProjection {
  id: string;
  slug: string;
  title: string;
  projection_type: string;
  root_entity: string | null;
  filter_json: string | null;
  node_ids_json: string | null;
  edge_ids_json: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvGraphView {
  id: string;
  projection_id: string;
  title: string;
  layout_type: string;
  renderer_hint: string | null;
  filter_json: string | null;
  viewport_json: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvNodeScopeLink {
  id: string;
  node_id: string;
  scope_type: string;
  scope_ref: string;
  link_role: string | null;
  note: string | null;
  created_at: string;
}

export type ClusterCreate = Omit<WvCluster, 'id' | 'created_at'>;

export type ClusterMemberCreate = Omit<WvClusterMember, 'id' | 'created_at'>;

export type GraphProjectionCreate = Omit<WvGraphProjection, 'id' | 'created_at'>;

export type GraphViewCreate = Omit<WvGraphView, 'id' | 'created_at'>;

export type NodeScopeLinkCreate = Omit<WvNodeScopeLink, 'id' | 'created_at'>;

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateClusterCreate(body: unknown): SchemaValidationResult<ClusterCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ClusterCreate };
}

export function validateClusterMemberCreate(body: unknown): SchemaValidationResult<ClusterMemberCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ClusterMemberCreate };
}

export function validateGraphProjectionCreate(body: unknown): SchemaValidationResult<GraphProjectionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as GraphProjectionCreate };
}

export function validateGraphViewCreate(body: unknown): SchemaValidationResult<GraphViewCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as GraphViewCreate };
}

export function validateNodeScopeLinkCreate(body: unknown): SchemaValidationResult<NodeScopeLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as NodeScopeLinkCreate };
}
