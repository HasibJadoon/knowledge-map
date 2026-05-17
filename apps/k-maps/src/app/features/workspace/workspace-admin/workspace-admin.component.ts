import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkspaceApiService } from '../workspace-api.service';
import { AdminUser, WorkspaceRole, WorkspaceSummary } from '../workspace.model';

type AdminTab = 'users' | 'roles';

@Component({
  selector: 'km-workspace-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wa">
      <header class="wa__header">
        <button class="wa__back" (click)="goBack()">← Workspace</button>
        <h1 class="wa__title">Administration</h1>
      </header>

      <nav class="wa__tabs">
        <button class="wa__tab" [class.wa__tab--on]="tab() === 'users'" (click)="tab.set('users')">Users</button>
        <button class="wa__tab" [class.wa__tab--on]="tab() === 'roles'" (click)="tab.set('roles')">Workspace Roles</button>
      </nav>

      @if (tab() === 'users') {
        <section class="wa__panel">
          <form class="wa__form" (ngSubmit)="addUser()">
            <input class="wa__in" placeholder="Email" type="email" [(ngModel)]="newEmail" name="email" />
            <input class="wa__in" placeholder="Display name" [(ngModel)]="newName" name="name" />
            <select class="wa__in" [(ngModel)]="newRole" name="role">
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="guest">guest</option>
            </select>
            <input class="wa__in" placeholder="Password (optional)" type="password" [(ngModel)]="newPassword" name="password" />
            <button class="wa__btn" type="submit" [disabled]="creating()">Add User</button>
          </form>

          @if (usersError()) { <p class="wa__error">{{ usersError() }}</p> }

          @if (usersLoading()) {
            <p class="wa__muted">Loading users…</p>
          } @else {
            <table class="wa__table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>{{ u.display_name }}</td>
                    <td class="wa__dim">{{ u.email }}</td>
                    <td>
                      <select [value]="u.role" (change)="changeRole(u, $any($event.target).value)">
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                        <option value="guest">guest</option>
                      </select>
                    </td>
                    <td>
                      <button class="wa__chip" [class.wa__chip--off]="u.status !== 'active'"
                              (click)="toggleStatus(u)">{{ u.status }}</button>
                    </td>
                    <td><button class="wa__link" (click)="resetPassword(u)">Set password</button></td>
                  </tr>
                }
                @if (users().length === 0) {
                  <tr><td colspan="5" class="wa__muted">No users yet.</td></tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      @if (tab() === 'roles') {
        <section class="wa__panel">
          <div class="wa__row">
            <label class="wa__dim">Workspace</label>
            <select class="wa__in" [value]="selectedWorkspace()"
                    (change)="onWorkspaceChange($any($event.target).value)">
              @for (w of workspaces(); track w.id) {
                <option [value]="w.id">{{ w.name }}</option>
              }
            </select>
          </div>

          @if (selectedWorkspace()) {
            <form class="wa__form" (ngSubmit)="addRole()">
              <input class="wa__in" placeholder="Role key (e.g. editor)" [(ngModel)]="newRoleKey" name="rkey" />
              <input class="wa__in" placeholder="Role title" [(ngModel)]="newRoleTitle" name="rtitle" />
              <button class="wa__btn" type="submit">Add Role</button>
            </form>

            @if (rolesLoading()) {
              <p class="wa__muted">Loading roles…</p>
            } @else {
              <table class="wa__table">
                <thead><tr><th>Key</th><th>Title</th><th>System</th><th></th></tr></thead>
                <tbody>
                  @for (r of roles(); track r.id) {
                    <tr>
                      <td>{{ r.role_key }}</td>
                      <td>{{ r.title }}</td>
                      <td class="wa__dim">{{ r.is_system_role ? 'yes' : '—' }}</td>
                      <td>
                        @if (!r.is_system_role) {
                          <button class="wa__link" (click)="removeRole(r)">Delete</button>
                        }
                      </td>
                    </tr>
                  }
                  @if (roles().length === 0) {
                    <tr><td colspan="4" class="wa__muted">No roles defined.</td></tr>
                  }
                </tbody>
              </table>
            }
          } @else {
            <p class="wa__muted">Create a workspace first to manage its roles.</p>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .wa { padding: 24px; max-width: 880px; margin: 0 auto; color: var(--km-text, #e8e8e8); }
    .wa__header { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
    .wa__back {
      background: transparent; border: 1px solid var(--km-border, #333); color: var(--km-text-2, #bbb);
      border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: .82rem;
    }
    .wa__title { font-size: 1.3rem; font-weight: 700; margin: 0; }
    .wa__tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--km-border, #333); margin-bottom: 18px; }
    .wa__tab {
      background: transparent; border: none; color: var(--km-text-3, #888);
      padding: 8px 14px; cursor: pointer; font-size: .85rem; font-weight: 600;
      border-bottom: 2px solid transparent;
    }
    .wa__tab--on { color: var(--km-gold, #c9a84c); border-bottom-color: var(--km-gold, #c9a84c); }
    .wa__panel { display: flex; flex-direction: column; gap: 14px; }
    .wa__form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .wa__row { display: flex; align-items: center; gap: 10px; }
    .wa__in {
      background: var(--km-surface-2, #1a1a1a); border: 1px solid var(--km-border, #333);
      color: var(--km-text, #e8e8e8); border-radius: 6px; padding: 7px 10px; font-size: .84rem;
    }
    .wa__btn {
      background: var(--km-gold, #c9a84c); color: #000; border: none; border-radius: 6px;
      padding: 7px 14px; font-weight: 700; cursor: pointer; font-size: .82rem;
    }
    .wa__btn:disabled { opacity: .5; cursor: default; }
    .wa__table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    .wa__table th {
      text-align: left; color: var(--km-text-3, #888); font-size: .7rem; text-transform: uppercase;
      letter-spacing: .06em; padding: 6px 8px; border-bottom: 1px solid var(--km-border, #333);
    }
    .wa__table td { padding: 8px; border-bottom: 1px solid var(--km-border, #2a2a2a); }
    .wa__table select {
      background: var(--km-surface-2, #1a1a1a); border: 1px solid var(--km-border, #333);
      color: var(--km-text, #e8e8e8); border-radius: 5px; padding: 4px 6px; font-size: .8rem;
    }
    .wa__dim, .wa__muted { color: var(--km-text-3, #888); }
    .wa__muted { font-size: .85rem; padding: 8px; }
    .wa__chip {
      background: rgba(80,180,120,.15); color: #6fcf97; border: none; border-radius: 12px;
      padding: 3px 10px; font-size: .72rem; cursor: pointer;
    }
    .wa__chip--off { background: rgba(200,90,90,.15); color: #e08585; }
    .wa__link { background: none; border: none; color: var(--km-gold, #c9a84c); cursor: pointer; font-size: .8rem; }
    .wa__error { color: #e08585; font-size: .82rem; }
  `],
})
export class WorkspaceAdminComponent implements OnInit {
  private readonly api = inject(WorkspaceApiService);
  private readonly router = inject(Router);

  readonly tab = signal<AdminTab>('users');

  // ── Users ──
  readonly users = signal<AdminUser[]>([]);
  readonly usersLoading = signal(true);
  readonly usersError = signal<string | null>(null);
  readonly creating = signal(false);
  newEmail = '';
  newName = '';
  newRole = 'member';
  newPassword = '';

  // ── Roles ──
  readonly workspaces = signal<WorkspaceSummary[]>([]);
  readonly selectedWorkspace = signal<string>('');
  readonly roles = signal<WorkspaceRole[]>([]);
  readonly rolesLoading = signal(false);
  newRoleKey = '';
  newRoleTitle = '';

  ngOnInit(): void {
    void this.loadUsers();
    void this.loadWorkspaces();
  }

  goBack(): void {
    void this.router.navigateByUrl('/workspace');
  }

  async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set(null);
    try {
      this.users.set(await firstValueFrom(this.api.listUsers()));
    } catch {
      this.usersError.set('Could not load users — an admin account is required.');
    } finally {
      this.usersLoading.set(false);
    }
  }

  async addUser(): Promise<void> {
    const email = this.newEmail.trim();
    const name = this.newName.trim();
    if (!email || !name) return;
    this.creating.set(true);
    this.usersError.set(null);
    try {
      await firstValueFrom(
        this.api.createUser({
          email,
          display_name: name,
          role: this.newRole,
          password: this.newPassword.trim() || undefined,
        }),
      );
      this.newEmail = '';
      this.newName = '';
      this.newRole = 'member';
      this.newPassword = '';
      await this.loadUsers();
    } catch {
      this.usersError.set('Could not create the user.');
    } finally {
      this.creating.set(false);
    }
  }

  async changeRole(user: AdminUser, role: string): Promise<void> {
    if (!role || role === user.role) return;
    try {
      await firstValueFrom(this.api.updateUser(user.id, { role }));
      await this.loadUsers();
    } catch {
      this.usersError.set('Could not update the user.');
    }
  }

  async toggleStatus(user: AdminUser): Promise<void> {
    const status = user.status === 'active' ? 'suspended' : 'active';
    try {
      await firstValueFrom(this.api.updateUser(user.id, { status }));
      await this.loadUsers();
    } catch {
      this.usersError.set('Could not update the user.');
    }
  }

  async resetPassword(user: AdminUser): Promise<void> {
    const pw = window.prompt(`New password for ${user.display_name} (min 6 chars)`)?.trim();
    if (!pw || pw.length < 6) return;
    try {
      await firstValueFrom(this.api.setPassword(user.id, pw));
    } catch {
      this.usersError.set('Could not set the password.');
    }
  }

  async loadWorkspaces(): Promise<void> {
    try {
      const ws = await firstValueFrom(this.api.listWorkspaces());
      this.workspaces.set(ws);
      if (ws.length > 0 && !this.selectedWorkspace()) {
        this.selectedWorkspace.set(ws[0].id);
        void this.loadRoles();
      }
    } catch {
      /* roles tab simply stays empty */
    }
  }

  onWorkspaceChange(id: string): void {
    this.selectedWorkspace.set(id);
    void this.loadRoles();
  }

  async loadRoles(): Promise<void> {
    const wid = this.selectedWorkspace();
    if (!wid) return;
    this.rolesLoading.set(true);
    try {
      this.roles.set(await firstValueFrom(this.api.listRoles(wid)));
    } catch {
      this.roles.set([]);
    } finally {
      this.rolesLoading.set(false);
    }
  }

  async addRole(): Promise<void> {
    const wid = this.selectedWorkspace();
    const key = this.newRoleKey.trim();
    const title = this.newRoleTitle.trim();
    if (!wid || !key || !title) return;
    try {
      await firstValueFrom(this.api.createRole(wid, { role_key: key, title }));
      this.newRoleKey = '';
      this.newRoleTitle = '';
      await this.loadRoles();
    } catch {
      /* ignore */
    }
  }

  async removeRole(role: WorkspaceRole): Promise<void> {
    const wid = this.selectedWorkspace();
    if (!wid) return;
    try {
      await firstValueFrom(this.api.deleteRole(wid, role.id));
      await this.loadRoles();
    } catch {
      /* ignore */
    }
  }
}
