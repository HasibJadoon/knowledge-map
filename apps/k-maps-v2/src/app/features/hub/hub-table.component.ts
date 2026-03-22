import {
  Component, ChangeDetectionStrategy, OnInit,
  inject, signal, computed
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HubPanelComponent } from './hub-panel.component';
import { HubPanelService } from './hub-panel.service';
import { HubCard } from './models/hub.models';

@Component({
  selector: 'km-hub-table',
  standalone: true,
  imports: [CommonModule, HubPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ht">
      <!-- Toolbar -->
      <div class="ht__toolbar">
        <button class="ht__back" (click)="goBack()">← {{ sectionLabel() }}</button>

        <div class="ht__toolbar-center">
          <span class="ht__card-glyph">{{ card()?.glyph }}</span>
          <div>
            <p class="ht__eyebrow">{{ card()?.tag }}</p>
            <h1 class="ht__title">{{ card()?.title }}</h1>
          </div>
        </div>

        <div class="ht__toolbar-right">
          <div class="ht__search-wrap">
            <input class="ht__search" placeholder="Search…" (input)="onSearch($event)" />
            <span class="ht__search-icon">⌕</span>
          </div>
          <button class="ht__add-btn" (click)="openAdd()">
            <span>+</span> Add
          </button>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="ht__stats">
        <span class="ht__stat">
          <span class="ht__stat-num">{{ totalCount() }}</span>
          <span class="ht__stat-label">Total Records</span>
        </span>
        <span class="ht__stat-dot">·</span>
        <span class="ht__stat">
          <span class="ht__stat-num">{{ rows().length }}</span>
          <span class="ht__stat-label">Showing</span>
        </span>
        <span class="ht__stat-dot">·</span>
        <span class="ht__stat">
          <span class="ht__stat-label">Table:</span>
          <code class="ht__stat-code">{{ card()?.table }}</code>
        </span>
      </div>

      <!-- Table -->
      <div class="ht__table-wrap">
        @if (loading()) {
          <div class="ht__loading">
            @for (i of skeletons; track i) {
              <div class="ht__skeleton"></div>
            }
          </div>
        } @else if (rows().length === 0) {
          <div class="ht__empty">
            <span class="ht__empty-glyph">{{ card()?.glyph ?? '○' }}</span>
            <p>No records yet.</p>
            <button class="ht__add-btn" (click)="openAdd()">+ Add first record</button>
          </div>
        } @else {
          <table class="ht__table">
            <thead>
              <tr>
                @for (col of columns(); track col) {
                  <th>{{ col | uppercase }}</th>
                }
                <th class="ht__th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row['id']) {
                <tr class="ht__row" (click)="openEdit(row)">
                  @for (col of columns(); track col) {
                    <td>{{ formatCell(row[col]) }}</td>
                  }
                  <td class="ht__td-actions" (click)="$event.stopPropagation()">
                    <button class="ht__action-btn" (click)="openEdit(row)" title="Edit">✎</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (hasMore()) {
            <button class="ht__load-more" (click)="loadMore()">Load more</button>
          }
        }
      </div>
    </div>

    <km-hub-panel />
  `,
  styles: [`
    .ht {
      width: 100%; height: 100%; display: flex; flex-direction: column;
      background: var(--km-bg); overflow: hidden;
    }

    /* Toolbar */
    .ht__toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,.06);
      gap: 1rem; flex-shrink: 0;
    }

    .ht__back {
      background: rgba(255,255,255,.04); border: 1px solid var(--km-border);
      border-radius: 8px; color: var(--km-text-2); padding: .45rem .9rem;
      font-size: .75rem; letter-spacing: .06em; cursor: pointer; white-space: nowrap;
      transition: border-color .2s, color .2s;
      &:hover { border-color: var(--km-border-gold); color: var(--km-gold); }
    }

    .ht__toolbar-center {
      display: flex; align-items: center; gap: .8rem; flex: 1; justify-content: center;
    }

    .ht__card-glyph {
      font-size: 1.8rem; line-height: 1;
      background: linear-gradient(180deg, #c9a84c 0%, #6b5520 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      font-family: var(--km-font-arabic, inherit);
    }

    .ht__eyebrow {
      font-size: .58rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
      color: var(--km-gold); opacity: .6; margin-bottom: .1rem;
    }

    .ht__title {
      font-family: var(--km-font-heading); font-size: 1rem; font-weight: 600;
      letter-spacing: .08em; color: var(--km-text); margin: 0;
    }

    .ht__toolbar-right { display: flex; align-items: center; gap: .8rem; }

    .ht__search-wrap {
      position: relative;
      input { padding-right: 2rem; }
    }
    .ht__search-icon {
      position: absolute; right: .7rem; top: 50%; transform: translateY(-50%);
      color: var(--km-text-3); font-size: 1rem; pointer-events: none;
    }
    .ht__search {
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; color: var(--km-text); padding: .5rem .9rem;
      font-family: var(--km-font-body); font-size: .84rem; width: 220px; outline: none;
      transition: border-color .2s;
      &:focus { border-color: rgba(201,168,76,.4); }
      &::placeholder { color: var(--km-text-3); opacity: .5; }
    }

    .ht__add-btn {
      display: flex; align-items: center; gap: .4rem;
      background: rgba(201,168,76,.12); border: 1px solid rgba(201,168,76,.3);
      border-radius: 8px; color: var(--km-gold); padding: .5rem 1.1rem;
      font-size: .82rem; font-weight: 600; letter-spacing: .06em; cursor: pointer;
      transition: background .2s;
      &:hover { background: rgba(201,168,76,.22); }
    }

    /* Stats */
    .ht__stats {
      display: flex; align-items: center; gap: .8rem;
      padding: .6rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,.04);
      flex-shrink: 0;
    }
    .ht__stat { display: flex; align-items: center; gap: .35rem; }
    .ht__stat-num { font-size: .88rem; font-weight: 700; color: var(--km-gold); }
    .ht__stat-label { font-size: .72rem; color: var(--km-text-3); }
    .ht__stat-code { font-size: .72rem; color: var(--km-text-3); font-family: monospace; }
    .ht__stat-dot { color: var(--km-text-3); opacity: .4; }

    /* Table area */
    .ht__table-wrap { flex: 1; overflow-y: auto; padding: 0;
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }
    }

    /* Skeleton */
    .ht__loading { padding: 1.5rem; display: flex; flex-direction: column; gap: .8rem; }
    .ht__skeleton {
      height: 44px; border-radius: 8px;
      background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Empty */
    .ht__empty {
      display: flex; flex-direction: column; align-items: center; gap: 1.2rem;
      padding: 4rem 2rem; text-align: center; color: var(--km-text-3);
    }
    .ht__empty-glyph {
      font-size: 3.5rem; opacity: .25;
      background: linear-gradient(180deg, #c9a84c 0%, #6b5520 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      font-family: var(--km-font-arabic, inherit);
    }
    .ht__empty p { font-size: .9rem; }

    /* Table */
    .ht__table { width: 100%; border-collapse: collapse; }
    th {
      padding: .65rem 1.2rem; text-align: left;
      font-size: .65rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
      color: var(--km-text-3); border-bottom: 1px solid rgba(255,255,255,.08);
      position: sticky; top: 0; background: #080808;
    }
    td {
      padding: .75rem 1.2rem; font-size: .84rem; color: var(--km-text-2);
      border-bottom: 1px solid rgba(255,255,255,.04);
      max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ht__row { cursor: pointer; transition: background .15s;
      &:hover { background: rgba(255,255,255,.03); }
    }
    .ht__th-actions, .ht__td-actions { width: 60px; text-align: center; }
    .ht__action-btn {
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
      border-radius: 6px; color: var(--km-text-3); padding: .3rem .6rem;
      font-size: .8rem; cursor: pointer;
      transition: background .2s, color .2s;
      &:hover { background: rgba(201,168,76,.15); color: var(--km-gold); border-color: rgba(201,168,76,.3); }
    }

    .ht__load-more {
      display: block; width: 100%; padding: 1rem;
      background: rgba(255,255,255,.03); border: none; border-top: 1px solid rgba(255,255,255,.06);
      color: var(--km-text-3); font-size: .8rem; letter-spacing: .1em; cursor: pointer;
      transition: background .2s, color .2s;
      &:hover { background: rgba(255,255,255,.06); color: var(--km-text-2); }
    }
  `]
})
export class HubTableComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly panelSvc = inject(HubPanelService);

  readonly card = signal<HubCard | null>(null);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(true);
  readonly totalCount = signal(0);
  readonly hasMore = signal(false);
  private searchQuery = '';
  private offset = 0;
  readonly skeletons = Array.from({ length: 6 }, (_, i) => i);

  readonly columns = computed(() => {
    const r = this.rows();
    if (!r.length) return [];
    return Object.keys(r[0]).filter(k => k !== 'id').slice(0, 5);
  });

  readonly sectionLabel = computed(() => {
    const path = this.router.url.split('/');
    return path[2] ? path[2].charAt(0).toUpperCase() + path[2].slice(1) : 'Hub';
  });

  ngOnInit(): void {
    const c = this.route.snapshot.data['card'] as HubCard;
    this.card.set(c);
    if (c) this.fetchData(c);
  }

  private async fetchData(card: HubCard, reset = true): Promise<void> {
    this.loading.set(true);
    if (reset) { this.offset = 0; this.rows.set([]); }

    const endpoint = this.buildEndpoint(card);
    try {
      const res = await fetch(endpoint);
      const data = await res.json() as { ok: boolean; results?: unknown[]; items?: unknown[]; total?: number };
      if (data.ok) {
        const items = (data.results ?? data.items ?? []) as Record<string, unknown>[];
        this.rows.set(reset ? items : [...this.rows(), ...items]);
        this.totalCount.set(data.total ?? items.length);
        this.hasMore.set(items.length === 50);
      }
    } catch { /* silent */ } finally {
      this.loading.set(false);
    }
  }

  private buildEndpoint(card: HubCard): string {
    const base = card.table.replace(/_/g, '/');
    const mode = card.panelMode;
    if (mode.startsWith('wv-')) return `/wv/${mode.substring(3)}s?limit=50&offset=${this.offset}`;
    if (mode.startsWith('ar-')) return `/ar/${mode.substring(3)}s?limit=50&offset=${this.offset}`;
    if (mode === 'workspace') return `/workspaces?limit=50`;
    return `/${base}?limit=50&offset=${this.offset}`;
  }

  formatCell(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string' && val.length > 60) return val.slice(0, 60) + '…';
    return String(val);
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    const c = this.card();
    if (c) this.fetchData(c, true);
  }

  openAdd(): void {
    const c = this.card();
    if (!c) return;
    this.panelSvc.open(c.panelMode, `Add ${c.title}`);
  }

  openEdit(row: Record<string, unknown>): void {
    const c = this.card();
    if (!c) return;
    this.panelSvc.open(c.panelMode, `Edit ${c.title}`, row);
  }

  loadMore(): void {
    this.offset += 50;
    const c = this.card();
    if (c) this.fetchData(c, false);
  }

  goBack(): void {
    const segments = this.router.url.split('/').filter(Boolean);
    if (segments.length >= 3) {
      this.router.navigate([`/${segments[0]}/${segments[1]}`]);
    } else {
      this.router.navigate(['/hub']);
    }
  }
}
