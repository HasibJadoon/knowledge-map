import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';

type TabId = 'overview' | 'members' | 'documents' | 'activity';

interface WorkspaceDetail {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  owner?: string;
}

interface Member {
  id: string;
  name: string;
  role?: string;
  email?: string;
  joined_at?: string;
}

interface Activity {
  id: string;
  action: string;
  actor?: string;
  created_at?: string;
  details?: string;
}

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'km-workspace-detail',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-detail.component.html',
  styleUrl: './workspace-detail.component.scss',
})
export class WorkspaceDetailComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('tabs') tabsRef!: ElementRef<HTMLElement>;

  readonly workspace = signal<WorkspaceDetail | null>(null);
  readonly members = signal<Member[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly membersLoading = signal(false);
  readonly activityLoading = signal(false);
  readonly activeTab = signal<TabId>('overview');

  private workspaceId = '';

  readonly tabDefs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: '◎' },
    { id: 'members', label: 'Members', icon: '◉' },
    { id: 'documents', label: 'Documents', icon: '◈' },
    { id: 'activity', label: 'Activity', icon: '◆' },
  ];

  ngOnInit(): void {
    this.workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.loadWorkspace();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -20, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: .8, ease: 'power3.out', clearProps: 'filter' }
    );
    gsap.fromTo(
      this.tabsRef.nativeElement,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: .6, ease: 'power3.out', delay: .3 }
    );
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
      const res = await fetch(`${environment.apiBase}/workspaces/${this.workspaceId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; workspace: WorkspaceDetail };
      this.workspace.set(data.workspace ?? null);
      // Also try to load members in background
      void this.loadMembers();
      void this.loadActivity();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load workspace');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMembers(): Promise<void> {
    this.membersLoading.set(true);
    try {
      const res = await fetch(`${environment.apiBase}/workspaces/${this.workspaceId}/members`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; members: Member[] };
      this.members.set(data.members ?? []);
    } catch {
      // Members load failure is silent; placeholder shown
    } finally {
      this.membersLoading.set(false);
    }
  }

  private async loadActivity(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/wv/activity?workspace_id=${this.workspaceId}`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; activity: Activity[] };
      this.activities.set(data.activity ?? []);
    } catch {
      // Activity load failure is silent; placeholder shown
    }
  }

  switchTab(tab: TabId): void {
    const panel = document.querySelector('.wd__panel');
    if (panel) {
      gsap.fromTo(panel, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .35, ease: 'power2.out' });
    }
    this.activeTab.set(tab);
    // Animate new panel in after change detection
    setTimeout(() => {
      const newPanel = document.querySelector('.wd__panel');
      if (newPanel) {
        gsap.fromTo(newPanel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .38, ease: 'power3.out' });
      }
    }, 0);
  }

  goBack(): void {
    void this.router.navigateByUrl('/workspace');
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
