import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  AppCrudTableComponent,
  AppHeaderbarComponent,
  AppHeaderbarPagination,
  CrudTableColumn,
} from '../../../../../shared/components';
import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import { QuranLemmaLocation } from '../../../../../shared/models/arabic/quran-data.model';
import { QuranDataSubmenuComponent } from '../shared/quran-data-submenu.component';

@Component({
  selector: 'app-quran-lemma-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderbarComponent, AppCrudTableComponent, QuranDataSubmenuComponent],
  templateUrl: './quran-lemma-locations.component.html',
  styleUrls: ['./quran-lemma-locations.component.scss'],
})
export class QuranLemmaLocationsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(QuranDataService);
  private readonly subs = new Subscription();

  q = '';
  lemmaId: number | null = null;
  surah: number | null = null;
  ayah: number | null = null;
  page = 1;
  pageSize = 50;
  total = 0;
  pageSizeOptions = [25, 50, 100];

  rows: QuranLemmaLocation[] = [];
  loading = false;
  error = '';

  readonly columns: CrudTableColumn[] = [
    {
      key: 'lemma_text',
      label: 'Lemma',
      cellClass: () => 'app-table-arabic',
    },
    {
      key: 'lemma_text_clean',
      label: 'Lemma (Clean)',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'token_index',
      label: 'Token',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'word_simple',
      label: 'Word',
      cellClass: () => 'app-table-arabic',
    },
  ];

  get pagination(): AppHeaderbarPagination {
    return {
      page: this.page,
      pageSize: this.pageSize,
      total: this.total,
      hideIfSinglePage: true,
      pageSizeOptions: this.pageSizeOptions,
    };
  }

  ngOnInit() {
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        this.q = params.get('q') ?? '';
        this.lemmaId = this.parseOptionalInt(params.get('lemma_id'));
        this.surah = this.parseOptionalInt(params.get('surah'));
        this.ayah = this.parseOptionalInt(params.get('ayah'));
        this.page = this.parseIntParam(params.get('page'), 1, 1);
        this.pageSize = this.parseIntParam(params.get('pageSize'), 50, 25, 200);
        this.load();
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const response = await this.dataService.listLemmaLocations({
        q: this.q.trim() || undefined,
        lemmaId: this.lemmaId ?? undefined,
        surah: this.surah ?? undefined,
        ayah: this.ayah ?? undefined,
        page: this.page,
        pageSize: this.pageSize,
      });
      this.rows = response.results ?? [];
      this.total = response.total ?? 0;
      this.page = this.parseIntParam(String(response.page ?? this.page), this.page, 1);
      this.pageSize = this.parseIntParam(String(response.pageSize ?? this.pageSize), this.pageSize, 25, 200);
    } catch (err: any) {
      console.error('lemma locations error', err);
      this.error = err?.message ?? 'Unable to load lemma locations.';
    } finally {
      this.loading = false;
    }
  }

  onHeaderSearchInput(value: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value || null, page: 1, offset: null },
      queryParamsHandling: 'merge',
    });
  }

  onHeaderPageChange(page: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, offset: null },
      queryParamsHandling: 'merge',
    });
  }

  onHeaderPageSizeChange(pageSize: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pageSize, page: 1, offset: null },
      queryParamsHandling: 'merge',
    });
  }

  applyFilters() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        lemma_id: this.lemmaId || null,
        surah: this.surah || null,
        ayah: this.ayah || null,
        page: 1,
        offset: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters() {
    this.lemmaId = null;
    this.surah = null;
    this.ayah = null;
    this.applyFilters();
  }

  private parseOptionalInt(value: string | null): number | null {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  private parseIntParam(value: string | null, fallback: number, min = 0, max = 9999) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }
}
