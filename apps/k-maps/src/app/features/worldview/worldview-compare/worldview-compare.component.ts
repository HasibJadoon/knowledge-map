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
  templateUrl: './worldview-compare.component.html',
  styleUrl: './worldview-compare.component.scss',
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
