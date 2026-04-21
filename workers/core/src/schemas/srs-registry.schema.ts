// ─── SRS Registry & Workspace Plans schemas & types ───────────────────────────

// core_srs_registry
// CORE tracks which user has an SRS card for which resource.
// Actual card data (stability, difficulty, FSRS state) lives in AR.
export interface SrsRegistryCard {
  id: string;                                           // CORE:ULID
  user_ref: string;                                     // 'CORE:<user_id>'
  workspace_id: string | null;
  resource_ref: string;                                 // typed ref to the item being learned
  resource_type: 'vocabulary' | 'grammar' | 'root' | 'lemma' | 'ayah' | 'concept' | 'other';
  module: 'AR' | 'AL' | 'QR' | 'WV' | 'other';
  card_ref: string | null;                              // 'AR:<srs_card_id>' once created
  enqueued_at: string;
  last_review_at: string | null;
  next_review_at: string | null;
  total_reviews: number;
}

export interface SrsCardUpsert {
  user_ref: string;
  workspace_id?: string;
  resource_ref: string;
  resource_type: SrsRegistryCard['resource_type'];
  module: SrsRegistryCard['module'];
  card_ref: string;
  next_review_at?: string;
}

// core_workspace_plans
// Lightweight metadata linking a PL plan to workspace context.
// Plan data lives in km_planner; this is the workspace-level handle.
export interface WorkspacePlan {
  id: string;                                           // CORE:ULID
  workspace_id: string;                                 // CORE:ULID → core_workspaces
  pl_plan_ref: string;                                  // 'PL:<pl_plans.id>' (UNIQUE)
  title: string;
  plan_type: 'study' | 'curriculum' | 'class' | 'personal' | 'team' | 'other';
  owner_user_ref: string;                               // 'CORE:<user_id>'
  status: 'active' | 'paused' | 'completed' | 'archived';
  visibility: 'private' | 'workspace' | 'public';
  started_at: string | null;
  target_end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePlanCreate {
  workspace_id: string;
  pl_plan_ref: string;
  title: string;
  plan_type?: WorkspacePlan['plan_type'];
  owner_user_ref: string;
  visibility?: 'private' | 'workspace' | 'public';
}

export interface WorkspacePlanPatch {
  title?: string;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  visibility?: 'private' | 'workspace' | 'public';
  target_end_at?: string | null;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateSrsCardUpsert(
  body: unknown,
): { data: SrsCardUpsert } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.user_ref !== 'string' || !b.user_ref.trim())
    return { error: 'user_ref is required' };
  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim())
    return { error: 'resource_ref is required' };
  if (typeof b.card_ref !== 'string' || !b.card_ref.trim())
    return { error: 'card_ref is required' };

  const resourceTypes = ['vocabulary', 'grammar', 'root', 'lemma', 'ayah', 'concept', 'other'] as const;
  if (!resourceTypes.includes(b.resource_type as never))
    return { error: `resource_type must be one of: ${resourceTypes.join(', ')}` };

  const modules = ['AR', 'AL', 'QR', 'WV', 'other'] as const;
  if (!modules.includes(b.module as never))
    return { error: `module must be one of: ${modules.join(', ')}` };

  const data: SrsCardUpsert = {
    user_ref: b.user_ref.trim(),
    resource_ref: b.resource_ref.trim(),
    resource_type: b.resource_type as SrsCardUpsert['resource_type'],
    module: b.module as SrsCardUpsert['module'],
    card_ref: b.card_ref.trim(),
  };

  if (typeof b.workspace_id === 'string') data.workspace_id = b.workspace_id;
  if (typeof b.next_review_at === 'string') data.next_review_at = b.next_review_at;

  return { data };
}

export function validateWorkspacePlanCreate(
  body: unknown,
): { data: WorkspacePlanCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.pl_plan_ref !== 'string' || !b.pl_plan_ref.trim())
    return { error: 'pl_plan_ref is required' };
  if (!b.pl_plan_ref.toString().startsWith('PL:'))
    return { error: 'pl_plan_ref must be in PL:ULID format' };
  if (typeof b.title !== 'string' || !b.title.trim())
    return { error: 'title is required' };
  if (typeof b.owner_user_ref !== 'string' || !b.owner_user_ref.trim())
    return { error: 'owner_user_ref is required' };

  const planTypes = ['study', 'curriculum', 'class', 'personal', 'team', 'other'] as const;
  const plan_type = (b.plan_type as string) ?? 'study';
  if (!planTypes.includes(plan_type as never))
    return { error: `plan_type must be one of: ${planTypes.join(', ')}` };

  const visibilityOptions = ['private', 'workspace', 'public'] as const;
  const visibility = (b.visibility as string) ?? 'workspace';
  if (!visibilityOptions.includes(visibility as never))
    return { error: `visibility must be one of: ${visibilityOptions.join(', ')}` };

  const data: WorkspacePlanCreate = {
    workspace_id: b.workspace_id.trim(),
    pl_plan_ref: b.pl_plan_ref.trim(),
    title: b.title.trim(),
    plan_type: plan_type as WorkspacePlanCreate['plan_type'],
    owner_user_ref: b.owner_user_ref.trim(),
    visibility: visibility as WorkspacePlanCreate['visibility'],
  };

  return { data };
}

export function validateWorkspacePlanPatch(
  body: unknown,
): { data: WorkspacePlanPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  const data: WorkspacePlanPatch = {};

  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || !b.title.trim())
      return { error: 'title must be a non-empty string' };
    data.title = b.title.trim();
  }

  if (b.status !== undefined) {
    const statuses = ['active', 'paused', 'completed', 'archived'] as const;
    if (!statuses.includes(b.status as never))
      return { error: `status must be one of: ${statuses.join(', ')}` };
    data.status = b.status as WorkspacePlanPatch['status'];
  }

  if (b.visibility !== undefined) {
    const visibilityOptions = ['private', 'workspace', 'public'] as const;
    if (!visibilityOptions.includes(b.visibility as never))
      return { error: `visibility must be one of: ${visibilityOptions.join(', ')}` };
    data.visibility = b.visibility as WorkspacePlanPatch['visibility'];
  }

  if (b.target_end_at !== undefined)
    data.target_end_at = typeof b.target_end_at === 'string' ? b.target_end_at : null;

  return { data };
}
