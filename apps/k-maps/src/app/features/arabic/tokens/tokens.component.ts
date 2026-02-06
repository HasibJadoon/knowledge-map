import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TokensService } from '../../../shared/services/tokens.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TokenRow } from '../../../shared/models/arabic/token.model';
import {
  PageHeaderFilterChangeEvent,
  PageHeaderFilterConfig,
} from '../../../shared/models/core/page-header.model';
import {
  AppCrudTableComponent,
  AppHeaderbarComponent,
  AppHeaderbarPagination,
  CrudTableColumn
} from '../../../shared/components';

@Component({
  selector: 'app-tokens',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCrudTableComponent, AppHeaderbarComponent],
  templateUrl: './tokens.component.html',
  styleUrls: ['./tokens.component.scss'],
})
export class TokensComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subs = new Subscription();

  readonly posOptions = ['verb', 'noun', 'adj', 'particle', 'phrase'];

  q = '';
  pos = '';
  page = 1;
  pageSize = 50;
  pageSizeOptions = [25, 50, 100];
  tableColumns: CrudTableColumn[] = [
    {
      key: 'lemma_ar',
      label: 'Lemma (Arabic)',
      cellClass: () => 'app-table-arabic',
    },
    {
      key: 'lemma_norm',
      label: 'Lemma (Norm)',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'pos',
      label: 'POS',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'root',
      label: 'Root',
      value: (row) => this.displayRoot(row as TokenRow),
      cellClass: (row) => {
        const hasArabic = !!String(row['root'] ?? '').trim();
        return hasArabic ? 'app-table-arabic' : 'app-table-english';
      },
    },
    {
      key: 'canonical_input',
      label: 'Canonical',
      cellClass: () => 'app-table-english',
    },
    {
      key: 'meta',
      label: 'Meta',
      type: 'json',
      value: (row) => this.metaPayload(row as TokenRow),
      jsonTitle: 'Token metadata',
    },
  ];

  tokens: TokenRow[] = [];
  total = 0;
  loading = false;
  error = '';

  showEdit = false;
  savingEdit = false;
  editError = '';
  editToken: TokenRow | null = null;
  editForm = {
    lemma_ar: '',
    lemma_norm: '',
    pos: '',
    root_norm: '',
    ar_u_root: '',
  };
  editMetaJson = '{}';

  constructor(
    private tokensService: TokensService,
    private toast: ToastService
  ) {}

  get headerFilters(): PageHeaderFilterConfig[] {
    return [
      {
        id: 'pos',
        queryParamKey: 'pos',
        value: this.pos,
        options: [
          { value: '', label: 'All POS' },
          ...this.posOptions.map((option) => ({
            value: option,
            label: option.charAt(0).toUpperCase() + option.slice(1),
          })),
        ],
        resetPageOnChange: true,
      },
    ];
  }

  get headerPagination(): AppHeaderbarPagination {
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
        this.pos = params.get('pos') ?? '';
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
      const response = await this.tokensService.list({
        q: this.q.trim() || undefined,
        pos: this.pos || undefined,
        page: this.page,
        pageSize: this.pageSize,
      });
      this.tokens = response.results;
      this.total = response.total;
      this.page = this.parseIntParam(String(response.page ?? this.page), this.page, 1);
      this.pageSize = this.parseIntParam(String(response.pageSize ?? this.pageSize), this.pageSize, 25, 200);
    } catch (err: any) {
      console.error('tokens load failed', err);
      this.error = err?.message ?? 'Unable to fetch tokens.';
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

  onHeaderFilterChange(event: PageHeaderFilterChangeEvent) {
    if (event.id !== 'pos') return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pos: event.value || null, page: 1, offset: null },
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

  onHeaderAddClick() {
    this.toast.show('Token creation form will be added next.', 'success');
  }

  refresh() {
    this.load();
  }

  openEdit(token: TokenRow) {
    this.editToken = token;
    this.editForm = {
      lemma_ar: token.lemma_ar ?? '',
      lemma_norm: token.lemma_norm ?? '',
      pos: token.pos ?? '',
      root_norm: token.root_norm ?? '',
      ar_u_root: token.ar_u_root ?? '',
    };
    this.editMetaJson = JSON.stringify(token.meta ?? {}, null, 2);
    this.editError = '';
    this.showEdit = true;
  }

  closeEdit() {
    this.showEdit = false;
    this.savingEdit = false;
    this.editError = '';
    this.editToken = null;
  }

  async saveEdit() {
    if (!this.editToken) return;

    let meta: Record<string, unknown> | null = null;
    if (this.editMetaJson.trim()) {
      try {
        const parsed = JSON.parse(this.editMetaJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Meta JSON must be an object.');
        }
        meta = parsed as Record<string, unknown>;
      } catch (err) {
        this.editError =
          err instanceof Error ? err.message : 'Meta JSON must be a valid object.';
        return;
      }
    }

    const payload = {
      lemma_ar: this.editForm.lemma_ar.trim(),
      lemma_norm: this.editForm.lemma_norm.trim(),
      pos: this.editForm.pos.trim(),
      root_norm: this.editForm.root_norm.trim() || null,
      ar_u_root: this.editForm.ar_u_root.trim() || null,
      meta,
    };

    this.savingEdit = true;
    this.editError = '';
    try {
      const updated = await this.tokensService.update(this.editToken.id, payload);
      const index = this.tokens.findIndex((token) => token.id === updated.id);
      if (index >= 0) {
        this.tokens = [
          ...this.tokens.slice(0, index),
          updated,
          ...this.tokens.slice(index + 1),
        ];
      }
      this.toast.show('Token updated.', 'success');
      this.closeEdit();
    } catch (err: any) {
      this.editError = err?.message ?? 'Unable to update token.';
    } finally {
      this.savingEdit = false;
    }
  }

  trackByToken(_index: number, token: TokenRow) {
    return token.id;
  }

  displayRoot(token: TokenRow) {
    if (!token.root && !token.root_norm) return '—';
    if (token.root && !token.root_norm) return token.root;
    if (token.root && token.root_norm) return `${token.root} (${token.root_norm})`;
    return token.root_norm;
  }

  metaPayload(token: TokenRow) {
    return {
      token_meta: token.meta ?? {},
      root_meta: token.root_meta ?? {},
    };
  }

  private parseIntParam(
    value: string | null,
    fallback: number,
    min: number,
    max?: number
  ) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    const clampedMin = Math.max(min, parsed);
    if (typeof max !== 'number') return clampedMin;
    return Math.min(max, clampedMin);
  }

}
