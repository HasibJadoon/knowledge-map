import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { filter, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DocsApiService } from '../../../../shared/services/content/docs-api.service';
import { WorldviewApiService, WvTopic } from '../../../../shared/services/worldview/worldview-api.service';

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
  topic_key: string | null;
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
  loading: boolean;
}

interface FlatDoc extends DocNode {
  type: 'doc';
}

interface FlatSub {
  type: 'subdomain';
  key: string;
  label: string;
  count: number;
  open: boolean;
}

interface FlatTopic {
  type: 'topic';
  key: string;
  label: string;
  count: number;
  open: boolean;
}

type FlatRow = FlatItem | FlatSub | FlatTopic | FlatDoc;

interface DocSearchResult {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: string;
  updated_at: string | null;
  excerpt?: string | null;
}

const DOMAINS = [
  { key: 'general',   label: 'General',   icon: '📝' },
  { key: 'quran',     label: 'Quran',     icon: '📖' },
  { key: 'arabic',    label: 'Arabic',    icon: 'ع' },
  { key: 'worldview', label: 'Worldview', icon: '🌍' },
  { key: 'workspace', label: 'Workspace', icon: '🏛' },
];

/** Worldview docs group by topic taxonomy: sub-domain (wv_topics.topic_domain)
 *  → topic (wv_topics.title) → document. Covers noun + adjectival forms. */
