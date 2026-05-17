// ─── WorkspaceApiService — CORE workspace / user / role adapter ───────────────
// Single integration point for the workspace feature. Targets the CORE gateway
// routes (/api/core/...), unwraps the { ok, data } envelope, and maps the CORE
// wire shapes onto the UI-facing models.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AdminUser,
  NewUserInput,
  WorkspaceActivity,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from './workspace.model';

interface Envelope<T> { ok: boolean; data: T; }
interface Paged<T> { ok: boolean; data: T[]; meta?: { has_more?: boolean }; }

interface CoreWorkspace {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  workspace_type: string;
  owner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

interface CoreMember {
  id: string;
  user_id: string;
  membership_role: string;
  status: string;
  joined_at: string | null;
  display_name: string | null;
  email: string | null;
}

interface CoreUser {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  role: string;
  status: string;
  created_at: string;
}

interface CoreRole {
  id: string;
  workspace_id: string;
  role_key: string;
  title: string;
  permissions_json: string;
  is_system_role: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  // ── Workspaces ──────────────────────────────────────────────────────────────

  listWorkspaces(): Observable<WorkspaceSummary[]> {
    return this.http
      .get<Paged<CoreWorkspace>>(`${this.base}/core/workspaces/mine?per_page=100`)
      .pipe(map((res) => (res.data ?? []).map(toSummary)));
  }

  getWorkspace(id: string): Observable<WorkspaceDetail> {
    return this.http
      .get<Envelope<CoreWorkspace>>(`${this.base}/core/workspaces/${id}`)
      .pipe(map((res) => toDetail(res.data)));
  }

  getMembers(id: string): Observable<WorkspaceMember[]> {
    return this.http
      .get<Envelope<CoreMember[]>>(`${this.base}/core/workspaces/${id}/members`)
      .pipe(map((res) => (res.data ?? []).map(toMember)));
  }

  createWorkspace(title: string): Observable<WorkspaceDetail> {
    return this.http
      .post<Envelope<CoreWorkspace>>(`${this.base}/core/workspaces`, { title })
      .pipe(map((res) => toDetail(res.data)));
  }

  /** Activity lives outside CORE; degrade to empty if the endpoint is absent. */
  getActivity(id: string): Observable<WorkspaceActivity[]> {
    return this.http
      .get<{ data?: WorkspaceActivity[]; activity?: WorkspaceActivity[] }>(
        `${this.base}/wv/activity?workspace_id=${id}`,
      )
      .pipe(
        map((res) => res.activity ?? res.data ?? []),
        catchError(() => of([])),
      );
  }

  // ── Users (admin) ───────────────────────────────────────────────────────────

  listUsers(): Observable<AdminUser[]> {
    return this.http
      .get<Paged<CoreUser>>(`${this.base}/core/users?per_page=100`)
      .pipe(map((res) => (res.data ?? []).map(toUser)));
  }

  createUser(input: NewUserInput): Observable<AdminUser> {
    return this.http
      .post<Envelope<CoreUser>>(`${this.base}/core/users`, input)
      .pipe(map((res) => toUser(res.data)));
  }

  updateUser(id: string, patch: { role?: string; status?: string; display_name?: string }): Observable<AdminUser> {
    return this.http
      .patch<Envelope<CoreUser>>(`${this.base}/core/users/${id}`, patch)
      .pipe(map((res) => toUser(res.data)));
  }

  setPassword(id: string, password: string): Observable<void> {
    return this.http
      .post<Envelope<unknown>>(`${this.base}/core/users/${id}/password`, { password })
      .pipe(map(() => undefined));
  }

  // ── Roles ───────────────────────────────────────────────────────────────────

  listRoles(workspaceId: string): Observable<WorkspaceRole[]> {
    return this.http
      .get<Envelope<CoreRole[]>>(`${this.base}/core/workspaces/${workspaceId}/roles`)
      .pipe(map((res) => (res.data ?? []).map(toRole)));
  }

  createRole(workspaceId: string, input: { role_key: string; title: string }): Observable<WorkspaceRole> {
    return this.http
      .post<Envelope<CoreRole>>(`${this.base}/core/workspaces/${workspaceId}/roles`, input)
      .pipe(map((res) => toRole(res.data)));
  }

  deleteRole(workspaceId: string, roleId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/core/workspaces/${workspaceId}/roles/${roleId}`)
      .pipe(map(() => undefined));
  }
}

// ── Adapters ──────────────────────────────────────────────────────────────────

function toSummary(w: CoreWorkspace): WorkspaceSummary {
  return {
    id: w.id,
    name: w.title ?? '',
    type: w.workspace_type ?? 'workspace',
    description: w.description_md ?? '',
    member_count: w.member_count ?? 0,
    created_at: w.created_at ?? '',
    status: w.status ?? 'active',
  };
}

function toDetail(w: CoreWorkspace): WorkspaceDetail {
  return {
    id: w.id,
    name: w.title ?? '',
    description: w.description_md ?? '',
    type: w.workspace_type ?? 'workspace',
    status: w.status ?? 'active',
    created_at: w.created_at ?? '',
    updated_at: w.updated_at ?? '',
    owner: w.owner_id ?? '',
  };
}

function toMember(m: CoreMember): WorkspaceMember {
  return {
    id: m.user_id,
    name: m.display_name ?? m.user_id,
    role: m.membership_role ?? 'member',
    email: m.email ?? '',
    joined_at: m.joined_at ?? '',
  };
}

function toUser(u: CoreUser): AdminUser {
  return {
    id: u.id,
    email: u.email ?? '',
    display_name: u.display_name ?? '',
    username: u.username ?? '',
    role: u.role ?? 'member',
    status: u.status ?? 'active',
    created_at: u.created_at ?? '',
  };
}

function toRole(r: CoreRole): WorkspaceRole {
  return {
    id: r.id,
    workspace_id: r.workspace_id,
    role_key: r.role_key,
    title: r.title,
    permissions_json: r.permissions_json ?? '{}',
    is_system_role: !!r.is_system_role,
    created_at: r.created_at ?? '',
  };
}
