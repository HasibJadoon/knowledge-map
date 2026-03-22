import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ArContainer {
  id: number | string;
  title: string;
  type?: string;
  level?: string;
  description?: string;
}

interface ArUnit {
  id: number | string;
  title: string;
  order?: number;
  description?: string;
}

@Component({
  selector: 'km-arabic-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="lib-page">
      <div class="lib-page__inner">

        <!-- Nav -->
        <nav class="lib-nav">
          <button class="back-btn" (click)="back()">&#8592; Arabic</button>
          <span class="lib-nav__crumb">Content Library</span>
        </nav>

        <div class="lib-layout">

          <!-- Sidebar -->
          <aside class="lib-sidebar">
            <div class="lib-sidebar__header">
              <h2 class="lib-sidebar__title">Containers</h2>
              <span class="lib-sidebar__count">{{ containers().length }}</span>
            </div>

            @if (loading()) {
              <div class="lib-sidebar__loading">
                @for (i of skeletons; track i) {
                  <div class="skeleton-row"></div>
                }
              </div>
            }

            @if (!loading() && containers().length === 0) {
              <div class="lib-sidebar__empty">
                <p>No containers found.</p>
                <p class="lib-sidebar__hint">Use Hub → Arabic → Content Library to add containers.</p>
              </div>
            }

            @if (!loading() && containers().length > 0) {
              <ul class="container-list">
                @for (c of containers(); track c.id) {
                  <li
                    class="container-item"
                    [class.container-item--active]="selected()?.id === c.id"
                    (click)="select(c)"
                  >
                    <div class="container-item__top">
                      <span class="container-item__title">{{ c.title }}</span>
                      @if (c.type) {
                        <span class="badge badge--type" [attr.data-type]="c.type">{{ c.type }}</span>
                      }
                    </div>
                    @if (c.level) {
                      <span class="badge badge--level">{{ c.level }}</span>
                    }
                  </li>
                }
              </ul>
            }
          </aside>

          <!-- Main panel -->
          <main class="lib-main">
            @if (!selected()) {
              <div class="lib-main__empty">
                <div class="lib-main__empty-icon">ك</div>
                <p class="lib-main__empty-title">Select a container</p>
                <p class="lib-main__empty-sub">Choose a book, podcast, or poetry collection from the sidebar to view its units.</p>
                <div class="lib-main__add-hint">
                  <span class="lib-main__add-icon">ℹ</span>
                  Use <strong>Hub → Arabic → Content Library</strong> to add new containers.
                </div>
              </div>
            }

            @if (selected()) {
              <div class="lib-main__content">
                <div class="lib-main__header">
                  <div>
                    <h1 class="lib-main__title">{{ selected()!.title }}</h1>
                    <div class="lib-main__badges">
                      @if (selected()!.type) {
                        <span class="badge badge--type" [attr.data-type]="selected()!.type">{{ selected()!.type }}</span>
                      }
                      @if (selected()!.level) {
                        <span class="badge badge--level">{{ selected()!.level }}</span>
                      }
                    </div>
                    @if (selected()!.description) {
                      <p class="lib-main__desc">{{ selected()!.description }}</p>
                    }
                  </div>
                </div>

                @if (unitsLoading()) {
                  <div class="units-loading">
                    @for (i of skeletons; track i) {
                      <div class="skeleton-unit"></div>
                    }
                  </div>
                }

                @if (!unitsLoading() && units().length === 0) {
                  <div class="units-empty">No units found for this container.</div>
                }

                @if (!unitsLoading() && units().length > 0) {
                  <ul class="units-list">
                    @for (u of units(); track u.id; let idx = $index) {
                      <li class="unit-item">
                        <span class="unit-item__num">{{ idx + 1 }}</span>
                        <div class="unit-item__body">
                          <span class="unit-item__title">{{ u.title }}</span>
                          @if (u.description) {
                            <span class="unit-item__desc">{{ u.description }}</span>
                          }
                        </div>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
          </main>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .lib-page {
      width: 100%;
      min-height: 100dvh;
      background: var(--km-bg);
      color: var(--km-text);
      font-family: var(--km-font-body);
      padding: 2rem 2rem 4rem;
    }
    .lib-page__inner {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Nav */
    .lib-nav {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .back-btn {
      background: transparent;
      border: 1px solid var(--km-border);
      border-radius: 6px;
      color: var(--km-text-2);
      font-family: var(--km-font-body);
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.45rem 0.9rem;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .back-btn:hover { border-color: var(--km-border-gold); color: var(--km-gold); }
    .lib-nav__crumb {
      font-family: var(--km-font-heading);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--km-gold);
      opacity: 0.7;
    }

    /* Layout */
    .lib-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 1.5rem;
      min-height: calc(100dvh - 8rem);
    }
    @media (max-width: 700px) {
      .lib-layout { grid-template-columns: 1fr; }
    }

    /* Sidebar */
    .lib-sidebar {
      background: rgba(255,255,255,0.025);
      border: 1px solid var(--km-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .lib-sidebar__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem 0.75rem;
      border-bottom: 1px solid var(--km-border);
    }
    .lib-sidebar__title {
      font-family: var(--km-font-heading);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--km-text-2);
      margin: 0;
    }
    .lib-sidebar__count {
      font-size: 0.75rem;
      color: var(--km-text-3);
      background: rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 0.15rem 0.6rem;
    }
    .lib-sidebar__empty {
      padding: 1.5rem 1.25rem;
      color: var(--km-text-3);
      font-size: 0.82rem;
      line-height: 1.6;
    }
    .lib-sidebar__hint {
      color: var(--km-text-3);
      opacity: 0.7;
      margin-top: 0.5rem;
      font-size: 0.78rem;
    }
    .lib-sidebar__loading {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .skeleton-row {
      height: 48px;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* Container list */
    .container-list {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0;
      overflow-y: auto;
      flex: 1;
    }
    .container-item {
      padding: 0.75rem 1.25rem;
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: background 0.15s, border-color 0.15s;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .container-item:hover {
      background: rgba(255,255,255,0.04);
    }
    .container-item--active {
      background: rgba(201,168,76,0.06);
      border-left-color: var(--km-gold);
    }
    .container-item__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .container-item__title {
      font-size: 0.85rem;
      color: var(--km-text);
      line-height: 1.4;
      flex: 1;
    }

    /* Badges */
    .badge {
      display: inline-block;
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 20px;
      white-space: nowrap;
    }
    .badge--type {
      background: rgba(201,168,76,0.12);
      color: var(--km-gold);
      border: 1px solid rgba(201,168,76,0.25);
    }
    .badge--level {
      background: rgba(255,255,255,0.06);
      color: var(--km-text-3);
      border: 1px solid var(--km-border);
    }

    /* Main panel */
    .lib-main {
      background: rgba(255,255,255,0.018);
      border: 1px solid var(--km-border);
      border-radius: 12px;
      overflow: hidden;
    }
    .lib-main__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 400px;
      gap: 0.75rem;
      padding: 3rem 2rem;
      text-align: center;
    }
    .lib-main__empty-icon {
      font-family: var(--km-font-arabic);
      font-size: 4rem;
      color: var(--km-gold);
      opacity: 0.25;
      direction: rtl;
    }
    .lib-main__empty-title {
      font-family: var(--km-font-heading);
      font-size: 1rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--km-text-2);
      margin: 0;
    }
    .lib-main__empty-sub {
      font-size: 0.82rem;
      color: var(--km-text-3);
      max-width: 320px;
      line-height: 1.6;
      margin: 0;
    }
    .lib-main__add-hint {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      background: rgba(201,168,76,0.06);
      border: 1px solid rgba(201,168,76,0.2);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: var(--km-text-2);
      max-width: 380px;
      margin-top: 0.5rem;
      text-align: left;
    }
    .lib-main__add-icon {
      color: var(--km-gold);
      font-size: 0.9rem;
      flex-shrink: 0;
      margin-top: 0.05rem;
    }
    .lib-main__content {
      padding: 2rem;
    }
    .lib-main__header {
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--km-border);
    }
    .lib-main__title {
      font-family: var(--km-font-heading);
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--km-gold-bright);
      margin: 0 0 0.6rem;
    }
    .lib-main__badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }
    .lib-main__desc {
      font-size: 0.85rem;
      color: var(--km-text-2);
      line-height: 1.6;
      margin: 0.75rem 0 0;
    }

    /* Units */
    .units-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .unit-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--km-border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      transition: border-color 0.2s, background 0.2s;
    }
    .unit-item:hover {
      border-color: var(--km-border-gold);
      background: rgba(201,168,76,0.03);
    }
    .unit-item__num {
      font-family: var(--km-font-heading);
      font-size: 0.75rem;
      color: var(--km-gold);
      opacity: 0.6;
      min-width: 1.5rem;
      padding-top: 0.1rem;
    }
    .unit-item__body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .unit-item__title {
      font-size: 0.9rem;
      color: var(--km-text);
      font-weight: 500;
    }
    .unit-item__desc {
      font-size: 0.78rem;
      color: var(--km-text-3);
      line-height: 1.5;
    }
    .units-loading {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .skeleton-unit {
      height: 64px;
      border-radius: 8px;
      background: rgba(255,255,255,0.04);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .units-empty {
      color: var(--km-text-3);
      font-size: 0.85rem;
      padding: 2rem 0;
      text-align: center;
    }
  `],
})
export class ArabicLibraryComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  containers = signal<ArContainer[]>([]);
  selected = signal<ArContainer | null>(null);
  units = signal<ArUnit[]>([]);
  loading = signal(true);
  unitsLoading = signal(false);

  skeletons = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.loadContainers();
  }

  private loadContainers(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.base}/ar/containers?limit=50`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.containers)) {
          this.containers.set(res.containers);
        }
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  select(c: ArContainer): void {
    this.selected.set(c);
    this.units.set([]);
    this.unitsLoading.set(true);
    this.http.get<any>(`${this.base}/ar/units?container_id=${c.id}`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.units)) {
          this.units.set(res.units);
        }
        this.unitsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.unitsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
