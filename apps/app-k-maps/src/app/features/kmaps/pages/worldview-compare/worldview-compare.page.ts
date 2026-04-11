import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';

interface WvComparison {
  id: number | string;
  title?: string;
  status?: string;
  tab_count?: number;
  updated_at?: string;
}

interface WvTab {
  id: number | string;
  label?: string;
}

interface WvRow {
  id: number | string;
  label?: string;
}

interface WvCell {
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
  selector: 'app-worldview-compare',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './worldview-compare.page.html',
  styleUrl: './worldview-compare.page.scss',
})
export class WorldviewComparePage implements OnInit {
  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly comparisons = signal<WvComparison[]>([]);
  readonly detail = signal<ComparisonDetail | null>(null);
  readonly activeTab = signal<WvTab | null>(null);

  ngOnInit(): void {
    void this.loadComparisons();
  }

  openDetail(comp: WvComparison): void {
    this.detail.set(null);
    this.activeTab.set(null);
    void this.loadDetail(comp.id);
  }

  exitDetail(): void {
    this.detail.set(null);
    this.activeTab.set(null);
  }

  setActiveTab(tab: WvTab): void {
    this.activeTab.set(tab);
  }

  getCellContent(tabId: number | string, rowId: number | string): string {
    const d = this.detail();
    if (!d) return '';
    return d.cells.find(c => c.tab_id === tabId && c.row_id === rowId)?.content ?? '';
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  private async loadComparisons(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await fetch(`${environment.apiBase}/wv/comparisons?limit=20`);
      if (!res.ok) return;
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
      const res = await fetch(`${environment.apiBase}/wv/comparisons/${id}`);
      if (!res.ok) return;
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
        if (d.tabs.length > 0) this.activeTab.set(d.tabs[0]);
      }
    } catch {
      // silently ignore
    } finally {
      this.detailLoading.set(false);
    }
  }
}
