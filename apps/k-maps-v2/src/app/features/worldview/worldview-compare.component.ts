import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../../environments/environment';

interface WvComparison {
  id: number | string;
  title?: string;
  status?: string;
  tab_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface WvTab {
  id: number | string;
  label?: string;
  position?: number;
}

interface WvRow {
  id: number | string;
  label?: string;
  position?: number;
}

interface WvCell {
  id: number | string;
  tab_id: number | string;
  row_id: number | string;
  content?: string;
}

interface ComparisonDetail {
  comparison: WvComparison;
  tabs: WvTab[];
  rows: WvRow[];
  cells: WvCell[];
}

@Component({
  selector: 'km-worldview-compare',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wvc" #page>

      <!-- Top Bar -->
      <header class="wvc__topbar">
        <a class="wvc__back" [routerLink]="['/worldview']">
          <span>←</span>
          <span>Worldview</span>
        </a>
        <h1 class="wvc__title">Comparison</h1>
        <div class="wvc__topbar-spacer"></div>
        @if (detailView()) {
          <button class="wvc__btn wvc__btn--ghost" (click)="exitDetail()">← All Comparisons</button>
        } @else {
          <button class="wvc__btn wvc__btn--primary" (click)="newComparison()">
            <span>+</span>
            <span>New</span>
          </button>
        }
      </header>

      <!-- List View -->
      @if (!detailView()) {
        <div class="wvc__list-view" #listView>
          @if (loading()) {
            <div class="wvc__center">
              <span class="wvc__spinner"></span>
              <span class="wvc__loading-text">Loading comparisons…</span>
            </div>
          } @else if (comparisons().length === 0) {
            <div class="wvc__center">
              <div class="wvc__empty-glyph">↔</div>
              <h2 class="wvc__empty-title">No Comparisons Yet</h2>
              <p class="wvc__empty-desc">Create your first parallel scripture comparison to get started.</p>
              <button class="wvc__btn wvc__btn--primary" (click)="newComparison()">+ New Comparison</button>
            </div>
          } @else {
            <div class="wvc__grid">
              @for (comp of comparisons(); track comp.id) {
                <div class="wvc__card" (click)="openDetail(comp)" (keydown.enter)="openDetail(comp)" tabindex="0" role="button">
                  <div class="wvc__card-glow"></div>
                  <div class="wvc__card-header">
                    <span class="wvc__card-title">{{ comp.title || 'Untitled Comparison' }}</span>
                    @if (comp.status) {
                      <span class="wvc__status-badge" [class]="'wvc__status-badge--' + comp.status">
                        {{ comp.status }}
                      </span>
                    }
                  </div>
                  @if (comp.tab_count !== undefined) {
                    <div class="wvc__card-meta">
                      <span class="wvc__meta-icon">⊞</span>
                      <span>{{ comp.tab_count }} tab{{ comp.tab_count === 1 ? '' : 's' }}</span>
                    </div>
                  }
                  @if (comp.updated_at) {
                    <div class="wvc__card-date">{{ formatDate(comp.updated_at) }}</div>
                  }
                  <div class="wvc__card-arrow">→</div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Detail View -->
      @if (detailView() && detail()) {
        <div class="wvc__detail-view" #detailViewEl>
          <div class="wvc__detail-header">
            <h2 class="wvc__detail-title">{{ detail()!.comparison.title || 'Untitled Comparison' }}</h2>
            @if (detail()!.comparison.status) {
              <span class="wvc__status-badge" [class]="'wvc__status-badge--' + detail()!.comparison.status">
                {{ detail()!.comparison.status }}
              </span>
            }
          </div>

          @if (detail()!.tabs.length === 0) {
            <div class="wvc__detail-empty">
              <p>No tabs in this comparison yet.</p>
            </div>
          } @else {
            <!-- Tab Selector -->
            <div class="wvc__tab-bar">
              @for (tab of detail()!.tabs; track tab.id) {
                <button
                  class="wvc__tab-btn"
                  [class.wvc__tab-btn--active]="activeTab()?.id === tab.id"
                  (click)="setActiveTab(tab)"
                >
                  {{ tab.label || ('Tab ' + ($index + 1)) }}
                </button>
              }
            </div>

            <!-- Tab Content Grid -->
            <div class="wvc__columns">
              @for (tab of detail()!.tabs; track tab.id) {
                @if (activeTab()?.id === tab.id) {
                  <div class="wvc__column">
                    <div class="wvc__column-header">{{ tab.label || ('Tab ' + ($index + 1)) }}</div>
                    @for (row of detail()!.rows; track row.id) {
                      <div class="wvc__row">
                        @if (row.label) {
                          <div class="wvc__row-label">{{ row.label }}</div>
                        }
                        <div class="wvc__row-content">
                          {{ getCellContent(tab.id, row.id) || '—' }}
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }
        </div>
      }

      <!-- Loading Detail -->
      @if (detailView() && detailLoading()) {
        <div class="wvc__center">
          <span class="wvc__spinner"></span>
          <span class="wvc__loading-text">Loading comparison…</span>
        </div>
      }

    </div>
  `,
  styles: [`
    .wvc {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100dvh;
      background: var(--km-bg);
      color: var(--km-text);
      font-family: var(--km-font-body);
      overflow: hidden;

      &__topbar {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 0 1.5rem;
        height: 56px;
        min-height: 56px;
        border-bottom: 1px solid var(--km-border);
        background: rgba(255,255,255,0.02);
        flex-shrink: 0;
      }

      &__back {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.85rem 0.4rem 0.6rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--km-border);
        border-radius: 7px;
        color: var(--km-text-2);
        font-size: 0.73rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        text-decoration: none;
        transition: border-color 0.2s, color 0.2s, background 0.2s;
        flex-shrink: 0;

        &:hover {
          border-color: var(--km-border-gold);
          color: var(--km-gold);
          background: rgba(201,168,76,0.06);
        }
      }

      &__title {
        font-family: var(--km-font-heading);
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        color: var(--km-gold);
        margin: 0;
      }

      &__topbar-spacer { flex: 1; }

      &__btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.45rem 1rem;
        border-radius: 7px;
        font-family: var(--km-font-body);
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        cursor: pointer;
        border: 1px solid;
        transition: all 0.2s;

        &--primary {
          background: rgba(201,168,76,0.15);
          border-color: var(--km-border-gold);
          color: var(--km-gold-bright);

          &:hover {
            background: rgba(201,168,76,0.22);
            box-shadow: 0 0 16px rgba(201,168,76,0.15);
          }
        }

        &--ghost {
          background: rgba(255,255,255,0.03);
          border-color: var(--km-border);
          color: var(--km-text-2);

          &:hover {
            border-color: var(--km-border-gold);
            color: var(--km-gold);
            background: rgba(201,168,76,0.05);
          }
        }
      }

      /* List View */
      &__list-view {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;

        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      }

      &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25rem;
        max-width: 1100px;
      }

      &__card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 1.5rem 1.6rem;
        background: rgba(255,255,255,0.025);
        border: 1px solid var(--km-border);
        border-radius: 14px;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;

        &:hover {
          border-color: var(--km-border-gold);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(201,168,76,0.1);

          .wvc__card-glow { opacity: 1; }
          .wvc__card-arrow { opacity: 1; transform: translateX(3px); }
        }
      }

      &__card-glow {
        position: absolute;
        inset: 0;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.25s;
        pointer-events: none;
      }

      &__card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
      }

      &__card-title {
        font-family: var(--km-font-heading);
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--km-text);
        line-height: 1.3;
      }

      &__status-badge {
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        border: 1px solid;
        flex-shrink: 0;

        &--draft {
          color: var(--km-text-3);
          border-color: rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
        }

        &--active, &--published {
          color: var(--km-gold);
          border-color: rgba(201,168,76,0.25);
          background: rgba(201,168,76,0.08);
        }
      }

      &__card-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        color: var(--km-text-2);
      }

      &__meta-icon {
        font-size: 0.7rem;
        color: var(--km-gold);
        opacity: 0.6;
      }

      &__card-date {
        font-size: 0.68rem;
        color: var(--km-text-3);
        margin-top: auto;
      }

      &__card-arrow {
        align-self: flex-end;
        font-size: 1rem;
        color: var(--km-gold);
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s;
      }

      /* Detail View */
      &__detail-view {
        flex: 1;
        overflow-y: auto;
        padding: 2rem 2.5rem;

        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      }

      &__detail-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
      }

      &__detail-title {
        font-family: var(--km-font-heading);
        font-size: clamp(1.4rem, 3vw, 2rem);
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--km-text);
        margin: 0;
      }

