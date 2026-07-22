// ─── Control-system dashboard models ──────────────────────────────────────────
// UI-facing shapes for the km-core "control systems" command deck. Mirrors the
// wire shape of GET /api/core/dashboard (workers/core → DashboardRepo.snapshot).

export type SubsystemStatus = 'nominal' | 'active' | 'idle' | 'alert';

export interface SubsystemStat {
  key: string;
  label: string;
  total: number;
  active: number;
  status: SubsystemStatus;
}

export interface FeedEvent {
  id: string;
  kind: 'activity' | 'audit';
  actor_user_ref: string;
  label: string;
  resource_ref: string | null;
  workspace_id: string | null;
  created_at: string;
}

export interface FeatureFlag {
  flag_key: string;
  title: string;
  is_enabled: number;
  rollout_percent: number;
  updated_at: string;
}

export interface ControlSnapshot {
  generated_at: string;
  subsystems: SubsystemStat[];
  health_index: number;
  totals: Record<string, number>;
  feature_flags: FeatureFlag[];
  feed: FeedEvent[];
}
