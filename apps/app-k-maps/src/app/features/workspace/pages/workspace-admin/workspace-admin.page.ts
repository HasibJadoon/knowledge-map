import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkspaceApiService } from '../../workspace-api.service';
import { AdminUser, WorkspaceRole, WorkspaceSummary } from '../../workspace.model';

type AdminTab = 'users' | 'roles';

@Component({
  selector: 'app-workspace-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()" aria-label="Back">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Administration</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="tab()" (ionChange)="tab.set($any($event.detail.value))">
          <ion-segment-button value="users"><ion-label>Users</ion-label></ion-segment-button>
          <ion-segment-button value="roles"><ion-label>Roles</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (tab() === 'users') {
        <div class="wa-form">
          <ion-input fill="outline" label="Email" labelPlacement="stacked" type="email"
                     [(ngModel)]="newEmail" name="email"></ion-input>
          <ion-input fill="outline" label="Display name" labelPlacement="stacked"
                     [(ngModel)]="newName" name="name"></ion-input>
          <ion-select fill="outline" label="Role" labelPlacement="stacked" [(ngModel)]="newRole" name="role">
            <ion-select-option value="member">member</ion-select-option>
            <ion-select-option value="admin">admin</ion-select-option>
            <ion-select-option value="guest">guest</ion-select-option>
          </ion-select>
          <ion-input fill="outline" label="Password (optional)" labelPlacement="stacked" type="password"
                     [(ngModel)]="newPassword" name="pw"></ion-input>
          <ion-button expand="block" (click)="addUser()" [disabled]="creating()">Add User</ion-button>
        </div>

        @if (usersError()) { <ion-note color="danger">{{ usersError() }}</ion-note> }

        @if (usersLoading()) {
          <div class="wa-center"><ion-spinner name="dots"></ion-spinner></div>
        } @else {
          <ion-list>
            @for (u of users(); track u.id) {
              <ion-item-sliding>
                <ion-item>
                  <ion-label>
                    <h3>{{ u.display_name }}</h3>
                    <p>{{ u.email }}</p>
                  </ion-label>
                  <ion-select slot="end" interface="popover" [value]="u.role"
                              (ionChange)="changeRole(u, $any($event.detail.value))">
                    <ion-select-option value="member">member</ion-select-option>
                    <ion-select-option value="admin">admin</ion-select-option>
                    <ion-select-option value="guest">guest</ion-select-option>
                  </ion-select>
                  <ion-badge slot="end" [color]="u.status === 'active' ? 'success' : 'medium'">
                    {{ u.status }}
                  </ion-badge>
                </ion-item>
                <ion-item-options side="end">
                  <ion-item-option (click)="toggleStatus(u)">
                    {{ u.status === 'active' ? 'Suspend' : 'Activate' }}
                  </ion-item-option>
                  <ion-item-option color="tertiary" (click)="resetPassword(u)">Password</ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            }
            @if (users().length === 0) {
              <ion-item lines="none"><ion-label color="medium">No users yet.</ion-label></ion-item>
            }
          </ion-list>
        }
      }

      @if (tab() === 'roles') {
        <ion-select fill="outline" label="Workspace" labelPlacement="stacked" [value]="selectedWorkspace()"
                    (ionChange)="onWorkspaceChange($any($event.detail.value))">
          @for (w of workspaces(); track w.id) {
            <ion-select-option [value]="w.id">{{ w.name }}</ion-select-option>
          }
        </ion-select>

        @if (selectedWorkspace()) {
          <div class="wa-form">
            <ion-input fill="outline" label="Role key" labelPlacement="stacked"
                       [(ngModel)]="newRoleKey" name="rkey"></ion-input>
            <ion-input fill="outline" label="Role title" labelPlacement="stacked"
                       [(ngModel)]="newRoleTitle" name="rtitle"></ion-input>
            <ion-button expand="block" (click)="addRole()">Add Role</ion-button>
          </div>

          @if (rolesLoading()) {
            <div class="wa-center"><ion-spinner name="dots"></ion-spinner></div>
          } @else {
            <ion-list>
              @for (r of roles(); track r.id) {
                <ion-item>
                  <ion-label>
                    <h3>{{ r.title }}</h3>
                    <p>{{ r.role_key }}</p>
                  </ion-label>
                  @if (!r.is_system_role) {
                    <ion-button slot="end" fill="clear" color="danger" (click)="removeRole(r)">Delete</ion-button>
                  }
                </ion-item>
              }
              @if (roles().length === 0) {
                <ion-item lines="none"><ion-label color="medium">No roles defined.</ion-label></ion-item>
              }
            </ion-list>
          }
        } @else {
          <p class="wa-muted">Create a workspace first to manage its roles.</p>
        }
      }
    </ion-content>
  `,
  styles: [`
    .wa-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .wa-center { display: flex; justify-content: center; padding: 32px; }
    .wa-muted { color: var(--km-text-3, rgba(255,255,255,0.45)); text-align: center; padding: 24px; }
    ion-note { display: block; margin-bottom: 10px; }
  `],
})
export class WorkspaceAdminPage implements OnInit {
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
