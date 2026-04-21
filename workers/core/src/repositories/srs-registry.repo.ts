// ─── SrsRegistryRepo — core_srs_registry + core_workspace_plans ───────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SrsRegistryCard {
  id: string;
  user_ref: string;
  workspace_id: string | null;
  resource_ref: string;
  resource_type: 'vocabulary' | 'grammar' | 'root' | 'lemma' | 'ayah' | 'concept' | 'other';
  module: 'AR' | 'AL' | 'QR' | 'WV' | 'other';
  card_ref: string | null;
  enqueued_at: string;
  last_review_at: string | null;
  next_review_at: string | null;
  total_reviews: number;
}

export interface SrsCardInput {
  userRef: string;
  workspaceId?: string;
  resourceRef: string;
  resourceType: SrsRegistryCard['resource_type'];
  module: SrsRegistryCard['module'];
  cardRef?: string;
  nextReviewAt?: string;
}

export interface SrsCardUpdateInput {
  cardRef?: string;
  lastReviewAt?: string;
  nextReviewAt?: string;
  totalReviews?: number;
}

export interface WorkspacePlan {
  id: string;
  workspace_id: string;
  pl_plan_ref: string;
  title: string;
  plan_type: 'study' | 'curriculum' | 'class' | 'personal' | 'team' | 'other';
  owner_user_ref: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  visibility: string;
  started_at: string | null;
  target_end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePlanCreate {
  workspaceId: string;
  plPlanRef: string;
  title: string;
  planType?: WorkspacePlan['plan_type'];
  ownerUserRef: string;
  status?: WorkspacePlan['status'];
  visibility?: string;
  startedAt?: string;
  targetEndAt?: string;
}

export type WorkspacePlanPatch = Partial<Omit<WorkspacePlanCreate, 'workspaceId' | 'plPlanRef' | 'ownerUserRef'>>;

export interface WorkspacePlansListOptions extends PaginateOptions {
  status?: WorkspacePlan['status'];
  ownerUserRef?: string;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const SRS_COLS = `
  id, user_ref, workspace_id, resource_ref, resource_type, module,
  card_ref, enqueued_at, last_review_at, next_review_at, total_reviews
FROM core_srs_registry`;

const PLAN_COLS = `
  id, workspace_id, pl_plan_ref, title, plan_type, owner_user_ref,
  status, visibility, started_at, target_end_at, created_at, updated_at
FROM core_workspace_plans`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class SrsRegistryRepo {
  constructor(private db: D1Database) {}

  // ── SRS Registry ──

  findCard(userRef: string, cardRef: string): Promise<SrsRegistryCard | null> {
    return queryOne<SrsRegistryCard>(
      this.db,
      `SELECT ${SRS_COLS} WHERE user_ref = ? AND card_ref = ?`,
      [userRef, cardRef],
    );
  }

  findCardByResource(userRef: string, resourceRef: string): Promise<SrsRegistryCard | null> {
    return queryOne<SrsRegistryCard>(
      this.db,
      `SELECT ${SRS_COLS} WHERE user_ref = ? AND resource_ref = ?`,
      [userRef, resourceRef],
    );
  }

  async upsertCard(input: SrsCardInput): Promise<SrsRegistryCard> {
    const existing = await this.findCardByResource(input.userRef, input.resourceRef);

    if (!existing) {
      const id = typedId('CORE');
      const now = new Date().toISOString();
      await execute(
        this.db,
        `INSERT INTO core_srs_registry
           (id, user_ref, workspace_id, resource_ref, resource_type, module,
            card_ref, enqueued_at, last_review_at, next_review_at, total_reviews)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0)`,
        [
          id,
          input.userRef,
          input.workspaceId ?? null,
          input.resourceRef,
          input.resourceType,
          input.module,
          input.cardRef ?? null,
          now,
          input.nextReviewAt ?? null,
        ],
      );
      return (await this.findCardByResource(input.userRef, input.resourceRef))!;
    }

    // Update existing — patch card_ref / next_review_at if provided
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (input.cardRef !== undefined)     { sets.push('card_ref = ?');      vals.push(input.cardRef); }
    if (input.nextReviewAt !== undefined){ sets.push('next_review_at = ?'); vals.push(input.nextReviewAt); }
    if (sets.length > 0) {
      vals.push(input.userRef, input.resourceRef);
      await execute(
        this.db,
        `UPDATE core_srs_registry SET ${sets.join(', ')} WHERE user_ref = ? AND resource_ref = ?`,
        vals,
      );
    }
    return (await this.findCardByResource(input.userRef, input.resourceRef))!;
  }

  async updateCard(userRef: string, resourceRef: string, patch: SrsCardUpdateInput): Promise<void> {
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.cardRef !== undefined)      { sets.push('card_ref = ?');       vals.push(patch.cardRef); }
    if (patch.lastReviewAt !== undefined) { sets.push('last_review_at = ?'); vals.push(patch.lastReviewAt); }
    if (patch.nextReviewAt !== undefined) { sets.push('next_review_at = ?'); vals.push(patch.nextReviewAt); }
    if (patch.totalReviews !== undefined) { sets.push('total_reviews = ?');  vals.push(patch.totalReviews); }

    if (sets.length === 0) return;

    vals.push(userRef, resourceRef);
    await execute(
      this.db,
      `UPDATE core_srs_registry SET ${sets.join(', ')} WHERE user_ref = ? AND resource_ref = ?`,
      vals,
    );
  }