      &__detail-empty {
        font-size: 0.85rem;
        color: var(--km-text-3);
        padding: 1.5rem 0;
      }

      /* Tab Bar */
      &__tab-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      &__tab-btn {
        padding: 0.45rem 1.1rem;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--km-border);
        border-radius: 7px;
        color: var(--km-text-2);
        font-family: var(--km-font-body);
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: rgba(201,168,76,0.25);
          color: var(--km-text);
        }

        &--active {
          background: rgba(201,168,76,0.1);
          border-color: var(--km-border-gold);
          color: var(--km-gold-bright);
        }
      }

      /* Columns */
      &__columns {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }

      &__column {
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--km-border);
        border-radius: 12px;
        overflow: hidden;
      }

      &__column-header {
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid var(--km-border);
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--km-gold);
        background: rgba(201,168,76,0.04);
      }

      &__row {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        &:last-child { border-bottom: none; }
      }

      &__row-label {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--km-text-3);
        margin-bottom: 0.35rem;
      }

      &__row-content {
        font-size: 0.87rem;
        color: var(--km-text);
        line-height: 1.65;
      }

      /* Common states */
      &__center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        flex: 1;
        gap: 1rem;
        color: var(--km-text-3);
        text-align: center;
        padding: 2rem;
      }

      &__spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(201,168,76,0.15);
        border-top-color: var(--km-gold);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      &__loading-text {
        font-size: 0.82rem;
        color: var(--km-text-3);
      }

      &__empty-glyph {
        font-size: 4rem;
        line-height: 1;
        background: linear-gradient(135deg, var(--km-gold) 0%, #5a4820 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        opacity: 0.4;
        margin-bottom: 0.5rem;
      }

      &__empty-title {
        font-family: var(--km-font-heading);
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--km-text-2);
        margin: 0;
      }

      &__empty-desc {
        font-size: 0.83rem;
        color: var(--km-text-3);
        max-width: 320px;
        line-height: 1.6;
        margin: 0;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class WorldviewCompareComponent implements OnInit, AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly comparisons = signal<WvComparison[]>([]);
  readonly detailView = signal(false);
  readonly detail = signal<ComparisonDetail | null>(null);
  readonly activeTab = signal<WvTab | null>(null);

  ngOnInit(): void {
    void this.loadComparisons();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.pageRef.nativeElement,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
  }

  openDetail(comp: WvComparison): void {
    this.detailView.set(true);
    this.detail.set(null);
    this.activeTab.set(null);
    void this.loadDetail(comp.id);
  }

  exitDetail(): void {
    this.detailView.set(false);
    this.detail.set(null);
    this.activeTab.set(null);
  }

  newComparison(): void {
    // Placeholder: would open a creation modal/form
  }

  setActiveTab(tab: WvTab): void {
    this.activeTab.set(tab);
  }

  getCellContent(tabId: number | string, rowId: number | string): string {
    const d = this.detail();
    if (!d) return '';
    const cell = d.cells.find(c => c.tab_id === tabId && c.row_id === rowId);
    return cell?.content ?? '';
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  private async loadComparisons(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/comparisons?limit=20`);
      if (!res.ok) { this.loading.set(false); return; }
      const data = await res.json() as { ok: boolean; comparisons: WvComparison[] };
      if (data.ok && Array.isArray(data.comparisons)) {
        this.comparisons.set(data.comparisons);
      }
    } catch {
      // silently ignore
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDetail(id: number | string): Promise<void> {
    this.detailLoading.set(true);
    try {
      const res = await fetch(`${environment.wvBase}/wv/comparisons/${id}`);
      if (!res.ok) { this.detailLoading.set(false); return; }
      const data = await res.json() as {
        ok: boolean;
        comparison: WvComparison;
        tabs: WvTab[];
        rows: WvRow[];
        cells: WvCell[];
      };
      if (data.ok) {
        const d: ComparisonDetail = {
          comparison: data.comparison,
          tabs: data.tabs ?? [],
          rows: data.rows ?? [],
          cells: data.cells ?? [],
        };
        this.detail.set(d);
        if (d.tabs.length > 0) {
          this.activeTab.set(d.tabs[0]);
        }
      }
    } catch {
      // silently ignore
    } finally {
      this.detailLoading.set(false);
    }
  }
}
