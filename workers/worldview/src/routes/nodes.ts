// ─── /wv/nodes routes ─────────────────────────────────────────────────────────
// Knowledge graph nodes + edges. The civilizational reasoning ontology lives here.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { NodeRepo } from '../repositories/node.repo';

export function nodeRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/nodes?type=concept&tradition=WV:ULID
  router.get('/wv/nodes', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new NodeRepo(env.DB_WV).list(
        url.searchParams.get('type'),
        url.searchParams.get('tradition'),
        parsePagination(url),
      ),
    );
  });

  // GET /wv/nodes/:id
  router.get('/wv/nodes/:id', async (_req, env, { id }) => {
    const node = await new NodeRepo(env.DB_WV).findById(id);
    return node ? ok(node) : notFound(`node ${id}`);
  });

  // GET /wv/nodes/:id/edges — outgoing edges from this node
  router.get('/wv/nodes/:id/edges', async (_req, env, { id }) => {
    return ok(await new NodeRepo(env.DB_WV).edges(id));
  });

  // POST /wv/nodes
  router.post('/wv/nodes', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.node_type || !b.title) return badRequest('node_type and title required');
    return created(await new NodeRepo(env.DB_WV).createNode({
      node_type:    String(b.node_type),
      title:        String(b.title),
      summary:      (b.summary as string | null) ?? null,
      tradition_id: (b.tradition_id as string | null) ?? null,
    }));
  });

  // POST /wv/node-edges — connect two nodes
  router.post('/wv/node-edges', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.from_node_id || !b.to_node_id || !b.relation_type)
      return badRequest('from_node_id, to_node_id, relation_type required');
    return created(await new NodeRepo(env.DB_WV).createEdge({
      from_node_id:  String(b.from_node_id),
      to_node_id:    String(b.to_node_id),
      relation_type: String(b.relation_type),
      note:          (b.note as string | null) ?? null,
    }));
  });
}
