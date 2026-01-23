import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  constructor(private readonly docsService: DocsService) {}

  ngOnInit() {
    this.loadDocs();
  }

  async loadDocs() {
    this.loading = true;
    this.error = null;

    try {
      const data = await this.docsService.list({ status: 'published' });
      this.docs = data.results ?? [];
    } catch (err: any) {
      this.error = err?.message ?? 'Unable to load docs';
    } finally {
      this.loading = false;
    }
  }
}
