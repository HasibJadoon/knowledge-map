import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import { json } from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export interface WorkspaceRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  workspace_type: string;
  membership_role: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

// GET /workspaces — list all workspaces the authenticated user belongs to
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const { results } = await ctx.env.DB.prepare(
      `
      SELECT
        w.id,
        w.slug,
        w.title,
        w.description,
        w.workspace_type,
        wm.membership_role,
        w.status,
        w.created_at,
        w.updated_at
      FROM workspaces w
      INNER JOIN workspace_members wm
        ON wm.workspace_id = w.id AND wm.user_id = ?1
      WHERE w.status = 'active'
        AND wm.status = 'active'
      ORDER BY w.title ASC
      `
    )
      .bind(user.id)
      .all<WorkspaceRow>();

    return json({ ok: true, workspaces: results ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load workspaces.';
    return json({ ok: false, error: message }, 500);
  }
};
