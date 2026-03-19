import { Injectable, inject, signal } from '@angular/core';
import { API_BASE } from '../api-base';
import { AuthService } from './AuthService';

export interface Workspace {
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

const STORAGE_KEY = 'active_workspace_id';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly auth = inject(AuthService);

  readonly workspaces = signal<Workspace[]>([]);
  readonly active = signal<Workspace | null>(null);
  readonly loading = signal(false);

  async load(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    this.loading.set(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        headers: this.auth.authHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; workspaces: Workspace[] };
      const list = data.workspaces ?? [];
      this.workspaces.set(list);
      this.restoreActive(list);
    } finally {
      this.loading.set(false);
    }
  }

  select(workspace: Workspace): void {
    this.active.set(workspace);
    localStorage.setItem(STORAGE_KEY, workspace.id);
  }

  private restoreActive(list: Workspace[]): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    const match = saved ? list.find((w) => w.id === saved) : null;
    this.active.set(match ?? list[0] ?? null);
  }
}
