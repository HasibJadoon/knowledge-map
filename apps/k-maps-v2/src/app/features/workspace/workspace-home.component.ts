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
import { Router } from '@angular/router';
import gsap from 'gsap';

interface Workspace {
  id: string;
  name: string;
  type: string;
  description: string;
  member_count?: number;
  created_at?: string;
  status?: string;
}

@Component({
  selector: 'km-workspace-home',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wh" #page>
      <!-- Ambient background -->
      <div class="wh__bg" aria-hidden="true">
        @for (p of particles; track p) {
          <span class="wh__particle" [style.--i]="p"></span>
        }
      </div>

      <!-- Header -->
      <header class="wh__header" #header>
        <button class="wh__back" (click)="goBack()" aria-label="Back to landing">
          <span class="wh__back-arrow">←</span>
          <span>Landing</span>
        </button>
        <div class="wh__title-group">
          <p class="wh__eyebrow">Collaborative Projects</p>
          <h1 class="wh__title">Workspace</h1>
          <div class="wh__rule"></div>
        </div>
        <button class="wh__new-btn" (click)="goToHub()" aria-label="Create new workspace">
          <span>＋ New Workspace</span>
        </button>
      </header>

      <!-- Main content -->
      <main class="wh__main" #main>
        @if (loading()) {
          <div class="wh__state">
            <div class="wh__spinner"></div>
            <p class="wh__state-text">Loading workspaces…</p>
          </div>
        }

        @if (!loading() && error()) {
          <div class="wh__state wh__state--error">
            <span class="wh__state-icon">⚠</span>
            <p class="wh__state-text">{{ error() }}</p>
            <button class="wh__retry-btn" (click)="load()">Retry</button>
          </div>
        }

        @if (!loading() && !error() && workspaces().length === 0) {
          <div class="wh__state wh__state--empty">
            <span class="wh__state-icon">⊞</span>
            <p class="wh__state-title">No Workspaces Yet</p>
            <p class="wh__state-text">Create your first workspace to start collaborating.</p>
            <button class="wh__new-btn wh__new-btn--lg" (click)="goToHub()">＋ New Workspace</button>
          </div>
        }

        @if (!loading() && !error() && workspaces().length > 0) {
          <div class="wh__grid" #grid>
            @for (ws of workspaces(); track ws.id) {
              <button
                class="wh__card"
                (click)="openWorkspace(ws.id)"
                [attr.aria-label]="'Open workspace ' + ws.name"
              >
                <div class="wh__card-top">
                  <span class="wh__card-type">{{ ws.type || 'general' }}</span>
                  @if (ws.status) {
                    <span class="wh__card-status" [class]="'wh__card-status--' + ws.status">
                      {{ ws.status }}
                    </span>
                  }
                </div>
                <div class="wh__card-glyph" aria-hidden="true">⊞</div>
                <div class="wh__card-body">
                  <h2 class="wh__card-name">{{ ws.name }}</h2>
                  @if (ws.description) {
                    <p class="wh__card-desc">{{ ws.description }}</p>
                  }
                </div>
                <div class="wh__card-footer">
                  @if (ws.member_count !== undefined) {
                    <span class="wh__card-meta">
                      <span class="wh__card-meta-icon">◉</span>
                      {{ ws.member_count }} {{ ws.member_count === 1 ? 'member' : 'members' }}
                    </span>
                  }
                  @if (ws.created_at) {
                    <span class="wh__card-meta">{{ formatDate(ws.created_at) }}</span>
                  }
                </div>
                <div class="wh__card-glow"></div>
              </button>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .wh {
      position: relative;
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      overflow: hidden;
      background: radial-gradient(ellipse 80% 60% at 50% 30%, #0a0a14 0%, #080808 60%, #000 100%);
    }

    /* Particles */
    .wh__bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .wh__particle {
      position: absolute; width: 2px; height: 2px; border-radius: 50%;
      background: var(--km-gold); opacity: 0;
      animation: wh-float calc(9s + var(--i, 0) * 1.2s) infinite linear;
      left: calc(var(--i, 0) * 8% + 4%); top: 100%;
      animation-delay: calc(var(--i, 0) * 0.5s);
    }
    @keyframes wh-float {
      0%   { transform: translateY(0) scale(1); opacity: 0; }
      10%  { opacity: .5; }
      80%  { opacity: .1; }
      100% { transform: translateY(-100vh) scale(.3); opacity: 0; }
    }

    /* Header */
    .wh__header {
      position: relative; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.5rem 2rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
    }

    .wh__back {
      display: flex; align-items: center; gap: .5rem;
      background: transparent; border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; padding: .5rem 1rem;
      color: var(--km-text-2); font-size: .8rem; letter-spacing: .06em;
      cursor: pointer; transition: border-color .2s, color .2s;
      font-family: var(--km-font-body);
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }
    .wh__back-arrow { font-size: 1rem; }

    .wh__title-group { text-align: center; }

    .wh__eyebrow {
      font-size: .68rem; font-weight: 600; letter-spacing: .22em;
      text-transform: uppercase; color: var(--km-gold); opacity: .7; margin-bottom: .3rem;
      font-family: var(--km-font-body);
    }

    .wh__title {
      font-family: var(--km-font-heading);
      font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; letter-spacing: .08em;
      background: linear-gradient(135deg, var(--km-gold-bright) 0%, var(--km-gold) 55%, #a07830 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      margin-bottom: .5rem; line-height: 1;
    }

    .wh__rule {
      width: 40px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
      margin: 0 auto;
    }

    .wh__new-btn {
      display: flex; align-items: center; gap: .4rem;
      background: linear-gradient(135deg, rgba(201,168,76,.15), rgba(201,168,76,.05));
      border: 1px solid var(--km-border-gold);
      border-radius: 8px; padding: .5rem 1.2rem;
      color: var(--km-gold); font-size: .82rem; letter-spacing: .06em;
      cursor: pointer; transition: background .2s, box-shadow .2s;
      font-family: var(--km-font-body);
      &:hover {
        background: linear-gradient(135deg, rgba(201,168,76,.25), rgba(201,168,76,.1));
        box-shadow: 0 0 20px rgba(201,168,76,.2);
      }
    }
    .wh__new-btn--lg { font-size: .9rem; padding: .7rem 1.8rem; margin-top: 1.2rem; }

    /* Main */
    .wh__main {
      flex: 1; overflow-y: auto; padding: 2rem;
      scrollbar-width: thin; scrollbar-color: rgba(201,168,76,.3) transparent;
    }

    /* States */
    .wh__state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; min-height: 50vh; text-align: center;
    }

    .wh__state-icon {
      font-size: 3rem; opacity: .3;
      background: linear-gradient(135deg, var(--km-gold-bright), var(--km-gold));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    .wh__state-title {
      font-family: var(--km-font-heading); font-size: 1.2rem; font-weight: 600;
      color: var(--km-text-2); letter-spacing: .06em;
    }

    .wh__state-text { font-size: .88rem; color: var(--km-text-3); line-height: 1.6; max-width: 320px; }

    .wh__state--error .wh__state-icon { opacity: .5; font-size: 2rem; }
    .wh__retry-btn {
      background: transparent; border: 1px solid rgba(255,255,255,.15);
      border-radius: 6px; padding: .4rem 1rem;
      color: var(--km-text-2); font-size: .8rem; cursor: pointer;
      transition: border-color .2s;
      font-family: var(--km-font-body);
      &:hover { border-color: var(--km-gold); color: var(--km-gold); }
    }

    /* Spinner */
    .wh__spinner {
      width: 36px; height: 36px;
      border: 2px solid rgba(201,168,76,.15);
      border-top-color: var(--km-gold);
      border-radius: 50%;
      animation: wh-spin .8s linear infinite;
    }
    @keyframes wh-spin { to { transform: rotate(360deg); } }

    /* Grid */
    .wh__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.4rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Cards */
    .wh__card {
      position: relative;
      display: flex; flex-direction: column;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: var(--km-radius-lg, 14px);
      padding: 1.4rem;
      cursor: pointer; text-align: left; overflow: hidden;
      transition: border-color .3s, box-shadow .3s, transform .3s;

      &:hover {
        border-color: var(--km-border-gold);
        box-shadow: 0 0 40px rgba(201,168,76,.15), 0 0 1px rgba(201,168,76,.3) inset;
        transform: translateY(-4px);
        .wh__card-glow { opacity: 1; }
        .wh__card-name { color: var(--km-gold-bright); }
        .wh__card-glyph { opacity: .6; }
      }

      &:active { transform: translateY(-2px); }
    }

    .wh__card-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: .8rem;
    }

    .wh__card-type {
      font-size: .6rem; font-weight: 700; letter-spacing: .2em;
      text-transform: uppercase; color: var(--km-gold); opacity: .7;
      font-family: var(--km-font-body);
    }

    .wh__card-status {
      font-size: .58rem; font-weight: 600; letter-spacing: .12em;
      text-transform: uppercase; padding: .2rem .5rem;
      border-radius: 4px; font-family: var(--km-font-body);
    }
    .wh__card-status--active { background: rgba(26,110,58,.3); color: #4ade80; }
    .wh__card-status--completed { background: rgba(30,64,175,.3); color: #93c5fd; }
    .wh__card-status--paused { background: rgba(120,53,15,.3); color: #fcd34d; }

    .wh__card-glyph {
      font-size: 2.2rem; opacity: .25; margin-bottom: .6rem;
      background: linear-gradient(180deg, #c9a84c 0%, #6b5520 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      transition: opacity .3s;
    }

    .wh__card-body { flex: 1; }

    .wh__card-name {
      font-family: var(--km-font-heading);
      font-size: 1.05rem; font-weight: 600; letter-spacing: .05em;
      color: var(--km-text); margin-bottom: .4rem;
      transition: color .3s;
    }

    .wh__card-desc {
      font-size: .78rem; color: var(--km-text-3);
      line-height: 1.55; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .wh__card-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 1rem; padding-top: .8rem;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    .wh__card-meta {
      display: flex; align-items: center; gap: .3rem;
      font-size: .68rem; color: var(--km-text-3); letter-spacing: .04em;
      font-family: var(--km-font-body);
    }

    .wh__card-meta-icon { color: var(--km-gold); opacity: .6; font-size: .7rem; }

    .wh__card-glow {
      position: absolute; bottom: 0; left: 10%; right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--km-gold), transparent);
      opacity: .3; transition: opacity .3s; border-radius: 1px;
    }
  `],
})
export class WorkspaceHomeComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;
  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;

  readonly workspaces = signal<Workspace[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly particles = Array.from({ length: 12 }, (_, i) => i);

  ngOnInit(): void {
    void this.load();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -24, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: 'power3.out', clearProps: 'filter' }
    );
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/workspaces?limit=20');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; workspaces: Workspace[] };
      this.workspaces.set(data.workspaces ?? []);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load workspaces');
    } finally {
      this.loading.set(false);
      // Stagger cards after data loads
      setTimeout(() => {
        const cards = document.querySelectorAll('.wh__card');
        if (cards.length > 0) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 32, scale: .95 },
            { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'power3.out', stagger: .08, clearProps: 'transform' }
          );
        }
      }, 0);
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/landing');
  }

  goToHub(): void {
    void this.router.navigateByUrl('/hub/workspace/workspaces');
  }

  openWorkspace(id: string): void {
    void this.router.navigate(['/workspace', id]);
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
