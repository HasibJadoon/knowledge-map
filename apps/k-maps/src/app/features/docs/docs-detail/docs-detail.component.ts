import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DocsService, DocDetail } from '../../../shared/services/docs.service';
import { marked } from 'marked';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-docs-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './docs-detail.component.html',
  styleUrls: ['./docs-detail.component.scss'],
})
export class DocsDetailComponent implements OnInit, OnDestroy {
  doc: DocDetail | null = null;
  html: SafeHtml | null = null;
  loading = false;
  error: string | null = null;

  private paramSub: Subscription | null = null;

  constructor(
    private readonly docsService: DocsService,
    private readonly route: ActivatedRoute,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadDoc(slug);
      }
    });
  }

  ngOnDestroy() {
    this.paramSub?.unsubscribe();
  }

  private async loadDoc(slug: string) {
    this.loading = true;
    this.error = null;
    this.doc = null;
    this.html = null;

    try {
      const data = await this.docsService.get(slug);
      this.doc = data.doc;
      if (this.doc?.body_md) {
        const rendered = marked.parse(this.doc.body_md);
        this.html = this.sanitizer.bypassSecurityTrustHtml(rendered);
      }
    } catch (err: any) {
      this.error = err?.message ?? 'Unable to load doc';
    } finally {
      this.loading = false;
    }
  }
}
