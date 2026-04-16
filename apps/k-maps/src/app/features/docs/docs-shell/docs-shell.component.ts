import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, Subscription } from 'rxjs';

interface DocSummary {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: string;
  word_count: number;
  updated_at: string;
  parent_doc_id: string | null;
  sort_order: number;
}

interface DocNode extends DocSummary {
  children: DocNode[];
  depth: number;
}

interface FlatItem {
  type: 'domain';
  key: string;
  label: string;
  icon: string;
  count: number;
  open: boolean;
}

interface FlatDoc extends DocNode {
  type: 'doc';
}

type FlatRow = FlatItem | FlatDoc;

const DOMAINS = [
  { key: 'general',   label: 'General',   icon: '📝' },
  { key: 'quran',     label: 'Quran',     icon: '📖' },
  { key: 'arabic',    label: 'Arabic',    icon: 'ع' },
  { key: 'worldview', label: 'Worldview', icon: '🌍' },
  { key: 'workspace', label: 'Workspace', icon: '🏛' },
];

@Component({
  selector: 'km-docs-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="km-docs-layout">

      <!-- ── Sidebar ───────────────────────────────────────── -->
      <aside class="km-docs-sidebar">
        <div class="km-docs-sidebar-header">
          <span class="km-docs-sidebar-title">Documents</span>
          <button class="km-docs-new-btn" (click)="newDoc()">+ New</button>
        </div>

        <div class="km-docs-list">
          @if (loading()) {
            <div class="km-docs-loading">Loading…</div>
          }

          @for (row of flatRows(); track trackRow(row)) {

            @if (row.type === 'domain') {
              <div class="km-docs-domain" (click)="toggleDomain(row.key)">
                <span class="km-docs-domain-icon">{{ row.icon }}</span>
                <span class="km-docs-domain-label">{{ row.label }}</span>
                @if (row.count > 0) {
                  <span class="km-docs-domain-badge">{{ row.count }}</span>
                }
                <span class="km-docs-chevron" [class.open]="row.open">›</span>
              </div>
            }

            @if (row.type === 'doc') {
              <a class="km-docs-item"
                 [class.active]="activeDocId() === row.id"
                 [style.padding-left.px]="20 + row.depth * 14"
                 [routerLink]="['/docs', row.id]"
                 (click)="onDocClick(row.id)">
                @if (row.children.length > 0) {
                  <span class="km-docs-item-toggle"
                        [class.open]="isNodeOpen(row.id)"
                        (click)="toggleNode(row.id, $event)">›</span>
                } @else {
                  <span class="km-docs-item-toggle-ph"></span>
                }
                <span class="km-docs-item-icon">{{ row.children.length > 0 ? (isNodeOpen(row.id) ? '📂' : '📁') : '📄' }}</span>
                <span class="km-docs-item-title">{{ row.title || 'Untitled' }}</span>
              </a>
            }

          }

          @if (!loading() && docs().length === 0) {
            <p class="km-docs-empty">No documents yet.</p>
          }
        </div>
      </aside>

      <!-- ── Editor area ────────────────────────────────────── -->
      <main class="km-docs-main">
        <router-outlet />
      </main>

    </div>
  `,
  styles: [`
    :host { display: contents; }

    .km-docs-layout {
      display: flex;
      height: 100vh;
      height: 100dvh; /* iOS: excludes address bar + keyboard */
      background: var(--km-bg);
      overflow: hidden;
    }

    /* ── Sidebar ─────────────────────────────────────────── */
    .km-docs-sidebar {
      width: 256px;
      min-width: 256px;
      border-right: 1px solid var(--km-border);
      display: flex;
      flex-direction: column;
      background: var(--km-surface);
      overflow: hidden;
      /* iPhone: hide sidebar — editor needs the full width */
      @media (max-width: 768px) {
        display: none;
      }
    }

    .km-docs-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--km-border);
      flex-shrink: 0;
    }

    .km-docs-sidebar-title {
      font-weight: 700;
      font-size: 0.72rem;
      color: var(--km-text-3);
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .km-docs-new-btn {
      background: var(--km-gold);
      color: #000;
      border: none;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      &:hover { opacity: 0.85; }
    }

    .km-docs-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0 24px;
    }

    .km-docs-loading, .km-docs-empty {
      padding: 20px 16px;
      font-size: 0.8rem;
      color: var(--km-text-3);
    }

    /* ── Domain header ──────────────────────────────────── */
    .km-docs-domain {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px 6px;
      margin: 6px 6px 2px;
      border-radius: 6px;
      cursor: pointer;
      user-select: none;
      transition: background 0.1s;
      &:hover { background: rgba(255,255,255,0.04); }
    }

    .km-docs-domain-icon {
      font-size: 0.82rem;
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    }

    .km-docs-domain-label {
      flex: 1;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--km-text-3);
    }

    .km-docs-domain-badge {
      font-size: 0.62rem;
      color: var(--km-text-3);
      background: rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 1px 6px;
    }

    .km-docs-chevron {
      font-size: 0.75rem;
      color: var(--km-text-3);
      transition: transform 0.16s;
      display: inline-block;
      transform: rotate(0deg);
      &.open { transform: rotate(90deg); }
    }

    /* ── Doc item ──────────────────────────────────────── */
    .km-docs-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-top: 4px;
      padding-bottom: 4px;
      padding-right: 10px;
      border-radius: 6px;
      margin: 1px 6px;
      min-height: 28px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.1s;
      &:hover { background: rgba(255,255,255,0.05); }
      &.active {
        background: rgba(201,168,76,0.1);
        .km-docs-item-title { color: rgba(201,168,76,0.9); }
      }
    }

    .km-docs-item-toggle {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.68rem;
      color: var(--km-text-3);
      flex-shrink: 0;
      border-radius: 3px;
      transition: transform 0.14s;
      transform: rotate(0deg);
      &:hover { background: rgba(255,255,255,0.08); }
      &.open { transform: rotate(90deg); }
    }

    .km-docs-item-toggle-ph {
      width: 14px;
      flex-shrink: 0;
    }

    .km-docs-item-icon {
      font-size: 0.78rem;
      flex-shrink: 0;
      opacity: 0.75;
    }

    .km-docs-item-title {
      flex: 1;
      font-size: 0.84rem;
      color: var(--km-text-2);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Main ──────────────────────────────────────────── */
    .km-docs-main {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class DocsShellComponent implements OnInit, OnDestroy {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  docs    = signal<DocSummary[]>([]);
  loading = signal(true);
  activeDocId = signal<string | null>(null);

  private openDomains = signal<Set<string>>(new Set(DOMAINS.map(d => d.key)));
  private openNodes   = signal<Set<string>>(new Set());
  private routerSub!: Subscription;

  // Build a map: domain → tree of root nodes
  private treeByDomain = computed<Map<string, DocNode[]>>(() => {
    const all = this.docs();
    const nodeMap = new Map<string, DocNode>();
    for (const doc of all) {
      nodeMap.set(doc.id, { ...doc, children: [], depth: 0 });
    }

    const byDomain = new Map<string, DocNode[]>(DOMAINS.map(d => [d.key, []]));

    for (const doc of all) {
      const node = nodeMap.get(doc.id)!;
      if (doc.parent_doc_id && nodeMap.has(doc.parent_doc_id)) {
        const parent = nodeMap.get(doc.parent_doc_id)!;
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        const bucket = byDomain.has(doc.domain) ? doc.domain : 'general';
        byDomain.get(bucket)!.push(node);
      }
    }
    return byDomain;
  });

  // Flatten to visible rows (domain headers + visible doc nodes)
  flatRows = computed<FlatRow[]>(() => {
    const result: FlatRow[] = [];
    const openDoms = this.openDomains();
    const openNds  = this.openNodes();

    for (const domain of DOMAINS) {
      const roots = this.treeByDomain().get(domain.key) ?? [];
      const count = this.docs().filter(d => d.domain === domain.key).length;
      const open  = openDoms.has(domain.key);

      result.push({ type: 'domain', ...domain, count, open });

      if (open) {
        this.collectVisible(roots, openNds, result);
      }
    }
    return result;
  });

  private collectVisible(nodes: DocNode[], openNds: Set<string>, out: FlatRow[]): void {
    for (const node of nodes) {
      out.push({ type: 'doc', ...node });
      if (node.children.length > 0 && openNds.has(node.id)) {
        this.collectVisible(node.children, openNds, out);
      }
    }
  }

  trackRow(row: FlatRow): string {
    return row.type === 'domain' ? `d-${row.key}` : `n-${(row as FlatDoc).id}`;
  }

  ngOnInit(): void {
    this.loadDocs();

    // Track active doc from URL
    this.syncActiveFromUrl();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.syncActiveFromUrl(); this.cdr.markForCheck(); });
  }

  ngOnDestroy(): void { this.routerSub?.unsubscribe(); }

  private syncActiveFromUrl(): void {
    const match = this.router.url.match(/\/docs\/([^/?]+)/);
    this.activeDocId.set(match?.[1] ?? null);
  }

  private loadDocs(): void {
    this.http.get<{ docs: DocSummary[] }>('/api/docs?status=all&limit=200').subscribe({
      next: res => {
        this.docs.set(res.docs ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  isNodeOpen(id: string): boolean { return this.openNodes().has(id); }

  toggleDomain(key: string): void {
    this.openDomains.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  toggleNode(id: string, e: Event): void {
    e.preventDefault(); e.stopPropagation();
    this.openNodes.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  onDocClick(id: string): void { this.activeDocId.set(id); }

  newDoc(): void {
    this.http.post<{ id: string }>('/api/docs', { title: 'Untitled', domain: 'general', doc_type: 'note' })
      .subscribe(({ id }) => { this.loadDocs(); this.router.navigate(['/docs', id]); });
  }
}
