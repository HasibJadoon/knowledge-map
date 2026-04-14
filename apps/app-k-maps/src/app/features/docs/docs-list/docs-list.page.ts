import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { filter, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

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
  selector: 'app-docs-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Documents</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="newDoc()" fill="clear">
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Search documents…"
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch($event)"
          [debounce]="200">
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="km-docs-loading">
          <ion-spinner name="dots"></ion-spinner>
        </div>
      }

      @if (!loading() && docs().length === 0) {
        <div class="km-docs-empty">
          <ion-icon name="document-text-outline"></ion-icon>
          <p>No documents yet.</p>
          <ion-button size="small" (click)="newDoc()">Create your first document</ion-button>
        </div>
      }

      <ion-list lines="none" class="km-docs-list">
        @for (row of flatRows(); track trackRow(row)) {

          @if (row.type === 'domain') {
            <div class="km-domain-row" (click)="toggleDomain(row.key)">
              <span class="km-domain-icon">{{ row.icon }}</span>
              <span class="km-domain-label">{{ row.label }}</span>
              @if (row.count > 0) {
                <ion-badge class="km-domain-badge">{{ row.count }}</ion-badge>
              }
              <ion-icon
                [name]="row.open ? 'chevron-down' : 'chevron-forward'"
                class="km-domain-chevron">
              </ion-icon>
            </div>
          }

          @if (row.type === 'doc') {
            <ion-item
              button
              detail="false"
              class="km-doc-item"
              [class.km-doc-item--active]="activeDocId() === row.id"
              [style.--indent]="row.depth * 14 + 'px'"
              (click)="openDoc(row.id)">
              @if (row.children.length > 0) {
                <ion-icon
                  slot="start"
                  class="km-doc-toggle"
                  [name]="isNodeOpen(row.id) ? 'chevron-down' : 'chevron-forward'"
                  (click)="toggleNode(row.id, $event)">
                </ion-icon>
              } @else {
                <span slot="start" class="km-doc-toggle-ph"></span>
              }
              <ion-icon
                slot="start"
                class="km-doc-icon"
                [name]="row.children.length > 0 ? (isNodeOpen(row.id) ? 'folder-open' : 'folder') : 'document-text'">
              </ion-icon>
              <ion-label class="km-doc-label">
                <h3>{{ row.title || 'Untitled' }}</h3>
                <p>{{ row.doc_type }} · {{ formatDate(row.updated_at) }}</p>
              </ion-label>
              @if (row.word_count > 0) {
                <span slot="end" class="km-doc-wc">{{ row.word_count }}w</span>
              }
            </ion-item>
          }

        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    :host { display: block; }

    ion-header ion-toolbar:last-child {
      --padding-top: 0;
      --padding-bottom: 4px;
    }

    .km-docs-loading {
      display: flex;
      justify-content: center;
      padding: 60px 0;
    }

    .km-docs-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px 24px;
      color: var(--ion-color-medium);
      text-align: center;

      ion-icon { font-size: 3rem; opacity: 0.4; }
      p { margin: 0; font-size: 0.9rem; }
    }

    .km-docs-list { padding: 0 0 80px; }

    /* ── Domain row ─────────────────────────────────────────── */
    .km-domain-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px 8px;
      margin: 8px 8px 2px;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
      transition: background 0.1s;

      &:active { background: rgba(255,255,255,0.05); }
    }

    .km-domain-icon {
      font-size: 0.88rem;
      width: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    .km-domain-label {
      flex: 1;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ion-color-medium);
    }

    .km-domain-badge {
      font-size: 0.62rem;
      --background: rgba(255,255,255,0.08);
      --color: var(--ion-color-medium);
      border-radius: 10px;
      padding: 1px 6px;
    }

    .km-domain-chevron {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    /* ── Doc item ───────────────────────────────────────────── */
    .km-doc-item {
      --padding-start: calc(16px + var(--indent, 0px));
      --min-height: 50px;
      --background: transparent;
      border-radius: 8px;
      margin: 1px 8px;

      &--active {
        --background: rgba(201,168,76,0.08);
        ion-label h3 { color: #c9a84c; }
      }
    }

    .km-doc-toggle {
      font-size: 0.72rem;
      color: var(--ion-color-medium);
      margin-right: 2px;
      flex-shrink: 0;
    }

    .km-doc-toggle-ph {
      width: 16px;
      display: inline-block;
      flex-shrink: 0;
    }

    .km-doc-icon {
      font-size: 0.95rem;
      color: var(--ion-color-medium);
      margin-right: 4px;
    }

    .km-doc-label {
      h3 {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--ion-text-color);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      p {
        font-size: 0.72rem;
        color: var(--ion-color-medium);
        margin: 2px 0 0;
      }
    }

    .km-doc-wc {
      font-size: 0.68rem;
      color: var(--ion-color-medium);
    }
  `]
})
export class DocsListPage implements OnInit, OnDestroy {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);
  private readonly API = `${environment.apiBase}/docs`;

  docs    = signal<DocSummary[]>([]);
  loading = signal(true);
  activeDocId = signal<string | null>(null);
  searchQuery = '';

  private openDomains = signal<Set<string>>(new Set(DOMAINS.map(d => d.key)));
  private openNodes   = signal<Set<string>>(new Set());
  private routerSub!: Subscription;

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

  flatRows = computed<FlatRow[]>(() => {
    const result: FlatRow[] = [];
    const openDoms = this.openDomains();
    const openNds  = this.openNodes();
    const q = this.searchQuery.toLowerCase();

    for (const domain of DOMAINS) {
      const roots = this.treeByDomain().get(domain.key) ?? [];
      let count = this.docs().filter(d => d.domain === domain.key).length;
      if (q) count = this.docs().filter(d => d.domain === domain.key && d.title.toLowerCase().includes(q)).length;
      const open  = openDoms.has(domain.key);

      result.push({ type: 'domain', ...domain, count, open });

      if (open) {
        this.collectVisible(roots, openNds, result, q);
      }
    }
    return result;
  });

  private collectVisible(nodes: DocNode[], openNds: Set<string>, out: FlatRow[], q: string): void {
    for (const node of nodes) {
      if (q && !node.title.toLowerCase().includes(q)) continue;
      out.push({ type: 'doc', ...node });
      if (node.children.length > 0 && openNds.has(node.id)) {
        this.collectVisible(node.children, openNds, out, q);
      }
    }
  }

  trackRow(row: FlatRow): string {
    return row.type === 'domain' ? `d-${row.key}` : `n-${(row as FlatDoc).id}`;
  }

  ngOnInit(): void {
    this.loadDocs();
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
    this.http.get<{ docs: DocSummary[] }>(`${this.API}?status=all&limit=200`).subscribe({
      next: res => {
        this.docs.set(res.docs ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  onSearch(_e: Event): void {
    this.cdr.markForCheck();
  }

  isNodeOpen(id: string): boolean { return this.openNodes().has(id); }

  toggleDomain(key: string): void {
    this.openDomains.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  toggleNode(id: string, e: Event): void {
    e.preventDefault(); e.stopPropagation();
    this.openNodes.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  openDoc(id: string): void {
    this.activeDocId.set(id);
    this.router.navigate(['/docs', id]);
  }

  newDoc(): void {
    this.http.post<{ id: string }>(this.API, { title: 'Untitled', domain: 'general', doc_type: 'note' })
      .subscribe(({ id }) => {
        this.loadDocs();
        this.router.navigate(['/docs', id]);
      });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  }
}
