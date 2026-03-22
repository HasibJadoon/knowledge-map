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
  template: `
    <div class="wd" #page>
      <!-- Ambient background -->
      <div class="wd__bg" aria-hidden="true">
        <div class="wd__bg-glow"></div>
      </div>

      <!-- Header -->
      <header class="wd__header" #header>
        <button class="wd__back" (click)="goBack()" aria-label="Back to workspaces">
          <span>←</span>
          <span>Workspaces</span>
        </button>

        <div class="wd__title-group">
          @if (loading()) {
            <div class="wd__skeleton-title"></div>
          } @else {
            <p class="wd__eyebrow">Workspace</p>
            <h1 class="wd__title">{{ workspace()?.name ?? 'Workspace' }}</h1>
            @if (workspace()?.status) {
              <span class="wd__status" [class]="'wd__status--' + workspace()!.status">
                {{ workspace()!.status }}
              </span>
            }
          }
        </div>

        <div class="wd__header-actions">
          @if (workspace()?.type) {
            <span class="wd__type-badge">{{ workspace()!.type }}</span>
          }
        </div>
      </header>

      <!-- Tabs -->
      <nav class="wd__tabs" #tabs>
        @for (tab of tabDefs; track tab.id) {
          <button
            class="wd__tab"
            [class.wd__tab--active]="activeTab() === tab.id"
            (click)="switchTab(tab.id)"
            [attr.aria-current]="activeTab() === tab.id ? 'page' : null"
          >
            <span class="wd__tab-icon">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        }
        <div class="wd__tab-indicator" #tabIndicator></div>
      </nav>

      <!-- Tab content -->
      <main class="wd__content" #content>

        <!-- Overview -->
        @if (activeTab() === 'overview') {
          <div class="wd__panel wd__panel--overview" #panel>
            @if (loading()) {
              <div class="wd__state">
                <div class="wd__spinner"></div>
                <p class="wd__state-text">Loading workspace…</p>
              </div>
            } @else if (error()) {
              <div class="wd__state wd__state--error">
                <span class="wd__state-icon">⚠</span>
                <p class="wd__state-text">{{ error() }}</p>
                <button class="wd__retry-btn" (click)="loadWorkspace()">Retry</button>
              </div>
            } @else if (workspace()) {
              <div class="wd__overview-grid">
                <div class="wd__info-card">
                  <h3 class="wd__info-card-title">Details</h3>
                  <div class="wd__info-rows">
                    <div class="wd__info-row">
                      <span class="wd__info-label">Name</span>
                      <span class="wd__info-value">{{ workspace()!.name }}</span>
                    </div>
                    @if (workspace()!.type) {
                      <div class="wd__info-row">
                        <span class="wd__info-label">Type</span>
                        <span class="wd__info-value">{{ workspace()!.type }}</span>
                      </div>
                    }
                    @if (workspace()!.status) {
                      <div class="wd__info-row">
                        <span class="wd__info-label">Status</span>
                        <span class="wd__info-value wd__info-status" [class]="'wd__info-status--' + workspace()!.status">
                          {{ workspace()!.status }}
                        </span>
                      </div>
                    }
                    @if (workspace()!.owner) {
                      <div class="wd__info-row">
                        <span class="wd__info-label">Owner</span>
                        <span class="wd__info-value">{{ workspace()!.owner }}</span>
                      </div>
                    }
                    @if (workspace()!.created_at) {
                      <div class="wd__info-row">
                        <span class="wd__info-label">Created</span>
                        <span class="wd__info-value">{{ formatDate(workspace()!.created_at!) }}</span>
                      </div>
                    }
                  </div>
                </div>
                @if (workspace()!.description) {
                  <div class="wd__info-card wd__info-card--full">
                    <h3 class="wd__info-card-title">Description</h3>
                    <p class="wd__description">{{ workspace()!.description }}</p>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Members -->
        @if (activeTab() === 'members') {
          <div class="wd__panel" #panel>
            @if (membersLoading()) {
              <div class="wd__state">
                <div class="wd__spinner"></div>
                <p class="wd__state-text">Loading members…</p>
              </div>
            } @else if (members().length === 0) {
              <div class="wd__state">
                <span class="wd__state-icon">◉</span>
                <p class="wd__state-title">No Members</p>
                <p class="wd__state-text">This workspace has no members yet.</p>
              </div>
            } @else {
              <div class="wd__members-list">
                @for (m of members(); track m.id) {
                  <div class="wd__member-row">
                    <div class="wd__member-avatar">
                      {{ (m.name || 'U').charAt(0).toUpperCase() }}
                    </div>
                    <div class="wd__member-info">
                      <span class="wd__member-name">{{ m.name }}</span>
                      @if (m.email) {
                        <span class="wd__member-email">{{ m.email }}</span>
                      }
                    </div>
                    @if (m.role) {
                      <span class="wd__member-role">{{ m.role }}</span>
                    }
                    @if (m.joined_at) {
                      <span class="wd__member-date">{{ formatDate(m.joined_at) }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Documents -->
        @if (activeTab() === 'documents') {
          <div class="wd__panel" #panel>
            <div class="wd__state wd__state--placeholder">
              <span class="wd__state-icon">◈</span>
              <p class="wd__state-title">Documents Coming Soon</p>
              <p class="wd__state-text">
                Document management and collaborative editing will be available in an upcoming release.
              </p>
            </div>
          </div>
        }

        <!-- Activity -->
        @if (activeTab() === 'activity') {
          <div class="wd__panel" #panel>
            @if (activityLoading()) {
              <div class="wd__state">
                <div class="wd__spinner"></div>
                <p class="wd__state-text">Loading activity…</p>
              </div>
            } @else if (activities().length === 0) {
              <div class="wd__state">
                <span class="wd__state-icon">◎</span>
                <p class="wd__state-title">No Activity Yet</p>
                <p class="wd__state-text">Activity for this workspace will appear here.</p>
              </div>
            } @else {
              <div class="wd__activity-list">
                @for (a of activities(); track a.id) {
                  <div class="wd__activity-row">
                    <div class="wd__activity-dot"></div>
                    <div class="wd__activity-line"></div>
                    <div class="wd__activity-body">
                      <span class="wd__activity-action">{{ a.action }}</span>
                      @if (a.actor) {
                        <span class="wd__activity-actor">by {{ a.actor }}</span>
                      }
                      @if (a.details) {
                        <p class="wd__activity-details">{{ a.details }}</p>
                      }
                      @if (a.created_at) {
                        <span class="wd__activity-date">{{ formatDate(a.created_at) }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

      </main>
    </div>
  `,
  styles: [`
    .wd {
      position: relative;
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      overflow: hidden;
      background: #080808;
    }

    .wd__bg {
      position: absolute; inset: 0; pointer-events: none; overflow: hidden;
    }
    .wd__bg-glow {
      position: absolute; top: -20%; left: 50%; transform: translateX(-50%);
      width: 600px; height: 400px;
      background: radial-gradient(ellipse at 50% 50%, rgba(58,26,110,.2) 0%, transparent 70%);
      pointer-events: none;
    }

    /* Header */
    .wd__header {
      position: relative; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.5rem 2rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0; gap: 1rem;
    }

    .wd__back {
      display: flex; align-items: center; gap: .5rem;
      background: transparent; border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; padding: .5rem 1rem;
      color: var(--km-text-2); font-size: .8rem; letter-spacing: .06em;
      cursor: pointer; transition: border-color .2s, color .2s; white-space: nowrap;
      font-family: var(--km-font-body);
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }

    .wd__title-group {
      flex: 1; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: .3rem;
    }

    .wd__skeleton-title {
      width: 200px; height: 2rem;
      background: linear-gradient(90deg, rgba(255,255,255,.05), rgba(255,255,255,.1), rgba(255,255,255,.05));
      background-size: 200% 100%;
      animation: wd-shimmer 1.5s infinite;
      border-radius: 8px;
    }
    @keyframes wd-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .wd__eyebrow {
      font-size: .65rem; font-weight: 600; letter-spacing: .22em;
      text-transform: uppercase; color: var(--km-gold); opacity: .6;
      font-family: var(--km-font-body);
    }

    .wd__title {
      font-family: var(--km-font-heading);
      font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 700; letter-spacing: .06em;
      background: linear-gradient(135deg, var(--km-gold-bright) 0%, var(--km-gold) 55%, #a07830 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      line-height: 1.1;
    }

    .wd__status {
      font-size: .6rem; font-weight: 700; letter-spacing: .15em;
      text-transform: uppercase; padding: .2rem .6rem; border-radius: 4px;
      font-family: var(--km-font-body);
    }
    .wd__status--active { background: rgba(26,110,58,.3); color: #4ade80; }
    .wd__status--completed { background: rgba(30,64,175,.3); color: #93c5fd; }
    .wd__status--paused { background: rgba(120,53,15,.3); color: #fcd34d; }

    .wd__header-actions { display: flex; align-items: center; gap: .8rem; }

    .wd__type-badge {
      font-size: .65rem; font-weight: 700; letter-spacing: .18em;
      text-transform: uppercase; color: var(--km-gold); opacity: .6;
      font-family: var(--km-font-body);
    }

    /* Tabs */
    .wd__tabs {
      position: relative; z-index: 10;
      display: flex; align-items: center; gap: .25rem;
      padding: 0 2rem;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
      overflow-x: auto; scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .wd__tab {
      display: flex; align-items: center; gap: .5rem;
      padding: .9rem 1.2rem;
      background: transparent; border: none;
      color: var(--km-text-3); font-size: .82rem; letter-spacing: .06em;
      cursor: pointer; white-space: nowrap; position: relative;
      transition: color .2s;
      font-family: var(--km-font-body);

      &::after {
        content: ''; position: absolute; bottom: 0; left: 0; right: 0;
        height: 2px; background: transparent;
        transition: background .2s;
      }

      &:hover { color: var(--km-text-2); }

      &.wd__tab--active {
        color: var(--km-gold);
        &::after {
          background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
        }
      }
    }

    .wd__tab-icon { font-size: .9rem; opacity: .7; }
    .wd__tab-indicator { display: none; }

    /* Content */
    .wd__content {
      flex: 1; overflow: hidden; position: relative;
    }

    .wd__panel {
      position: absolute; inset: 0;
      overflow-y: auto; padding: 2rem;
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,.3) transparent;
    }

    /* States */
    .wd__state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; min-height: 40vh; text-align: center;
    }

    .wd__state-icon {
      font-size: 2.5rem; opacity: .3;
      background: linear-gradient(135deg, var(--km-gold-bright), var(--km-gold));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    .wd__state-title {
      font-family: var(--km-font-heading); font-size: 1.1rem; font-weight: 600;
      color: var(--km-text-2); letter-spacing: .06em;
    }

    .wd__state-text { font-size: .85rem; color: var(--km-text-3); line-height: 1.6; max-width: 320px; }
    .wd__state--placeholder .wd__state-icon { opacity: .2; }

    .wd__spinner {
      width: 32px; height: 32px;
      border: 2px solid rgba(201,168,76,.15); border-top-color: var(--km-gold);
      border-radius: 50%; animation: wd-spin .8s linear infinite;
    }
    @keyframes wd-spin { to { transform: rotate(360deg); } }

    .wd__retry-btn {
      background: transparent; border: 1px solid rgba(255,255,255,.15);
      border-radius: 6px; padding: .4rem 1rem;
      color: var(--km-text-2); font-size: .8rem; cursor: pointer;
      transition: border-color .2s; font-family: var(--km-font-body);
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }

    /* Overview */
    .wd__overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.4rem; max-width: 900px; margin: 0 auto;
    }

    .wd__info-card {
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: var(--km-radius-lg, 14px);
      padding: 1.4rem;
    }
    .wd__info-card--full { grid-column: 1 / -1; }

    .wd__info-card-title {
      font-family: var(--km-font-heading);
      font-size: .75rem; font-weight: 700; letter-spacing: .16em;
      text-transform: uppercase; color: var(--km-gold); opacity: .7;
      margin-bottom: 1rem;
    }

    .wd__info-rows { display: flex; flex-direction: column; gap: .75rem; }

    .wd__info-row {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 1rem;
      padding-bottom: .75rem;
      border-bottom: 1px solid rgba(255,255,255,.05);
      &:last-child { border-bottom: none; padding-bottom: 0; }
    }

    .wd__info-label {
      font-size: .72rem; color: var(--km-text-3); letter-spacing: .08em;
      text-transform: uppercase; font-family: var(--km-font-body); flex-shrink: 0;
    }

    .wd__info-value {
      font-size: .9rem; color: var(--km-text); font-family: var(--km-font-body);
      text-align: right;
    }

    .wd__info-status {
      font-size: .65rem; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; padding: .2rem .5rem; border-radius: 4px;
    }
    .wd__info-status--active { background: rgba(26,110,58,.3); color: #4ade80; }
    .wd__info-status--completed { background: rgba(30,64,175,.3); color: #93c5fd; }
    .wd__info-status--paused { background: rgba(120,53,15,.3); color: #fcd34d; }

    .wd__description {
      font-size: .9rem; color: var(--km-text-2); line-height: 1.7;
      font-family: var(--km-font-body);
    }

    /* Members */
    .wd__members-list {
      display: flex; flex-direction: column; gap: .75rem;
      max-width: 700px; margin: 0 auto;
    }

    .wd__member-row {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px; padding: .9rem 1.2rem;
      transition: border-color .2s;
      &:hover { border-color: rgba(201,168,76,.2); }
    }

    .wd__member-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, rgba(58,26,110,.5), rgba(201,168,76,.2));
      border: 1px solid rgba(201,168,76,.3);
      display: flex; align-items: center; justify-content: center;
      font-size: .85rem; font-weight: 700; color: var(--km-gold);
      font-family: var(--km-font-body); flex-shrink: 0;
    }

    .wd__member-info {
      flex: 1; display: flex; flex-direction: column; gap: .2rem; min-width: 0;
    }

    .wd__member-name {
      font-size: .9rem; color: var(--km-text); font-weight: 500;
      font-family: var(--km-font-body);
    }

    .wd__member-email {
      font-size: .72rem; color: var(--km-text-3); font-family: var(--km-font-body);
    }

    .wd__member-role {
      font-size: .62rem; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: var(--km-gold); opacity: .7;
      font-family: var(--km-font-body); flex-shrink: 0;
    }

    .wd__member-date {
      font-size: .68rem; color: var(--km-text-3); font-family: var(--km-font-body); flex-shrink: 0;
    }

    /* Activity */
    .wd__activity-list {
      display: flex; flex-direction: column; gap: 0;
      max-width: 700px; margin: 0 auto;
    }

    .wd__activity-row {
      display: flex; gap: 1.2rem; padding-bottom: 1.2rem; position: relative;
    }

    .wd__activity-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--km-gold); opacity: .6;
      border: 2px solid rgba(201,168,76,.3);
      flex-shrink: 0; margin-top: .3rem; position: relative; z-index: 2;
    }

    .wd__activity-line {
      position: absolute; left: 4px; top: 16px; bottom: 0;
      width: 1px; background: rgba(255,255,255,.08); z-index: 1;
    }

    .wd__activity-body {
      flex: 1;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px; padding: .8rem 1rem;
      display: flex; flex-direction: column; gap: .3rem;
    }

    .wd__activity-action {
      font-size: .88rem; color: var(--km-text); font-weight: 500;
      font-family: var(--km-font-body);
    }

    .wd__activity-actor {
      font-size: .75rem; color: var(--km-gold); opacity: .7;
      font-family: var(--km-font-body);
    }

    .wd__activity-details {
      font-size: .78rem; color: var(--km-text-3); line-height: 1.5;
      font-family: var(--km-font-body);
    }

    .wd__activity-date {
      font-size: .68rem; color: var(--km-text-3); font-family: var(--km-font-body);
      margin-top: .1rem;
    }
  `],
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
      const res = await fetch(`/workspaces/${this.workspaceId}`);
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
      const res = await fetch(`/workspaces/${this.workspaceId}/members`);
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
      const res = await fetch(`/wv/activity?workspace_id=${this.workspaceId}`);
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
