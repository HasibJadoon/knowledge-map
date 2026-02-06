import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HeaderSearchComponent } from '../header-search/header-search.component';
import {
  PageHeaderFilterChangeEvent,
  PageHeaderFilterConfig,
} from '../../../../models/core/page-header.model';

type HeaderbarPageItem = number | 'ellipsis-start' | 'ellipsis-end';

export interface AppHeaderbarPagination {
  page: number;
  pageSize: number;
  total: number;
  hideIfSinglePage?: boolean;
  pageSizeOptions?: number[];
}

@Component({
  selector: 'app-headerbar',
  standalone: true,
  imports: [CommonModule, HeaderSearchComponent],
  templateUrl: './app-headerbar.component.html',
  styleUrls: ['./app-headerbar.component.scss'],
})
export class AppHeaderbarComponent {
  @Input() title = '';
  @Input() showTitle = false;
  @Input() showSearch = true;
  @Input() placeholder = 'Search';
  @Input() value = '';
  @Input() leadingLabel = '';
  @Input() primaryLabel = '';
  @Input() secondaryLabel = '';
  @Input() tertiaryLabel = '';
  @Input() pagination: AppHeaderbarPagination | null = null;
  @Input() filters: PageHeaderFilterConfig[] = [];

  @Output() search = new EventEmitter<string>();
  @Output() leading = new EventEmitter<void>();
  @Output() primary = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();
  @Output() tertiary = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() filterChange = new EventEmitter<PageHeaderFilterChangeEvent>();

  trackByPageItem = (index: number, item: HeaderbarPageItem) =>
    typeof item === 'number' ? `page-${item}` : `${item}-${index}`;

  get totalPages() {
    const pageSize = this.pagination?.pageSize ?? 0;
    const total = this.pagination?.total ?? 0;
    if (!pageSize || !total) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }

  get currentPage() {
    const rawPage = Number(this.pagination?.page ?? 1);
    if (!Number.isFinite(rawPage)) return 1;
    return Math.min(this.totalPages, Math.max(1, rawPage));
  }

  get shouldShowPagination() {
    if (!this.pagination) return false;
    const hasPageSizeSelector = !!this.pagination.pageSizeOptions?.length;
    if (hasPageSizeSelector) return true;
    if (this.pagination.hideIfSinglePage && this.totalPages <= 1) return false;
    return this.totalPages > 1;
  }

  get visiblePageItems(): HeaderbarPageItem[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        'ellipsis-start',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      'ellipsis-start',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      'ellipsis-end',
      totalPages,
    ];
  }

  isPageNumber(item: HeaderbarPageItem): item is number {
    return typeof item === 'number';
  }

  onFilterInput(filter: PageHeaderFilterConfig, event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const value = String(target?.value ?? '');
    this.filterChange.emit({
      id: filter.id,
      queryParamKey: filter.queryParamKey,
      value,
      resetPageOnChange: filter.resetPageOnChange ?? true,
    });
  }

  onPageSizeInput(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const value = Number.parseInt(String(target?.value ?? ''), 10);
    if (!Number.isFinite(value) || value <= 0) return;
    this.pageSizeChange.emit(value);
  }

  onFirstPage() {
    this.goToPage(1);
  }

  onPrevPage() {
    this.goToPage(this.currentPage - 1);
  }

  onNextPage() {
    this.goToPage(this.currentPage + 1);
  }

  onLastPage() {
    this.goToPage(this.totalPages);
  }

  goToPage(page: number) {
    if (!this.pagination) return;
    if (!Number.isFinite(page)) return;
    if (page < 1 || page > this.totalPages) return;
    if (page === this.currentPage) return;
    this.pageChange.emit(page);
  }
}
