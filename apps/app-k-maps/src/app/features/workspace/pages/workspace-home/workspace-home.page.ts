import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { WorkspaceApiService } from '../../workspace-api.service';
import { WorkspaceSummary } from '../../workspace.model';
import { isAdminToken } from '../../../../core/auth/auth.utils';

@Component({
  selector: 'app-workspace-home',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/workbench" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Workspaces</ion-title>
        <ion-buttons slot="end">
          @if (isAdmin()) {
            <ion-button (click)="goAdmin()" aria-label="Administration">
              <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
            </ion-button>
          }
          <ion-button (click)="newWorkspace()" aria-label="New workspace">
            <ion-icon slot="icon-only" name="add-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goHome()" aria-label="Home">
            <ion-icon slot="icon-only" name="home-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="ws-state"><ion-spinner name="dots"></ion-spinner></div>
      }

      @if (!loading() && error()) {
        <div class="ws-state">
          <p>{{ error() }}</p>
          <ion-button size="small" fill="outline" (click)="load()">Retry</ion-button>
        </div>
      }

      @if (!loading() && !error() && workspaces().length === 0) {
        <div class="ws-state">
          <span class="ws-glyph">◈</span>
          <p>No workspaces yet.</p>
          <ion-button size="small" (click)="newWorkspace()">Create workspace</ion-button>
        </div>
      }

      @if (!loading() && !error() && workspaces().length > 0) {
        <ion-list lines="full">
          @for (w of workspaces(); track w.id) {
            <ion-item button detail (click)="open(w.id)">
              <ion-label>
                <h2>{{ w.name || 'Untitled' }}</h2>
                <p>{{ w.type }} · {{ w.member_count }} {{ w.member_count === 1 ? 'member' : 'members' }}</p>
              </ion-label>
              @if (w.status !== 'active') {
                <ion-badge slot="end" color="medium">{{ w.status }}</ion-badge>
              }
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .ws-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 55vh;
      text-align: center;
      color: var(--km-text-3, rgba(255,255,255,0.45));
    }
    .ws-glyph { font-size: 2.6rem; opacity: 0.5; }
  `],
})
export class WorkspaceHomePage implements OnInit {
  private readonly api = inject(WorkspaceApiService);
  private readonly router = inject(Router);

  readonly workspaces = signal<WorkspaceSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isAdmin = signal(false);

  ngOnInit(): void {
    this.isAdmin.set(isAdminToken(localStorage.getItem('auth_token')));
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.workspaces.set(await firstValueFrom(this.api.listWorkspaces()));
    } catch {
      this.error.set('Could not load workspaces.');
    } finally {
      this.loading.set(false);
    }
  }

  open(id: string): void {
    void this.router.navigate(['/workspace', id]);
  }

  goHome(): void {
    void this.router.navigateByUrl('/home');
  }

  goAdmin(): void {
    void this.router.navigateByUrl('/workspace/admin');
  }

  async newWorkspace(): Promise<void> {
    const name = window.prompt('Workspace name')?.trim();
    if (!name) return;
    try {
      const ws = await firstValueFrom(this.api.createWorkspace(name));
      await this.load();
      void this.router.navigate(['/workspace', ws.id]);
    } catch {
      this.error.set('Could not create workspace.');
    }
  }
}
