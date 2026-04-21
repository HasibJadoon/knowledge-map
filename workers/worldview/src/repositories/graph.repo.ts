// ─── GraphRepo — L7 tables ─────────────────────────────────────────────────────
// wv_clusters, wv_cluster_members, wv_graph_projections,
// wv_graph_views, wv_node_scope_links

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── Interfaces ────────────────────────────────────────────────────────────────

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

// ─── Create input types ────────────────────────────────────────────────────────

export type ClusterCreate = Omit<WvCluster, 'id' | 'created_at'>;
export type ClusterMemberCreate = Omit<WvClusterMember, 'id' | 'created_at'>;
export type GraphProjectionCreate = Omit<WvGraphProjection, 'id' | 'created_at'>;
export type GraphViewCreate = Omit<WvGraphView, 'id' | 'created_at'>;
export type NodeScopeLinkCreate = Omit<WvNodeScopeLink, 'id' | 'created_at'>;

// ─── Column lists ──────────────────────────────────────────────────────────────

const CL_COLS  = `id, slug, title, cluster_type, description_md, tradition_id, meta_json, created_at`;
const CM_COLS  = `id, cluster_id, entity_type, entity_id, role, note, created_at`;
const GP_COLS  = `id, slug, title, projection_type, root_entity, filter_json, node_ids_json, edge_ids_json, description_md, meta_json, created_at`;
const GV_COLS  = `id, projection_id, title, layout_type, renderer_hint, filter_json, viewport_json, meta_json, created_at`;
const NSL_COLS = `id, node_id, scope_type, scope_ref, link_role, note, created_at`;

// ─── Patch helper ──────────────────────────────────────────────────────────────

function buildPatch(patch: Record<string, unknown>): { setClauses: string; values: unknown[] } {
  const keys = Object.keys(patch).filter(k => patch[k] !== undefined);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k] ?? null);
  return { setClauses, values };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GraphRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class GraphRepo {
  constructor(private db: D1Database) {}

  // ── Clusters ───────────────────────────────────────────────────────────────

  clusters(traditionId: string | null, clusterType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId)  { conds.push('tradition_id = ?');  params.push(traditionId); }
    if (clusterType)  { conds.push('cluster_type = ?');  params.push(clusterType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvCluster>(
      this.db,
      `SELECT ${CL_COLS} FROM wv_clusters ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_clusters ${where}`,
      params, opts,
    );
  }

  findClusterById(id: string): Promise<WvCluster | null> {
    return queryOne<WvCluster>(
      this.db, `SELECT ${CL_COLS} FROM wv_clusters WHERE id = ?`, [id],
    );
  }

  async createCluster(input: ClusterCreate): Promise<WvCluster> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_clusters
         (id, slug, title, cluster_type, description_md, tradition_id, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.cluster_type,
       input.description_md ?? null, input.tradition_id ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findClusterById(id))!;
  }

  async patchCluster(id: string, patch: Partial<ClusterCreate>): Promise<WvCluster | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findClusterById(id);
    await execute(this.db, `UPDATE wv_clusters SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findClusterById(id);
  }

  // ── Cluster Members ────────────────────────────────────────────────────────

  members(clusterId: string): Promise<WvClusterMember[]> {
    return query<WvClusterMember>(
      this.db,
      `SELECT ${CM_COLS} FROM wv_cluster_members WHERE cluster_id = ? ORDER BY entity_type, role`,
      [clusterId],
    );
  }

  async addMember(input: ClusterMemberCreate): Promise<WvClusterMember> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT OR IGNORE INTO wv_cluster_members
         (id, cluster_id, entity_type, entity_id, role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.cluster_id, input.entity_type, input.entity_id,
       input.role ?? null, input.note ?? null, now],
    );
    return (await queryOne<WvClusterMember>(
      this.db,
      `SELECT ${CM_COLS} FROM wv_cluster_members WHERE cluster_id = ? AND entity_type = ? AND entity_id = ?`,
      [input.cluster_id, input.entity_type, input.entity_id],
    ))!;
  }

  async removeMember(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_cluster_members WHERE id = ?`, [id]);
  }

  // ── Graph Projections ──────────────────────────────────────────────────────

  projections(projectionType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (projectionType) { conds.push('projection_type = ?'); params.push(projectionType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvGraphProjection>(
      this.db,
      `SELECT ${GP_COLS} FROM wv_graph_projections ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_graph_projections ${where}`,
      params, opts,
    );
  }

  findProjectionById(id: string): Promise<WvGraphProjection | null> {
    return queryOne<WvGraphProjection>(
      this.db, `SELECT ${GP_COLS} FROM wv_graph_projections WHERE id = ?`, [id],
    );
  }

  async createProjection(input: GraphProjectionCreate): Promise<WvGraphProjection> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_graph_projections
         (id, slug, title, projection_type, root_entity, filter_json,
          node_ids_json, edge_ids_json, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.projection_type,
       input.root_entity ?? null, input.filter_json ?? null,
       input.node_ids_json ?? null, input.edge_ids_json ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findProjectionById(id))!;
  }

  async patchProjection(id: string, patch: Partial<GraphProjectionCreate>): Promise<WvGraphProjection | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findProjectionById(id);
    await execute(this.db, `UPDATE wv_graph_projections SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findProjectionById(id);
  }

  // ── Graph Views ────────────────────────────────────────────────────────────

  views(projectionId: string): Promise<WvGraphView[]> {
    return query<WvGraphView>(
      this.db,
      `SELECT ${GV_COLS} FROM wv_graph_views WHERE projection_id = ? ORDER BY title`,
      [projectionId],
    );
  }

  findViewById(id: string): Promise<WvGraphView | null> {
    return queryOne<WvGraphView>(
      this.db, `SELECT ${GV_COLS} FROM wv_graph_views WHERE id = ?`, [id],
    );
  }

  async createView(input: GraphViewCreate): Promise<WvGraphView> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_graph_views
         (id, projection_id, title, layout_type, renderer_hint, filter_json,
          viewport_json, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.projection_id, input.title, input.layout_type,
       input.renderer_hint ?? null, input.filter_json ?? null,
       input.viewport_json ?? null, input.meta_json ?? null, now],
    );
    return (await this.findViewById(id))!;
  }

  async patchView(id: string, patch: Partial<GraphViewCreate>): Promise<WvGraphView | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findViewById(id);
    await execute(this.db, `UPDATE wv_graph_views SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findViewById(id);
  }

  // ── Node Scope Links ───────────────────────────────────────────────────────

  nodeScopeLinks(nodeId: string): Promise<WvNodeScopeLink[]> {
    return query<WvNodeScopeLink>(
      this.db,
      `SELECT ${NSL_COLS} FROM wv_node_scope_links WHERE node_id = ? ORDER BY scope_type`,
      [nodeId],
    );
  }

  findNodeScopeLinkById(id: string): Promise<WvNodeScopeLink | null> {
    return queryOne<WvNodeScopeLink>(
      this.db, `SELECT ${NSL_COLS} FROM wv_node_scope_links WHERE id = ?`, [id],
    );
  }

  async addNodeScopeLink(input: NodeScopeLinkCreate): Promise<WvNodeScopeLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_node_scope_links
         (id, node_id, scope_type, scope_ref, link_role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.node_id, input.scope_type, input.scope_ref,
       input.link_role ?? null, input.note ?? null, now],
    );
    return (await this.findNodeScopeLinkById(id))!;
  }

  async removeNodeScopeLink(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_node_scope_links WHERE id = ?`, [id]);
  }
}