  dueCards(userRef: string, limit = 50): Promise<SrsRegistryCard[]> {
    return query<SrsRegistryCard>(
      this.db,
      `SELECT ${SRS_COLS}
       WHERE user_ref = ?
         AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
       ORDER BY next_review_at ASC
       LIMIT ?`,
      [userRef, limit],
    );
  }

  userCards(userRef: string, module?: string): Promise<SrsRegistryCard[]> {
    if (module) {
      return query<SrsRegistryCard>(
        this.db,
        `SELECT ${SRS_COLS} WHERE user_ref = ? AND module = ? ORDER BY enqueued_at DESC`,
        [userRef, module],
      );
    }
    return query<SrsRegistryCard>(
      this.db,
      `SELECT ${SRS_COLS} WHERE user_ref = ? ORDER BY enqueued_at DESC`,
      [userRef],
    );
  }

  // ── Workspace Plans ──

  workspacePlans(workspaceId: string, opts: WorkspacePlansListOptions = {}) {
    const conditions: string[] = ['workspace_id = ?'];
    const args: unknown[] = [workspaceId];

    if (opts.status) {
      conditions.push('status = ?');
      args.push(opts.status);
    }
    if (opts.ownerUserRef) {
      conditions.push('owner_user_ref = ?');
      args.push(opts.ownerUserRef);
    }

    const where = conditions.join(' AND ');
    return paginate<WorkspacePlan>(
      this.db,
      `SELECT ${PLAN_COLS} WHERE ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM core_workspace_plans WHERE ${where}`,
      args,
      opts,
    );
  }

  findWorkspacePlan(id: string): Promise<WorkspacePlan | null> {
    return queryOne<WorkspacePlan>(
      this.db,
      `SELECT ${PLAN_COLS} WHERE id = ?`,
      [id],
    );
  }

  findWorkspacePlanByRef(plPlanRef: string): Promise<WorkspacePlan | null> {
    return queryOne<WorkspacePlan>(
      this.db,
      `SELECT ${PLAN_COLS} WHERE pl_plan_ref = ?`,
      [plPlanRef],
    );
  }

  async createWorkspacePlan(input: WorkspacePlanCreate): Promise<WorkspacePlan> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_workspace_plans
         (id, workspace_id, pl_plan_ref, title, plan_type, owner_user_ref,
          status, visibility, started_at, target_end_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.plPlanRef,
        input.title,
        input.planType ?? 'study',
        input.ownerUserRef,
        input.status ?? 'active',
        input.visibility ?? 'workspace',
        input.startedAt ?? null,
        input.targetEndAt ?? null,
        now,
        now,
      ],
    );
    return (await this.findWorkspacePlan(id))!;
  }

  async patchWorkspacePlan(id: string, patch: WorkspacePlanPatch): Promise<WorkspacePlan | null> {
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [new Date().toISOString()];

    if (patch.title !== undefined)       { sets.push('title = ?');          vals.push(patch.title); }
    if (patch.planType !== undefined)    { sets.push('plan_type = ?');       vals.push(patch.planType); }
    if (patch.status !== undefined)      { sets.push('status = ?');          vals.push(patch.status); }
    if (patch.visibility !== undefined)  { sets.push('visibility = ?');      vals.push(patch.visibility); }
    if (patch.startedAt !== undefined)   { sets.push('started_at = ?');      vals.push(patch.startedAt); }
    if (patch.targetEndAt !== undefined) { sets.push('target_end_at = ?');   vals.push(patch.targetEndAt); }

    if (sets.length === 1) return this.findWorkspacePlan(id);

    vals.push(id);
    await execute(
      this.db,
      `UPDATE core_workspace_plans SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findWorkspacePlan(id);
  }
}
