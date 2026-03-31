import {
  Component, ChangeDetectionStrategy, OnInit,
  inject, signal, computed
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HubPanelComponent } from '../hub-panel/hub-panel.component';
import { HubPanelService } from '../hub-panel/hub-panel.service';
import { HubCard } from '../models/hub.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'km-hub-table',
  standalone: true,
  imports: [CommonModule, HubPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub-table.component.html',
  styleUrl: './hub-table.component.scss'
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
    const p = `limit=50&offset=${this.offset}`;
    if (mode.startsWith('wv-')) return `${environment.apiBase}/wv/${mode.substring(3)}s?${p}`;
    if (mode === 'ar-grammar') return `${environment.apiBase}/ar/grammar/concepts?${p}`;
    if (mode === 'ar-balagha') return `${environment.apiBase}/ar/balagha?${p}`;
    if (mode === 'ar-srs') return `${environment.apiBase}/ar/srs?${p}`;
    if (mode === 'ar-vocab') return `${environment.apiBase}/ar/roots?${p}`;
    if (mode.startsWith('ar-')) return `${environment.apiBase}/ar/${mode.substring(3)}s?${p}`;
    if (mode === 'workspace') return `${environment.apiBase}/workspaces?limit=50`;
    return `${environment.apiBase}/${base}?${p}`;
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
