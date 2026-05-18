import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { WorkspaceApiService } from '../../workspace-api.service';
import {
  WorkspaceActivity,
  WorkspaceDetail,
  WorkspaceMember,
} from '../../workspace.model';

type TabId = 'overview' | 'members' | 'documents' | 'activity';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'km-workspace-detail',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-detail.component.html',
  styleUrl: './workspace-detail.component.scss',
})
export class WorkspaceDetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkspaceApiService);

  readonly workspace = signal<WorkspaceDetail | null>(null);
  readonly members = signal<WorkspaceMember[]>([]);
  readonly activities = signal<WorkspaceActivity[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly membersLoading = signal(false);
  readonly activityLoading = signal(false);
  readonly activeTab = signal<TabId>('overview');

  /** Owner resolved to a display name — the owner is always a workspace member. */
  readonly ownerName = computed(() => {
    const ws = this.workspace();
    if (!ws?.owner) return '';
    return this.members().find((m) => m.id === ws.owner)?.name ?? ws.owner;
  });

  /** Up to two initials drawn from the workspace name for the hero avatar. */
  readonly initials = computed(() => {
    const name = this.workspace()?.name?.trim() ?? '';
    if (!name) return 'W';
    return (
      name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'W'
    );
  });

  readonly memberCount = computed(() => this.members().length);

  private workspaceId = '';

  readonly tabDefs: TabDef[] = [
    { id: 'overview', label: 'Overview', icon: 'information-circle-outline' },
    { id: 'members', label: 'Members', icon: 'people-outline' },
    { id: 'documents', label: 'Docs', icon: 'document-text-outline' },
    { id: 'activity', label: 'Activity', icon: 'pulse-outline' },
  ];

  ngOnInit(): void {
    this.workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.loadWorkspace();
  }

  async loadWorkspace(): Promise<void> {
    if (!this.workspaceId) {
      this.error.set('No workspace ID provided');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.workspace.set(await firstValueFrom(this.api.getWorkspace(this.workspaceId)));
      void this.loadMembers();
      void this.loadActivity();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load workspace');
    } finally {
      this.loading.set(false);
    }
  }

  async onRefresh(ev: CustomEvent): Promise<void> {
    await this.loadWorkspace();
    (ev.target as HTMLIonRefresherElement | null)?.complete();
  }

  private async loadMembers(): Promise<void> {
    this.membersLoading.set(true);
    try {
      this.members.set(await firstValueFrom(this.api.getMembers(this.workspaceId)));
    } catch {
      // Members load failure is silent; placeholder shown
    } finally {
      this.membersLoading.set(false);
    }
  }

  private async loadActivity(): Promise<void> {
    this.activityLoading.set(true);
    try {
      this.activities.set(await firstValueFrom(this.api.getActivity(this.workspaceId)));
    } catch {
      // Activity load failure is silent; placeholder shown
    } finally {
      this.activityLoading.set(false);
    }
  }

  onSegmentChange(ev: CustomEvent<{ value?: string | number }>): void {
    const value = ev.detail?.value;
    if (typeof value === 'string') {
      this.activeTab.set(value as TabId);
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/workspace');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /** Turns wire event keys like `workspace.member_added` into readable text. */
  formatAction(action: string): string {
    if (!action) return 'Activity';
    const text = action.replace(/[._]+/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
