-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_core DB — Canonical CORE Module Schema
-- File   : Database/migrations/km-core/001_core_schema.sql
-- DB     : km_core   (binding: DB_CORE in Workers)
-- Prefix : core_*
-- Run    : wrangler d1 execute km_core --file=... --remote
--
-- Module scope:
--   Platform identity and collaboration substrate — users, auth, workspaces,
--   members, groups, roles, policy (workspace caps, resource policies, grants),
--   external refs (legacy continuity), people, podcasts, activity, notifications,
--   review queue, SRS registry, feature flags.
--
-- This is the single source of truth for identity.
-- All other modules reference users as 'CORE:<core_users.id>'
-- and workspaces as 'CORE:<core_workspaces.id>'.
--
-- Module ownership rules:
--   CORE owns: identity, auth, workspaces, policies, grants, external refs.
--   CORE must NOT own: domain semantics, documents, planner payload copies.
--
-- Policy inheritance chain (SETTLED):
--   workspace default → collection/container default → item override → explicit grant
--   visibility_scope and publication_state are separate orthogonal axes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 1  IDENTITY — USERS AND AUTH
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core_users (
  id                TEXT PRIMARY KEY,             -- ULID
  email             TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  username          TEXT UNIQUE,
  avatar_url        TEXT,
  bio_md            TEXT,
  user_type         TEXT NOT NULL DEFAULT 'human',
    -- 'human'|'service_account'|'api_key'|'other'
  platform_role     TEXT NOT NULL DEFAULT 'member',
    -- 'superadmin'|'admin'|'member'|'guest'
  account_status    TEXT NOT NULL DEFAULT 'active',
    -- 'active'|'inactive'|'suspended'|'pending_verification'|'deleted'
  email_verified    INTEGER NOT NULL DEFAULT 0,
  last_active_at    TEXT,
  timezone          TEXT,
  locale            TEXT NOT NULL DEFAULT 'en',
  preferences_json  TEXT NOT NULL DEFAULT '{}',   -- {theme, lang, notifications, srs_mode}
  meta_json         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_core_usr_email   ON core_users(email);
CREATE INDEX IF NOT EXISTS idx_core_usr_status  ON core_users(account_status);
CREATE INDEX IF NOT EXISTS idx_core_usr_role    ON core_users(platform_role);
CREATE VIRTUAL TABLE IF NOT EXISTS core_users_fts USING fts5(
  display_name, username, content='core_users', content_rowid='rowid'
);

-- Auth sessions (lightweight; production integrates Cloudflare Access / JWT)
CREATE TABLE IF NOT EXISTS core_auth_sessions (
  id              TEXT PRIMARY KEY,               -- ULID
  user_id         TEXT NOT NULL,
  session_token   TEXT NOT NULL UNIQUE,
  session_type    TEXT NOT NULL DEFAULT 'web',
    -- 'web'|'mobile'|'api'|'service'
  device_info     TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  last_seen_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL,
  is_revoked      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES core_users(id)
);
CREATE INDEX IF NOT EXISTS idx_core_as_user    ON core_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_core_as_token   ON core_auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_core_as_expires ON core_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_core_as_revoked ON core_auth_sessions(is_revoked);

-- Auth tokens (API keys, invitation tokens, password reset)
CREATE TABLE IF NOT EXISTS core_auth_tokens (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,           -- SHA-256 hash of raw token
  token_type      TEXT NOT NULL DEFAULT 'api_key',
    -- 'api_key'|'invitation'|'password_reset'|'email_verify'|'link_share'
  name            TEXT,
  scopes_json     TEXT,                           -- JSON [string] — granted scopes
  workspace_id    TEXT,                           -- optional workspace scope
  expires_at      TEXT,
  used_at         TEXT,
  revoked_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES core_users(id)
);
CREATE INDEX IF NOT EXISTS idx_core_at_user   ON core_auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_core_at_hash   ON core_auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_core_at_type   ON core_auth_tokens(token_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 2  WORKSPACES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core_workspaces (
  id              TEXT PRIMARY KEY,               -- ULID
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  workspace_type  TEXT NOT NULL DEFAULT 'personal',
    -- 'personal'|'family'|'team'|'study_group'|'class'|'organization'
  owner_id        TEXT NOT NULL,                  -- → core_users.id
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'draft'|'active'|'archived'|'suspended'
  allow_guests    INTEGER NOT NULL DEFAULT 0,
  allow_public_publish INTEGER NOT NULL DEFAULT 0,
  default_visibility TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'link_share'|'public'
  settings_json   TEXT NOT NULL DEFAULT '{}',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES core_users(id)
);
CREATE INDEX IF NOT EXISTS idx_core_ws_owner  ON core_workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_core_ws_type   ON core_workspaces(workspace_type);
CREATE INDEX IF NOT EXISTS idx_core_ws_status ON core_workspaces(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 3  WORKSPACE MEMBERSHIP, GROUPS, AND ROLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core_workspace_members (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
    -- 'owner'|'admin'|'member'|'viewer'|'guest'
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'invited'|'active'|'paused'|'left'|'removed'
  invited_by_id   TEXT,
  joined_at       TEXT,
  left_at         TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)  REFERENCES core_workspaces(id),
  FOREIGN KEY (user_id)       REFERENCES core_users(id),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_core_wm_ws     ON core_workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_wm_user   ON core_workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_core_wm_status ON core_workspace_members(status);

-- Groups (named sub-collections within a workspace)
CREATE TABLE IF NOT EXISTS core_workspace_groups (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  group_type      TEXT NOT NULL DEFAULT 'team',
    -- 'team'|'class'|'cohort'|'role_group'|'other'
  description     TEXT,
  created_by_id   TEXT NOT NULL,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)  REFERENCES core_workspaces(id),
  FOREIGN KEY (created_by_id) REFERENCES core_users(id),
  UNIQUE (workspace_id, name)
);
CREATE INDEX IF NOT EXISTS idx_core_wg_ws ON core_workspace_groups(workspace_id);

-- Group members
CREATE TABLE IF NOT EXISTS core_workspace_group_members (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',   -- 'admin'|'member'
  joined_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES core_workspace_groups(id),
  FOREIGN KEY (user_id)  REFERENCES core_users(id),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_core_wgm_group ON core_workspace_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_core_wgm_user  ON core_workspace_group_members(user_id);

-- Roles (named permission bundles, reusable across workspaces)
CREATE TABLE IF NOT EXISTS core_workspace_roles (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  role_key        TEXT NOT NULL,
  title           TEXT NOT NULL,
  permissions_json TEXT NOT NULL DEFAULT '{}',   -- {can_publish, can_invite, can_manage, etc.}
  is_system_role  INTEGER NOT NULL DEFAULT 0,     -- predefined platform role
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id),
  UNIQUE (workspace_id, role_key)
);
CREATE INDEX IF NOT EXISTS idx_core_wr_ws ON core_workspace_roles(workspace_id);

-- Member ↔ role assignments
CREATE TABLE IF NOT EXISTS core_workspace_member_roles (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL,
  role_id     TEXT NOT NULL,
  granted_by  TEXT,
  granted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,
  FOREIGN KEY (member_id) REFERENCES core_workspace_members(id),
  FOREIGN KEY (role_id)   REFERENCES core_workspace_roles(id),
  UNIQUE (member_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_core_wmr_member ON core_workspace_member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_core_wmr_role   ON core_workspace_member_roles(role_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 4  POLICY SUBSTRATE (CANONICAL ADDITIONS — 2026-04-20)
-- ─────────────────────────────────────────────────────────────────────────────

-- § 4.1  Workspace policies (workspace-level caps)
CREATE TABLE IF NOT EXISTS core_workspace_policies (
  id                       TEXT PRIMARY KEY,
  workspace_id             TEXT NOT NULL UNIQUE,
  max_visibility           TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'link_share'|'public'
  allow_public_publish     INTEGER NOT NULL DEFAULT 0,
  allow_link_share         INTEGER NOT NULL DEFAULT 1,
  allow_guest_access       INTEGER NOT NULL DEFAULT 0,
  guest_max_visibility     TEXT NOT NULL DEFAULT 'workspace',
  default_discovery        TEXT NOT NULL DEFAULT 'workspace_searchable',
    -- 'hidden'|'workspace_searchable'|'public_indexed'
  allow_member_invitations INTEGER NOT NULL DEFAULT 1,
  review_required_for_publish INTEGER NOT NULL DEFAULT 0,
  comment_policy           TEXT NOT NULL DEFAULT 'members',
    -- 'members'|'workspace'|'public'|'disabled'
  extra_json               TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_core_wpo_ws ON core_workspace_policies(workspace_id);

-- § 4.2  Resource policies (one row per governed resource ref)
--   resource_ref uses typed ID format: 'CM:<doc_id>', 'WV:<source_id>', etc.
CREATE TABLE IF NOT EXISTS core_resource_policies (
  id                 TEXT PRIMARY KEY,
  resource_ref       TEXT NOT NULL UNIQUE,        -- typed ref: 'CM:xx'|'WV:xx'|etc.
  resource_type      TEXT NOT NULL,
    -- 'document'|'note'|'source'|'media'|'comparison'|'plan'|'session'|'other'
  owner_user_ref     TEXT NOT NULL,               -- 'CORE:<user_id>'
  workspace_ref      TEXT,                        -- 'CORE:<workspace_id>'
  visibility_scope   TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'link_share'|'public'
  publication_state  TEXT NOT NULL DEFAULT 'draft',
    -- 'draft'|'review'|'published'|'archived'|'rejected'
  is_discoverable    INTEGER NOT NULL DEFAULT 1,
  allow_comments     TEXT NOT NULL DEFAULT 'workspace',
    -- 'none'|'workspace'|'public'
  allow_downloads    INTEGER NOT NULL DEFAULT 0,
  inherits_from_ref  TEXT,                        -- parent container resource_ref
  override_flag      INTEGER NOT NULL DEFAULT 0,  -- 1 = breaks inheritance explicitly
  meta_json          TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_core_rp_ref        ON core_resource_policies(resource_ref);
CREATE INDEX IF NOT EXISTS idx_core_rp_owner      ON core_resource_policies(owner_user_ref);
CREATE INDEX IF NOT EXISTS idx_core_rp_ws         ON core_resource_policies(workspace_ref);
CREATE INDEX IF NOT EXISTS idx_core_rp_visibility ON core_resource_policies(visibility_scope);
CREATE INDEX IF NOT EXISTS idx_core_rp_pub_state  ON core_resource_policies(publication_state);

-- § 4.3  Resource grants (explicit access exceptions with expiry)
CREATE TABLE IF NOT EXISTS core_resource_grants (
  id              TEXT PRIMARY KEY,
  resource_ref    TEXT NOT NULL,                  -- typed ref to resource
  subject_ref     TEXT NOT NULL,                  -- 'CORE:<user_id>' or 'CORE:<group_id>'
  subject_type    TEXT NOT NULL DEFAULT 'user',   -- 'user'|'group'|'role'|'anyone'
  access_role     TEXT NOT NULL DEFAULT 'viewer',
    -- 'viewer'|'commenter'|'editor'|'manager'|'owner'
  granted_by_ref  TEXT NOT NULL,                  -- 'CORE:<user_id>'
  granted_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT,
  is_inheritance_break INTEGER NOT NULL DEFAULT 0,
  revoked_at      TEXT,
  note            TEXT,
  UNIQUE (resource_ref, subject_ref, access_role)
);
CREATE INDEX IF NOT EXISTS idx_core_rg_resource ON core_resource_grants(resource_ref);
CREATE INDEX IF NOT EXISTS idx_core_rg_subject  ON core_resource_grants(subject_ref);
CREATE INDEX IF NOT EXISTS idx_core_rg_expires  ON core_resource_grants(expires_at);

-- § 4.4  External refs (legacy-to-new continuity and typed ref mapping)
CREATE TABLE IF NOT EXISTS core_external_refs (
  id              TEXT PRIMARY KEY,
  legacy_source   TEXT NOT NULL,                  -- e.g. 'knowledgemap'|'old_wv'|'import_v1'
  legacy_id       TEXT NOT NULL,
  legacy_type     TEXT,                           -- old table/type name
  new_module      TEXT NOT NULL,                  -- module code: 'QR'|'AL'|'WV'|'CM'|etc.
  new_typed_ref   TEXT NOT NULL,                  -- 'QR:<id>' | 'AL:<id>' etc.
  migration_batch TEXT,
  note            TEXT,
  migrated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (legacy_source, legacy_id, legacy_type)
);
CREATE INDEX IF NOT EXISTS idx_core_er_legacy ON core_external_refs(legacy_source, legacy_id);
CREATE INDEX IF NOT EXISTS idx_core_er_ref    ON core_external_refs(new_typed_ref);
CREATE INDEX IF NOT EXISTS idx_core_er_module ON core_external_refs(new_module);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 5  PEOPLE (private/workspace registry for social graph)
-- ─────────────────────────────────────────────────────────────────────────────

-- core_people: personal address book / social profile separate from identity
-- NOT the scholarly/historical registry (that's wv_people)
CREATE TABLE IF NOT EXISTS core_people (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  email           TEXT,
  relationship    TEXT,                           -- 'family'|'colleague'|'friend'|'contact'|'other'
  linked_user_id  TEXT,                           -- → core_users.id if they have an account
  visibility      TEXT NOT NULL DEFAULT 'private',
    -- 'private'|'workspace'
  notes_md        TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)   REFERENCES core_workspaces(id),
  FOREIGN KEY (linked_user_id) REFERENCES core_users(id)
);
CREATE INDEX IF NOT EXISTS idx_core_ppl_ws         ON core_people(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_ppl_visibility ON core_people(visibility);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 6  PODCASTS AND TALKING POINTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core_podcasts (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description_md  TEXT,
  podcast_type    TEXT NOT NULL DEFAULT 'discussion',
    -- 'discussion'|'lecture'|'interview'|'reading_session'|'other'
  status          TEXT NOT NULL DEFAULT 'planned',
    -- 'planned'|'recorded'|'published'|'archived'
  recorded_at     TEXT,
  duration_secs   INTEGER,
  media_ref       TEXT,                           -- 'CM:<media_asset_id>'
  host_user_ref   TEXT,                           -- 'CORE:<user_id>'
  visibility      TEXT NOT NULL DEFAULT 'workspace',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_core_pod_ws     ON core_podcasts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_pod_status ON core_podcasts(status);

CREATE TABLE IF NOT EXISTS core_podcast_participants (
  id           TEXT PRIMARY KEY,
  podcast_id   TEXT NOT NULL,
  person_id    TEXT,                              -- → core_people.id (private) or NULL
  user_ref     TEXT,                              -- 'CORE:<user_id>' if has account
  role         TEXT NOT NULL DEFAULT 'guest',     -- 'host'|'guest'|'moderator'|'producer'
  display_name TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (podcast_id) REFERENCES core_podcasts(id),
  FOREIGN KEY (person_id)  REFERENCES core_people(id)
);
CREATE INDEX IF NOT EXISTS idx_core_pp_podcast ON core_podcast_participants(podcast_id);

CREATE TABLE IF NOT EXISTS core_talking_points (
  id             TEXT PRIMARY KEY,
  podcast_id     TEXT NOT NULL,
  speaker_ref    TEXT,                            -- participant or user
  timestamp_secs INTEGER,
  content        TEXT NOT NULL,
  topic_ref      TEXT,                            -- typed ref to WV topic or QR scope
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (podcast_id) REFERENCES core_podcasts(id)
);
CREATE INDEX IF NOT EXISTS idx_core_tp_podcast ON core_talking_points(podcast_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 7  ACTIVITY, NOTIFICATIONS, AND REVIEW QUEUE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core_activity_events (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT,
  actor_user_ref  TEXT NOT NULL,                  -- 'CORE:<user_id>'
  event_type      TEXT NOT NULL,
    -- 'resource_created'|'resource_updated'|'resource_deleted'|'member_joined'|
    -- 'comment_added'|'suggestion_approved'|'plan_completed'|'session_logged'|'other'
  resource_ref    TEXT,                           -- typed ref to affected resource
  resource_type   TEXT,
  payload_json    TEXT,                           -- contextual data snapshot
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_core_ae_ws       ON core_activity_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_ae_actor    ON core_activity_events(actor_user_ref);
CREATE INDEX IF NOT EXISTS idx_core_ae_type     ON core_activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_core_ae_resource ON core_activity_events(resource_ref);
CREATE INDEX IF NOT EXISTS idx_core_ae_at       ON core_activity_events(created_at);

CREATE TABLE IF NOT EXISTS core_notifications (
  id              TEXT PRIMARY KEY,               -- ULID
  user_ref        TEXT NOT NULL,                  -- 'CORE:<user_id>'
  workspace_id    TEXT,
  notif_type      TEXT NOT NULL,
    -- 'mention'|'comment'|'approval_request'|'assignment'|'milestone'|
    -- 'suggestion'|'system'|'review'|'other'
  title           TEXT NOT NULL,
  body_md         TEXT,
  resource_ref    TEXT,
  is_read         INTEGER NOT NULL DEFAULT 0,
  read_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_core_notif_user   ON core_notifications(user_ref);
CREATE INDEX IF NOT EXISTS idx_core_notif_ws     ON core_notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_notif_unread ON core_notifications(user_ref, is_read);

-- Hub Review Queue (surfaces AI suggestions from all modules for human approval)
CREATE TABLE IF NOT EXISTS core_review_queue (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  reviewer_ref    TEXT,                           -- 'CORE:<user_id>'
  source_module   TEXT NOT NULL,                  -- 'WV'|'QR'|'AL'|'AR'|'CM'|'PL'
  suggestion_ref  TEXT NOT NULL,                  -- typed ref to module's insight_suggestion
  entity_type     TEXT NOT NULL,
    -- 'node'|'edge'|'claim'|'evidence'|'cluster'|'map'|'diagram'|'other'
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'|'in_review'|'approved'|'edited'|'rejected'|'deferred'
  priority        INTEGER NOT NULL DEFAULT 3,     -- 1=critical, 5=low
  due_at          TEXT,
  resolved_at     TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_core_rq_ws       ON core_review_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_rq_status   ON core_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_core_rq_reviewer ON core_review_queue(reviewer_ref);
CREATE INDEX IF NOT EXISTS idx_core_rq_module   ON core_review_queue(source_module);
CREATE INDEX IF NOT EXISTS idx_core_rq_priority ON core_review_queue(priority);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 8  SRS REGISTRY (Cross-module SRS card ownership)
-- ─────────────────────────────────────────────────────────────────────────────

-- SRS registry: CORE tracks which user has an SRS card for which resource.
-- The actual card data (stability, difficulty, FSRS state) lives in AR.
CREATE TABLE IF NOT EXISTS core_srs_registry (
  id              TEXT PRIMARY KEY,               -- ULID
  user_ref        TEXT NOT NULL,                  -- 'CORE:<user_id>'
  workspace_id    TEXT,
  resource_ref    TEXT NOT NULL,                  -- typed ref to the item being learned
  resource_type   TEXT NOT NULL,
    -- 'vocabulary'|'grammar'|'root'|'lemma'|'ayah'|'concept'|'other'
  module          TEXT NOT NULL,                  -- 'AR'|'AL'|'QR'|'WV'|'other'
  card_ref        TEXT,                           -- 'AR:<srs_card_id>' once created
  enqueued_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_review_at  TEXT,
  next_review_at  TEXT,
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_ref, resource_ref)
);
CREATE INDEX IF NOT EXISTS idx_core_srs_user     ON core_srs_registry(user_ref);
CREATE INDEX IF NOT EXISTS idx_core_srs_next     ON core_srs_registry(next_review_at);
CREATE INDEX IF NOT EXISTS idx_core_srs_module   ON core_srs_registry(module);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 9  WORKSPACE PLANS (Linked plan metadata for workspace context)
-- ─────────────────────────────────────────────────────────────────────────────

-- core_workspace_plans: lightweight metadata linking a PL plan to workspace context
-- The plan data lives in km_planner; this is the workspace-level handle.
CREATE TABLE IF NOT EXISTS core_workspace_plans (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  pl_plan_ref     TEXT NOT NULL UNIQUE,           -- 'PL:<pl_plans.id>'
  title           TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'study',
    -- 'study'|'curriculum'|'class'|'personal'|'team'|'other'
  owner_user_ref  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'active'|'paused'|'completed'|'archived'
  visibility      TEXT NOT NULL DEFAULT 'workspace',
  started_at      TEXT,
  target_end_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_core_wpl_ws     ON core_workspace_plans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_wpl_owner  ON core_workspace_plans(owner_user_ref);
CREATE INDEX IF NOT EXISTS idx_core_wpl_status ON core_workspace_plans(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 10  AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────────

-- Immutable audit envelope for policy-sensitive operations
CREATE TABLE IF NOT EXISTS core_audit_log (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT,
  actor_user_ref  TEXT NOT NULL,
  action          TEXT NOT NULL,
    -- 'policy_changed'|'grant_issued'|'grant_revoked'|'member_removed'|
    -- 'visibility_changed'|'publication_state_changed'|'auth_token_issued'|
    -- 'auth_token_revoked'|'user_suspended'|'workspace_archived'|'other'
  resource_ref    TEXT,
  before_json     TEXT,                           -- snapshot before change
  after_json      TEXT,                           -- snapshot after change
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_core_al_actor    ON core_audit_log(actor_user_ref);
CREATE INDEX IF NOT EXISTS idx_core_al_ws       ON core_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_al_action   ON core_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_core_al_resource ON core_audit_log(resource_ref);
CREATE INDEX IF NOT EXISTS idx_core_al_at       ON core_audit_log(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 11  PLATFORM CONFIGURATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS core_feature_flags (
  id              TEXT PRIMARY KEY,
  flag_key        TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  is_enabled      INTEGER NOT NULL DEFAULT 0,
  rollout_percent INTEGER NOT NULL DEFAULT 0,     -- 0–100
  enabled_for     TEXT,                           -- JSON [user_ref or workspace_ref]
  description     TEXT,
  updated_by_ref  TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS core_platform_config (
  id              TEXT PRIMARY KEY,
  config_key      TEXT NOT NULL UNIQUE,
  config_value    TEXT NOT NULL,
  value_type      TEXT NOT NULL DEFAULT 'string',
    -- 'string'|'integer'|'boolean'|'json'
  description     TEXT,
  updated_by_ref  TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed core platform config defaults
INSERT OR IGNORE INTO core_platform_config (id, config_key, config_value, value_type, description) VALUES
  ('01CFG0000000000000000001', 'platform_name',           'K-Maps',          'string',  'Display name of the platform'),
  ('01CFG0000000000000000002', 'default_workspace_type',  'personal',        'string',  'Default workspace type on signup'),
  ('01CFG0000000000000000003', 'max_workspaces_per_user', '5',               'integer', 'Max workspaces a free user can own'),
  ('01CFG0000000000000000004', 'srs_algorithm',           'fsrs',            'string',  'Active SRS algorithm: fsrs|sm2'),
  ('01CFG0000000000000000005', 'public_registration',     'true',            'boolean', 'Whether public signup is open');
