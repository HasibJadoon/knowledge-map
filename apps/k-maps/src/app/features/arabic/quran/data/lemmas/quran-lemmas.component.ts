import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  AppCrudTableComponent,
  AppHeaderbarComponent,
  AppHeaderbarPagination,
  CrudTableColumn,
  CrudTableAction,
  CrudTableActionEvent,
} from '../../../../../shared/components';
import { QuranDataService } from '../../../../../shared/services/quran-data.service';
import { QuranLemma } from '../../../../../shared/models/arabic/quran-data.model';
import { QuranDataSubmenuComponent } from '../shared/quran-data-submenu.component';

@Component({
  selector: 'app-quran-lemmas',
  standalone: true,
  imports: [CommonModule, AppHeaderbarComponent, AppCrudTableComponent, QuranDataSubmenuComponent],
  templateUrl: './quran-lemmas.component.html',
  styleUrls: ['./quran-lemmas.component.scss'],
})
export class QuranLemmasComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(QuranDataService);
  private readonly subs = new Subscription();

  q = '';
  page = 1;
  pageSize = 50;
  total = 0;
  pageSizeOptions = [25, 50, 100];

  lemmas: QuranLemma[] = [];
  loading = false;
  error = '';

  readonly columns: CrudTableColumn[] = [
    {
      key: 'lemma_text',
      label: 'Lemma (Arabic)',
      cellClass: () => 'app-table-arabic',
    },
    {
      key: 'lemma_text_clean',
      label: 'Lemma (Clean)',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'words_count',
      label: 'Words',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'uniq_words_count',
      label: 'Unique',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'primary_ar_u_token',
      label: 'Primary Token',
      cellClass: () => 'app-table-english',
      value: (row) => row.primary_ar_u_token || '—',
    },
  ];

  readonly actions: CrudTableAction[] = [
    {
      id: 'locations',
      label: 'Locations',
      icon: 'view',
      variant: 'primary',
      outline: true,
      showLabel: true,
      className: 'app-crud-action-btn-label',
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
      const response = await this.dataService.listLemmas({
        q: this.q.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
      });
      this.lemmas = response.results ?? [];
      this.total = response.total ?? 0;
      this.page = this.parseIntParam(String(response.page ?? this.page), this.page, 1);
      this.pageSize = this.parseIntParam(String(response.pageSize ?? this.pageSize), this.pageSize, 25, 200);
    } catch (err: any) {
      console.error('lemma list error', err);
      this.error = err?.message ?? 'Unable to load lemmas.';
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

  onAction(event: CrudTableActionEvent) {
    if (event.id !== 'locations') return;
    const lemma = event.row as QuranLemma;
    this.router.navigate(['/arabic/quran/data/lemma-locations'], {
      queryParams: { lemma_id: lemma.lemma_id },
    });
  }

  private parseIntParam(value: string | null, fallback: number, min = 0, max = 9999) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }
}
