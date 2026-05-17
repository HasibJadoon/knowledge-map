import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkspaceApiService } from '../../workspace-api.service';
import {
  AdminUser,
  WorkspaceActivity,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from '../../workspace.model';

type AdminTab = 'users' | 'workspaces' | 'roles';
type PanelTab = 'settings' | 'members' | 'activity';

const MEMBERSHIP_ROLES = ['owner', 'admin', 'member', 'guest'];
const WORKSPACE_TYPES = ['personal', 'team', 'class', 'org'];

@Component({
  selector: 'app-workspace-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './workspace-admin.page.html',
  styleUrl: './workspace-admin.page.scss',
})
export class WorkspaceAdminPage implements OnInit {
  private readonly api = inject(WorkspaceApiService);
  private readonly router = inject(Router);

  readonly membershipRoles = MEMBERSHIP_ROLES;
  readonly workspaceTypes = WORKSPACE_TYPES;

  readonly tab = signal<AdminTab>('users');

  // ── Users ──────────────────────────────────────────────────────────────────
  readonly users = signal<AdminUser[]>([]);
  readonly usersLoading = signal(true);
  readonly usersError = signal<string | null>(null);
  readonly userSearch = signal('');
  readonly showUserForm = signal(false);
  readonly creatingUser = signal(false);
  newEmail = '';
  newName = '';
  newRole = 'member';
  newPassword = '';

  readonly filteredUsers = computed(() => {
    const q = this.userSearch().trim().toLowerCase();
    const all = this.users();
    if (!q) return all;
    return all.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  });

  // ── Workspaces ─────────────────────────────────────────────────────────────
  readonly workspaces = signal<WorkspaceSummary[]>([]);
  readonly wsLoading = signal(false);
  readonly wsError = signal<string | null>(null);
  readonly showWsForm = signal(false);
  newWsName = '';

  readonly selectedWs = signal<WorkspaceSummary | null>(null);
  readonly panelTab = signal<PanelTab>('settings');

  // settings draft
  editTitle = '';
  editType = 'team';
  editStatus = 'active';
  editDescription = '';
  readonly savingWs = signal(false);
  readonly settingsMsg = signal<string | null>(null);

  // members
  readonly members = signal<WorkspaceMember[]>([]);
  readonly membersLoading = signal(false);
  readonly panelRoles = signal<WorkspaceRole[]>([]);
  readonly expandedMember = signal<string | null>(null);
  readonly memberRoles = signal<WorkspaceRole[]>([]);
  readonly memberRolesLoading = signal(false);
  newMemberEmail = '';
  newMemberRole = 'member';
  readonly addingMember = signal(false);
  readonly membersMsg = signal<string | null>(null);

  // activity
  readonly activity = signal<WorkspaceActivity[]>([]);
  readonly activityLoading = signal(false);

  // ── Roles tab ──────────────────────────────────────────────────────────────
  readonly roleWorkspace = signal<string>('');
  readonly roles = signal<WorkspaceRole[]>([]);
  readonly rolesLoading = signal(false);
  readonly showRoleForm = signal(false);
  newRoleKey = '';
  newRoleTitle = '';
  readonly expandedRole = signal<string | null>(null);
  roleDraft = '';
  readonly roleDraftError = signal<string | null>(null);
  readonly savingRole = signal(false);

  ngOnInit(): void {
    void this.loadUsers();
    void this.loadWorkspaces();
  }

  goBack(): void {
    void this.router.navigateByUrl('/workspace');
  }

  switchTab(tab: AdminTab): void {
    this.tab.set(tab);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

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
    this.creatingUser.set(true);
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
      this.showUserForm.set(false);
      await this.loadUsers();
    } catch {
      this.usersError.set('Could not create the user.');
    } finally {
      this.creatingUser.set(false);
    }
  }

  async changeUserRole(user: AdminUser, role: string): Promise<void> {
    if (!role || role === user.role) return;
    try {
      await firstValueFrom(this.api.updateUser(user.id, { role }));
      await this.loadUsers();
    } catch {
      this.usersError.set('Could not update the user.');
    }
  }

  async toggleUserStatus(user: AdminUser): Promise<void> {
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
    if (!pw) return;
    if (pw.length < 6) {
      this.usersError.set('Password must be at least 6 characters.');
      return;
    }
    try {
      await firstValueFrom(this.api.setPassword(user.id, pw));
    } catch {
      this.usersError.set('Could not set the password.');
    }
  }

  userName(id: string): string {
    const u = this.users().find((x) => x.id === id);
    return u ? u.display_name : id.length > 14 ? `${id.slice(0, 14)}…` : id;
  }

  // ── Workspaces ─────────────────────────────────────────────────────────────

  async loadWorkspaces(): Promise<void> {
    this.wsLoading.set(true);
    this.wsError.set(null);
    try {
      this.workspaces.set(await firstValueFrom(this.api.listAllWorkspaces()));
    } catch {
      this.wsError.set('Could not load workspaces.');
    } finally {
      this.wsLoading.set(false);
    }
  }

  async createWorkspace(): Promise<void> {
    const name = this.newWsName.trim();
    if (!name) return;
    try {
      await firstValueFrom(this.api.createWorkspace(name));
      this.newWsName = '';
      this.showWsForm.set(false);
      await this.loadWorkspaces();
    } catch {
      this.wsError.set('Could not create the workspace.');
    }
  }

  selectWorkspace(ws: WorkspaceSummary): void {
    this.selectedWs.set(ws);
    this.panelTab.set('settings');
    this.settingsMsg.set(null);
    this.membersMsg.set(null);
    this.editTitle = ws.name;
    this.editType = ws.type || 'team';
    this.editStatus = ws.status || 'active';
    this.editDescription = ws.description || '';
    this.expandedMember.set(null);
    void this.loadMembers(ws.id);
    void this.loadPanelRoles(ws.id);
    void this.loadActivity(ws.id);
  }

  closeWorkspacePanel(): void {
    this.selectedWs.set(null);
  }

  setPanelTab(tab: PanelTab): void {
    this.panelTab.set(tab);
  }

  async saveWorkspace(): Promise<void> {
    const ws = this.selectedWs();
    if (!ws) return;
    const title = this.editTitle.trim();
    if (!title) {
      this.settingsMsg.set('Name is required.');
      return;
    }
    this.savingWs.set(true);
    this.settingsMsg.set(null);
    try {
      await firstValueFrom(
        this.api.updateWorkspace(ws.id, {
          title,
          workspace_type: this.editType,
          status: this.editStatus,
          description_md: this.editDescription.trim() || null,
        }),
      );
      this.settingsMsg.set('Saved.');
      await this.loadWorkspaces();
      const refreshed = this.workspaces().find((w) => w.id === ws.id);
      if (refreshed) this.selectedWs.set(refreshed);
    } catch {
      this.settingsMsg.set('Could not save changes.');
    } finally {
      this.savingWs.set(false);
    }
  }

  // ── Members ────────────────────────────────────────────────────────────────

  async loadMembers(workspaceId: string): Promise<void> {
    this.membersLoading.set(true);
    try {
      this.members.set(await firstValueFrom(this.api.getMembers(workspaceId)));
    } catch {
      this.members.set([]);
    } finally {
      this.membersLoading.set(false);
    }
  }

  async loadPanelRoles(workspaceId: string): Promise<void> {
    try {
      this.panelRoles.set(await firstValueFrom(this.api.listRoles(workspaceId)));
    } catch {
      this.panelRoles.set([]);
    }
  }

  async addMember(): Promise<void> {
    const ws = this.selectedWs();
    const email = this.newMemberEmail.trim();
    if (!ws || !email) return;
    this.addingMember.set(true);
    this.membersMsg.set(null);
    try {
      await firstValueFrom(
        this.api.addMember(ws.id, { email, membership_role: this.newMemberRole }),
      );
      this.newMemberEmail = '';
      this.newMemberRole = 'member';
      await this.loadMembers(ws.id);
    } catch (e) {
      this.membersMsg.set(this.errorText(e, 'Could not add the member.'));
    } finally {
      this.addingMember.set(false);
    }
  }

  async changeMemberRole(member: WorkspaceMember, role: string): Promise<void> {
    const ws = this.selectedWs();
    if (!ws || !role || role === member.role) return;
    try {
      await firstValueFrom(this.api.updateMember(ws.id, member.member_id, { membership_role: role }));
      await this.loadMembers(ws.id);
    } catch (e) {
      this.membersMsg.set(this.errorText(e, 'Could not update the member.'));
    }
  }

  async removeMember(member: WorkspaceMember): Promise<void> {
    const ws = this.selectedWs();
    if (!ws) return;
    if (!window.confirm(`Remove ${member.name} from this workspace?`)) return;
    try {
      await firstValueFrom(this.api.removeMember(ws.id, member.member_id));
      await this.loadMembers(ws.id);
    } catch (e) {
      this.membersMsg.set(this.errorText(e, 'Could not remove the member.'));
    }
  }

  async toggleMemberRoles(member: WorkspaceMember): Promise<void> {
    if (this.expandedMember() === member.member_id) {
      this.expandedMember.set(null);
      return;
    }
    this.expandedMember.set(member.member_id);
    const ws = this.selectedWs();
    if (!ws) return;
    this.memberRolesLoading.set(true);
    try {
      this.memberRoles.set(await firstValueFrom(this.api.getMemberRoles(ws.id, member.member_id)));
    } catch {
      this.memberRoles.set([]);
    } finally {
      this.memberRolesLoading.set(false);
    }
  }

  async assignRoleToMember(member: WorkspaceMember, roleId: string): Promise<void> {
    const ws = this.selectedWs();
    if (!ws || !roleId) return;
    try {
      await firstValueFrom(this.api.assignRole(ws.id, member.member_id, roleId));
      this.memberRoles.set(await firstValueFrom(this.api.getMemberRoles(ws.id, member.member_id)));
    } catch (e) {
      this.membersMsg.set(this.errorText(e, 'Could not assign the role.'));
    }
  }

  async revokeRoleFromMember(member: WorkspaceMember, role: WorkspaceRole): Promise<void> {
    const ws = this.selectedWs();
    if (!ws) return;
    try {
      await firstValueFrom(this.api.revokeRole(ws.id, member.member_id, role.id));
      this.memberRoles.set(await firstValueFrom(this.api.getMemberRoles(ws.id, member.member_id)));
    } catch (e) {
      this.membersMsg.set(this.errorText(e, 'Could not revoke the role.'));
    }
  }

  assignableRoles(): WorkspaceRole[] {
    const held = new Set(this.memberRoles().map((r) => r.id));
    return this.panelRoles().filter((r) => !held.has(r.id));
  }

  // ── Activity ───────────────────────────────────────────────────────────────

  async loadActivity(workspaceId: string): Promise<void> {
    this.activityLoading.set(true);
    try {
      this.activity.set(await firstValueFrom(this.api.getActivity(workspaceId)));
    } catch {
      this.activity.set([]);
    } finally {
      this.activityLoading.set(false);
    }
  }

  activityLabel(action: string): string {
    return action.replace(/[._]/g, ' ');
  }

  // ── Roles tab ──────────────────────────────────────────────────────────────

  onRoleWorkspaceChange(id: string): void {
    this.roleWorkspace.set(id);
    this.expandedRole.set(null);
    void this.loadRoles();
  }

  async loadRoles(): Promise<void> {
    const wid = this.roleWorkspace();
    if (!wid) {
      this.roles.set([]);
      return;
    }
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
    const wid = this.roleWorkspace();
    const key = this.newRoleKey.trim();
    const title = this.newRoleTitle.trim();
    if (!wid || !key || !title) return;
    try {
      await firstValueFrom(this.api.createRole(wid, { role_key: key, title }));
      this.newRoleKey = '';
      this.newRoleTitle = '';
      this.showRoleForm.set(false);
      await this.loadRoles();
    } catch {
      /* ignore */
    }
  }

  toggleRoleEditor(role: WorkspaceRole): void {
    if (this.expandedRole() === role.id) {
      this.expandedRole.set(null);
      return;
    }
    this.expandedRole.set(role.id);
    this.roleDraftError.set(null);
    this.roleDraft = this.prettyJson(role.permissions_json);
  }

  async saveRolePermissions(role: WorkspaceRole): Promise<void> {
    const wid = this.roleWorkspace();
    if (!wid) return;
    let normalized: string;
    try {
      normalized = JSON.stringify(JSON.parse(this.roleDraft || '{}'));
    } catch {
      this.roleDraftError.set('Permissions must be valid JSON.');
      return;
    }
    this.savingRole.set(true);
    this.roleDraftError.set(null);
    try {
      await firstValueFrom(this.api.updateRolePermissions(wid, role.id, normalized));
      this.expandedRole.set(null);
      await this.loadRoles();
    } catch {
      this.roleDraftError.set('Could not save permissions.');
    } finally {
      this.savingRole.set(false);
    }
  }

  async removeRole(role: WorkspaceRole): Promise<void> {
    const wid = this.roleWorkspace();
    if (!wid) return;
    if (!window.confirm(`Delete role "${role.title}"?`)) return;
    try {
      await firstValueFrom(this.api.deleteRole(wid, role.id));
      await this.loadRoles();
    } catch {
      /* ignore */
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  formatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private prettyJson(value: string): string {
    try {
      return JSON.stringify(JSON.parse(value || '{}'), null, 2);
    } catch {
      return value || '{}';
    }
  }

  private errorText(e: unknown, fallback: string): string {
    const err = e as { error?: { error?: { message?: string } } };
    return err?.error?.error?.message || fallback;
  }
}