const WV_UNCAT = '__uncat__';
const SUBDOMAIN_LABELS: Record<string, string> = {
  theology: 'Theology', theological: 'Theology',
  ethics: 'Ethics', ethical: 'Ethics',
  anthropology: 'Anthropology', eschatology: 'Eschatology',
  prophethood: 'Prophethood', law: 'Law', cosmology: 'Cosmology',
  psychology: 'Psychology', psychological: 'Psychology',
  sociology: 'Sociology', sociological: 'Sociology',
  history: 'History', historical: 'History',
  philosophy: 'Philosophy', philosophical: 'Philosophy',
  ideology: 'Ideology', ideological: 'Ideology',
  worldview: 'Worldview', modernity: 'Modernity',
  coloniality: 'Coloniality', discernment: 'Discernment', other: 'Other',
};
function titleCaseLabel(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

@Component({
  selector: 'app-docs-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/workbench" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Documents</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="newDoc()" fill="clear">
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" routerLink="/home" routerDirection="root" aria-label="Home">
            <ion-icon slot="icon-only" name="home-outline"></ion-icon>
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

      @if (!loading() && !searchQuery.trim() && allDomainsLoaded() && docs().length === 0) {
        <div class="km-docs-empty">
          <ion-icon name="document-text-outline"></ion-icon>
          <p>No documents yet.</p>
          <ion-button size="small" (click)="newDoc()">Create your first document</ion-button>
        </div>
      }

      @if (!loading() && searchQuery.trim() && !searching() && searchResults().length === 0) {
        <div class="km-docs-empty">
          <ion-icon name="search-outline"></ion-icon>
          <p>No matching documents.</p>
        </div>
      }

      @if (!loading()) {
        <ion-list lines="none" class="km-docs-list">
          @for (row of flatRows(); track trackRow(row)) {

            @if (row.type === 'domain') {
              <div class="km-domain-row" (click)="toggleDomain(row.key)">
                <span class="km-domain-icon">{{ row.icon }}</span>
                <span class="km-domain-label">{{ row.label }}</span>
                @if (row.count > 0) {
                  <ion-badge class="km-domain-badge">{{ row.count }}</ion-badge>
                }
                @if (row.loading) {
                  <ion-spinner name="crescent" class="km-domain-spinner"></ion-spinner>
                } @else {
                  <ion-icon
                    [name]="row.open ? 'chevron-down' : 'chevron-forward'"
                    class="km-domain-chevron">
                  </ion-icon>
                }
              </div>
            }

            @if (row.type === 'subdomain') {
              <div class="km-sub-row" (click)="toggleSub(row.key)">
                <ion-icon
                  [name]="row.open ? 'chevron-down' : 'chevron-forward'"
                  class="km-sub-chevron">
                </ion-icon>
                <span class="km-sub-label">{{ row.label }}</span>
                <ion-badge class="km-domain-badge">{{ row.count }}</ion-badge>
              </div>
            }

            @if (row.type === 'topic') {
              <div class="km-topic-row" (click)="toggleTopic(row.key)">
                <ion-icon
                  [name]="row.open ? 'chevron-down' : 'chevron-forward'"
                  class="km-topic-chevron">
                </ion-icon>
                <span class="km-topic-label">{{ row.label }}</span>
                <ion-badge class="km-topic-badge">{{ row.count }}</ion-badge>
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
      }
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

    .km-domain-spinner {
      width: 14px;
      height: 14px;
      color: var(--ion-color-medium);
    }

    /* ── Worldview sub-domain row ───────────────────────────── */
    .km-sub-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px 6px 24px;
      margin: 2px 8px 0;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
      &:active { background: rgba(255,255,255,0.05); }
    }
    .km-sub-chevron { font-size: 0.7rem; color: var(--ion-color-medium); flex-shrink: 0; }
    .km-sub-label {
      flex: 1;
      font-size: 0.64rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--ion-color-medium);
    }

    /* ── Worldview topic row ────────────────────────────────── */
    .km-topic-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px 7px 38px;
      margin: 1px 8px;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
      &:active { background: rgba(255,255,255,0.05); }
    }
    .km-topic-chevron { font-size: 0.68rem; color: var(--ion-color-medium); flex-shrink: 0; }
    .km-topic-label {
      flex: 1;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ion-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .km-topic-badge {
      font-size: 0.58rem;
      --background: rgba(201,168,76,0.14);
      --color: #c9a84c;
      border-radius: 10px;
      padding: 1px 6px;
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
  private docsApi = inject(DocsApiService);
  private wvApi   = inject(WorldviewApiService);
  private router  = inject(Router);
  private cdr     = inject(ChangeDetectorRef);
  private actionSheet = inject(ActionSheetController);

  docsByDomain = signal<Record<string, DocSummary[]>>({});
  loading = signal(false);
  searching = signal(false);
  activeDocId = signal<string | null>(null);
  searchResults = signal<DocSearchResult[]>([]);
  searchQuery = '';

  private openDomains = signal<Set<string>>(new Set());
  private openNodes   = signal<Set<string>>(new Set());
  private loadingDomains = signal<Set<string>>(new Set());
  private loadedDomains  = signal<Set<string>>(new Set());

  // Worldview topic grouping: taxonomy + collapse state (open by default).
  private topics = signal<WvTopic[]>([]);
  private closedSubs   = signal<Set<string>>(new Set());
  private closedTopics = signal<Set<string>>(new Set());
  private routerSub!: Subscription;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  docs = computed<DocSummary[]>(() => {
    const byDomain = this.docsByDomain();
    const result: DocSummary[] = [];
    for (const domain of DOMAINS) {
      result.push(...(byDomain[domain.key] ?? []));
    }
    return result;
  });

  allDomainsLoaded = computed(() => this.loadedDomains().size === DOMAINS.length);

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
      if (q) {
        count = this.searchResults().filter(d => d.domain === domain.key).length;
      }
      const open  = q ? count > 0 : openDoms.has(domain.key);
      const loading = this.loadingDomains().has(domain.key);

      result.push({ type: 'domain', ...domain, count, open, loading });

      if (open) {
        if (q) {
          for (const row of this.searchResults()) {
            if (row.domain !== domain.key) continue;
            result.push({
              type: 'doc',
              id: row.id,
              title: row.title,
              doc_type: row.doc_type,
              domain: row.domain,
              status: row.status,
              word_count: 0,
              updated_at: row.updated_at ?? '',
              parent_doc_id: null,
              sort_order: 0,
              topic_key: null,
              children: [],
              depth: 0,
            });
          }
        } else if (domain.key === 'worldview') {
          this.collectWorldviewGroups(roots, result);
        } else {
          this.collectVisible(roots, openNds, result, q);
        }
      }
    }
    return result;
  });

  /** Emit worldview docs as sub-domain → topic → doc rows (open by default). */
  private collectWorldviewGroups(roots: DocNode[], out: FlatRow[]): void {
    for (const sub of this.buildWvSubdomains(roots)) {
      const subOpen = this.isSubOpen(sub.key);
      out.push({ type: 'subdomain', key: sub.key, label: sub.label, count: sub.count, open: subOpen });
      if (!subOpen) continue;
      for (const topic of sub.topics) {
        const tk = `${sub.key}/${topic.key}`;
        const tOpen = this.isTopicOpen(tk);
        out.push({ type: 'topic', key: tk, label: topic.title, count: topic.docs.length, open: tOpen });
        if (!tOpen) continue;
        for (const node of topic.docs) out.push({ type: 'doc', ...node, depth: 2 });
      }
    }
  }

  private buildWvSubdomains(roots: DocNode[]): { key: string; label: string; count: number; topics: { key: string; title: string; docs: DocNode[] }[] }[] {
    const topicByKey = new Map(this.topics().map(t => [t.topic_key, t]));
    const subs = new Map<string, Map<string, { key: string; title: string; docs: DocNode[] }>>();
    for (const node of roots) {
      const topic = node.topic_key ? topicByKey.get(node.topic_key) : undefined;
      const subKey = topic ? (topic.topic_domain || 'other') : WV_UNCAT;
      const topicKey = topic ? topic.topic_key : WV_UNCAT;
      const title = topic ? topic.title : 'Uncategorized';
      let byTopic = subs.get(subKey);
      if (!byTopic) { byTopic = new Map(); subs.set(subKey, byTopic); }
      let group = byTopic.get(topicKey);
      if (!group) { group = { key: topicKey, title, docs: [] }; byTopic.set(topicKey, group); }
      group.docs.push(node);
    }
    const result = [...subs.entries()].map(([key, byTopic]) => {
      const topics = [...byTopic.values()].sort((a, b) => a.title.localeCompare(b.title));
      return {
        key,
        label: key === WV_UNCAT ? 'Uncategorized' : (SUBDOMAIN_LABELS[key] ?? titleCaseLabel(key)),
        count: topics.reduce((n, t) => n + t.docs.length, 0),
        topics,
      };
    });
    return result.sort((a, b) =>
      a.key === WV_UNCAT ? 1 : b.key === WV_UNCAT ? -1 : a.label.localeCompare(b.label),
    );
  }

  isSubOpen(key: string): boolean { return !this.closedSubs().has(key); }
  isTopicOpen(key: string): boolean { return !this.closedTopics().has(key); }

  toggleSub(key: string): void {
    this.closedSubs.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  toggleTopic(key: string): void {
    this.closedTopics.update(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

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
    switch (row.type) {
      case 'domain':    return `d-${row.key}`;
      case 'subdomain': return `s-${row.key}`;
      case 'topic':     return `t-${row.key}`;
      default:          return `n-${(row as FlatDoc).id}`;
    }
  }

  ngOnInit(): void {
    this.syncActiveFromUrl();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.syncActiveFromUrl(); this.cdr.markForCheck(); });
    this.wvApi.fetchTopics().subscribe({
      next: (t) => { this.topics.set(t); this.cdr.markForCheck(); },
      error: () => { /* worldview docs fall back to a flat list */ },
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  /**
   * Ionic keeps this page mounted while the editor is pushed on top, so its
   * data would otherwise stay frozen. Re-fetch the already-loaded domains on
   * every entry so renamed or newly created docs show their current title.
   */
  ionViewWillEnter(): void {
    for (const domain of this.loadedDomains()) {
      this.loadDomain(domain, true);
    }
  }

  private syncActiveFromUrl(): void {
    const match = this.router.url.match(/\/docs\/([^/?]+)/);
    this.activeDocId.set(match?.[1] ?? null);
  }

  private loadDomain(domain: string, force = false): void {
    if (!force && (this.loadedDomains().has(domain) || this.loadingDomains().has(domain))) return;

    this.loadingDomains.update(s => {
      const next = new Set(s);
      next.add(domain);
      return next;
    });

    this.docsApi.listDocs(domain).subscribe({
      next: docs => {
        this.docsByDomain.update(current => ({ ...current, [domain]: docs }));
        this.loadedDomains.update(s => {
          const next = new Set(s);
          next.add(domain);
          return next;
        });
        this.loadingDomains.update(s => {
          const next = new Set(s);
          next.delete(domain);
          return next;
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDomains.update(s => {
          const next = new Set(s);
          next.delete(domain);
          return next;
        });
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(_e: Event): void {
    const q = this.searchQuery.trim();
    if (this.searchTimer) clearTimeout(this.searchTimer);

    if (!q) {
      this.searching.set(false);
      this.searchResults.set([]);
      this.cdr.markForCheck();
      return;
    }

    this.searching.set(true);
    this.searchTimer = setTimeout(() => {
      this.docsApi.searchDocs(q).subscribe({
        next: results => {
          this.searchResults.set(results);
          this.searching.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.searchResults.set([]);
          this.searching.set(false);
          this.cdr.markForCheck();
        }
      });
    }, 120);
    this.cdr.markForCheck();
  }

  isNodeOpen(id: string): boolean { return this.openNodes().has(id); }

  toggleDomain(key: string): void {
    const wasOpen = this.openDomains().has(key);
    this.openDomains.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
    const willBeOpen = !wasOpen;
    if (willBeOpen && !this.searchQuery.trim()) {
      this.loadDomain(key);
    }
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

  async newDoc(): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'New document in…',
      buttons: [
        ...DOMAINS.map(domain => ({
          text: `${domain.icon}  ${domain.label}`,
          handler: () => { this.createInDomain(domain.key); return true; },
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private createInDomain(domain: string): void {
    this.docsApi.createDoc({ title: 'Untitled', domain, doc_type: 'note' })
      .subscribe(({ id }) => {
        this.loadDomain(domain, true);
        this.openDomains.update(s => {
          const next = new Set(s);
          next.add(domain);
          return next;
        });
        this.router.navigate(['/docs', id]);
      });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  }
}
