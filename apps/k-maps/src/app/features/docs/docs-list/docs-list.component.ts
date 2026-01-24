import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocsService, DocSummary } from '../../../shared/services/docs.service';

@Component({
  selector: 'app-docs-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './docs-list.component.html',
  styleUrls: ['./docs-list.component.scss'],
})
export class DocsListComponent implements OnInit {
  docs: DocSummary[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  private allDocs: DocSummary[] = [];

  constructor(
    private readonly docsService: DocsService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = String(params.get('q') ?? '').trim();
      this.applyFilter();
    });
    this.loadDocs();
  }

  async loadDocs() {
    this.loading = true;
    this.error = null;

    try {
      const data = await this.docsService.list({ status: 'published' });
      this.allDocs = data.results ?? [];
      this.applyFilter();
    } catch (err: any) {
      this.error = err?.message ?? 'Unable to load docs';
    } finally {
      this.loading = false;
    }
  }

  private applyFilter() {
    const term = this.searchTerm.toLowerCase();
    if (!term) {
      this.docs = [...this.allDocs];
      return;
    }
    this.docs = this.allDocs.filter((doc) => {
      const haystack = `${doc.title} ${doc.tags?.join(' ') ?? ''} ${doc.status}`.toLowerCase();
      return haystack.includes(term);
    });
  }
}
