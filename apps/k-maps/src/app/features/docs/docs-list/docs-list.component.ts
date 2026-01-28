import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocsService, DocSummary } from '../../../shared/services/docs.service';
import { DocTreeNode } from '../../../shared/models/docs/doc-tree-node.model';

@Component({
  selector: 'app-docs-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './docs-list.component.html',
  styleUrls: ['./docs-list.component.scss'],
})
export class DocsListComponent implements OnInit {
  docs: DocSummary[] = [];
  docsTree: DocTreeNode[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  private allDocs: DocSummary[] = [];
  private docMap = new Map<string, DocSummary>();

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
      this.docMap = new Map(this.allDocs.map((doc) => [doc.slug, doc]));
      this.applyFilter();
    } catch (err: any) {
      this.error = err?.message ?? 'Unable to load docs';
    } finally {
      this.loading = false;
    }
  }

  private applyFilter() {
    const term = this.searchTerm.toLowerCase();
    const filtered = term
      ? this.allDocs.filter((doc) => {
          const haystack = `${doc.title} ${doc.tags?.join(' ') ?? ''} ${doc.status}`.toLowerCase();
          return haystack.includes(term);
        })
      : [...this.allDocs];

    this.docs = filtered;
    this.buildTree(filtered);
  }

  docLinkSegmentsBySlug(slug: string) {
    return ['/docs', ...slug.split('/')];
  }

  private buildTree(filteredDocs: DocSummary[]) {
    const visibleSlugs = new Set<string>();
    const markVisible = (slug: string | null | undefined) => {
      while (slug && !visibleSlugs.has(slug)) {
        visibleSlugs.add(slug);
        const parentSlug = this.docMap.get(slug)?.parent_slug ?? this.inferParentSlug(slug);
        if (!parentSlug) break;
        slug = parentSlug;
      }
    };

    for (const doc of filteredDocs) {
      markVisible(doc.slug);
    }

    const nodesMap = new Map<string, DocTreeNode>();
    const ensureNode = (slug: string) => {
      if (!nodesMap.has(slug)) {
        nodesMap.set(slug, {
          slug,
          label: this.formatSlugLabel(slug),
          children: [],
          sortIndex: this.nodeSortIndex(slug),
        });
      }
      return nodesMap.get(slug)!;
    };

    for (const doc of this.allDocs) {
      const label =
        doc.title && doc.title.toLowerCase() !== 'readme'
          ? doc.title
          : this.formatSlugLabel(doc.slug);
      nodesMap.set(doc.slug, {
        slug: doc.slug,
        label,
        doc,
        children: [],
        sortIndex: doc.sort_order ?? this.nodeSortIndex(doc.slug),
      });
      let parentSlug = doc.parent_slug ?? this.inferParentSlug(doc.slug);
      while (parentSlug) {
        ensureNode(parentSlug);
        parentSlug = this.inferParentSlug(parentSlug);
      }
    }

    const roots: DocTreeNode[] = [];
    for (const node of nodesMap.values()) {
      if (!visibleSlugs.has(node.slug)) continue;
      const parentSlug = node.doc?.parent_slug ?? this.inferParentSlug(node.slug);
      if (parentSlug && nodesMap.has(parentSlug) && visibleSlugs.has(parentSlug)) {
        nodesMap.get(parentSlug)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortTree = (nodes: DocTreeNode[]): DocTreeNode[] => {
      return nodes
        .map((node) => ({
          ...node,
          children: sortTree(node.children),
        }))
        .sort((a, b) => {
          if (a.sortIndex === b.sortIndex) {
            return a.label.localeCompare(b.label);
          }
          return a.sortIndex - b.sortIndex;
        });
    };

    this.docsTree = sortTree(roots);
  }

  private nodeSortIndex(slug: string) {
    const match = slug.match(/^(\d+)-/);
    if (match) return Number(match[1]);
    return 9999;
  }

  private formatSlugLabel(slug: string) {
    const primary = slug.split('/')[0] ?? slug;
    return primary
      .replace(/^\d+-/, '')
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private inferParentSlug(slug: string) {
    const index = slug.lastIndexOf('/');
    if (index <= 0) return null;
    return slug.slice(0, index);
  }
}
