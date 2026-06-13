import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit,
  computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DocsApiService } from '../../../../shared/services/content/docs-api.service';
import { WorldviewApiService, WvTopic } from '../../../../shared/services/worldview/worldview-api.service';
import { DocumentSummary } from '../../../../shared/models/content/document.model';

const WV_DOMAIN = 'worldview';
const UNCATEGORIZED = '__uncat__';

/** Friendly labels for the wv_topics.topic_domain enum (sub-domain layer). */
const SUBDOMAIN_LABELS: Record<string, string> = {
  theology: 'Theology',
  ethics: 'Ethics',
  anthropology: 'Anthropology',
  eschatology: 'Eschatology',
  prophethood: 'Prophethood',
  law: 'Law',
  cosmology: 'Cosmology',
  psychology: 'Psychology',
  sociology: 'Sociology',
  history: 'History',
  worldview: 'Worldview',
  modernity: 'Modernity',
  coloniality: 'Coloniality',
  discernment: 'Discernment',
  other: 'Other',
};

interface DocRow {
  id: string;
  title: string;
  doc_type: string;
  updated_at: string;
}

interface TopicGroup {
  key: string;     // topic_key, or UNCATEGORIZED
  title: string;
  docs: DocRow[];
}

interface SubdomainGroup {
  key: string;     // topic_domain, or UNCATEGORIZED
  label: string;
  topics: TopicGroup[];
  count: number;
}

@Component({
  selector: 'app-worldview-docs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
  template: `
    <ion-header translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/worldview" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Documents</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="newDoc()" fill="clear" aria-label="New document">
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" routerLink="/home" routerDirection="root" aria-label="Home">
            <ion-icon slot="icon-only" name="home-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Search worldview documents…"
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          [debounce]="150">
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="km-docs-loading"><ion-spinner name="dots"></ion-spinner></div>
      }

      @if (!loading() && error()) {
        <div class="km-docs-empty">
          <ion-icon name="cloud-offline-outline"></ion-icon>
          <p>{{ error() }}</p>
        </div>
      }

      @if (!loading() && !error() && tree().length === 0) {
        <div class="km-docs-empty">
          <ion-icon name="document-text-outline"></ion-icon>
          <p>{{ searchQuery.trim() ? 'No matching documents.' : 'No worldview documents yet.' }}</p>
          @if (!searchQuery.trim()) {
            <ion-button size="small" (click)="newDoc()">Create your first document</ion-button>
          }
        </div>
      }

      @if (!loading() && !error()) {
        <ion-list lines="none" class="km-docs-list">
          @for (sub of tree(); track sub.key) {

            <!-- Sub-domain (topic_domain) -->
            <div class="km-domain-row" (click)="toggleSub(sub.key)">
              <span class="km-domain-label">{{ sub.label }}</span>
              <ion-badge class="km-domain-badge">{{ sub.count }}</ion-badge>
              <ion-icon
                [name]="isSubOpen(sub.key) ? 'chevron-down' : 'chevron-forward'"
                class="km-domain-chevron">
              </ion-icon>
            </div>

            @if (isSubOpen(sub.key)) {
              @for (topic of sub.topics; track topic.key) {

                <!-- Topic -->
                <div class="km-topic-row" (click)="toggleTopic(sub.key, topic.key)">
                  <ion-icon
                    [name]="isTopicOpen(sub.key, topic.key) ? 'chevron-down' : 'chevron-forward'"
                    class="km-topic-chevron">
                  </ion-icon>
                  <span class="km-topic-label">{{ topic.title }}</span>
                  <ion-badge class="km-topic-badge">{{ topic.docs.length }}</ion-badge>
                </div>

                @if (isTopicOpen(sub.key, topic.key)) {
                  @for (doc of topic.docs; track doc.id) {
                    <ion-item button detail="false" class="km-doc-item" (click)="openDoc(doc.id)">
                      <ion-icon slot="start" class="km-doc-icon" name="document-text"></ion-icon>
                      <ion-label class="km-doc-label">
                        <h3>{{ doc.title || 'Untitled' }}</h3>
                        <p>{{ doc.doc_type }} · {{ formatDate(doc.updated_at) }}</p>
                      </ion-label>
                    </ion-item>
                  }
                }
              }
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

    .km-docs-loading { display: flex; justify-content: center; padding: 60px 0; }

    .km-docs-empty {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 24px; color: var(--ion-color-medium); text-align: center;
      ion-icon { font-size: 3rem; opacity: 0.4; }
      p { margin: 0; font-size: 0.9rem; }
    }

    .km-docs-list { padding: 4px 0 80px; }

    /* ── Sub-domain row ─────────────────────────────────────── */
    .km-domain-row {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px 8px; margin: 8px 8px 2px;
      border-radius: 8px; cursor: pointer; user-select: none;
      &:active { background: rgba(255,255,255,0.05); }
    }
    .km-domain-label {
      flex: 1; font-size: 0.68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--ion-color-medium);
    }
    .km-domain-badge {
      font-size: 0.62rem; --background: rgba(255,255,255,0.08);
      --color: var(--ion-color-medium); border-radius: 10px; padding: 1px 6px;
    }
    .km-domain-chevron { font-size: 0.75rem; color: var(--ion-color-medium); }

    /* ── Topic row ──────────────────────────────────────────── */
    .km-topic-row {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px 8px 26px; margin: 1px 8px;
      border-radius: 8px; cursor: pointer; user-select: none;
      &:active { background: rgba(255,255,255,0.05); }
    }
    .km-topic-chevron { font-size: 0.72rem; color: var(--ion-color-medium); flex-shrink: 0; }
    .km-topic-label {
      flex: 1; font-size: 0.84rem; font-weight: 600;
      color: var(--ion-text-color);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .km-topic-badge {
      font-size: 0.6rem; --background: rgba(201,168,76,0.14);
      --color: #c9a84c; border-radius: 10px; padding: 1px 6px;
    }

    /* ── Doc item ───────────────────────────────────────────── */
    .km-doc-item {
      --padding-start: 40px; --min-height: 48px; --background: transparent;
      border-radius: 8px; margin: 1px 8px;
    }
    .km-doc-icon { font-size: 0.95rem; color: var(--ion-color-medium); margin-right: 4px; }
    .km-doc-label {
      h3 {
        font-size: 0.88rem; font-weight: 500; color: var(--ion-text-color); margin: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      p { font-size: 0.72rem; color: var(--ion-color-medium); margin: 2px 0 0; }
    }
  `],
})
export class WorldviewDocsPage implements OnInit {
  private docsApi = inject(DocsApiService);
  private wvApi   = inject(WorldviewApiService);
  private router  = inject(Router);
  private cdr     = inject(ChangeDetectorRef);
  private actionSheet = inject(ActionSheetController);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  searchQuery = '';

  private readonly topics = signal<WvTopic[]>([]);
  private readonly docs = signal<DocumentSummary[]>([]);
  private readonly query = signal('');

  private readonly openSubs = signal<Set<string>>(new Set());
  private readonly openTopics = signal<Set<string>>(new Set());

  /** Build the sub-domain → topic → doc tree from topics + worldview docs. */
  readonly tree = computed<SubdomainGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    const topicByKey = new Map<string, WvTopic>();
    for (const t of this.topics()) topicByKey.set(t.topic_key, t);

    // subdomain key → (topic key → group)
    const subs = new Map<string, Map<string, TopicGroup>>();
    const ensureTopic = (subKey: string, topicKey: string, title: string): TopicGroup => {
      let bySub = subs.get(subKey);
      if (!bySub) { bySub = new Map(); subs.set(subKey, bySub); }
      let group = bySub.get(topicKey);
      if (!group) { group = { key: topicKey, title, docs: [] }; bySub.set(topicKey, group); }
      return group;
    };

    for (const doc of this.docs()) {
      if (q && !doc.title.toLowerCase().includes(q)) continue;
      const topic = doc.topic_key ? topicByKey.get(doc.topic_key) : undefined;
      const subKey = topic ? (topic.topic_domain || 'other') : UNCATEGORIZED;
      const topicKey = topic ? topic.topic_key : UNCATEGORIZED;
      const title = topic ? topic.title : 'Uncategorized';
      ensureTopic(subKey, topicKey, title).docs.push({
        id: doc.id, title: doc.title, doc_type: doc.doc_type, updated_at: doc.updated_at,
      });
    }

    const result: SubdomainGroup[] = [];
    for (const [subKey, byTopic] of subs) {
      const topics = [...byTopic.values()].sort((a, b) => a.title.localeCompare(b.title));
      const count = topics.reduce((n, t) => n + t.docs.length, 0);
      result.push({
        key: subKey,
        label: subKey === UNCATEGORIZED ? 'Uncategorized' : (SUBDOMAIN_LABELS[subKey] ?? titleCase(subKey)),
        topics,
        count,
      });
    }
    // Known sub-domains alphabetical; Uncategorized always last.
    return result.sort((a, b) => {
      if (a.key === UNCATEGORIZED) return 1;
      if (b.key === UNCATEGORIZED) return -1;
      return a.label.localeCompare(b.label);
    });
  });

  ngOnInit(): void {
    forkJoin({
      topics: this.wvApi.fetchTopics(),
      docs: this.docsApi.listDocs(WV_DOMAIN),
    }).subscribe({
      next: ({ topics, docs }) => {
        this.topics.set(topics);
        this.docs.set(docs);
        // Open every sub-domain by default for an at-a-glance overview.
        this.openSubs.set(new Set(this.tree().map((s) => s.key)));
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load documents.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Re-fetch worldview docs on re-entry so new/renamed docs stay current. */
  ionViewWillEnter(): void {
    if (this.loading()) return;
    this.docsApi.listDocs(WV_DOMAIN).subscribe((docs) => {
      this.docs.set(docs);
      this.cdr.markForCheck();
    });
  }

  onSearch(): void {
    this.query.set(this.searchQuery);
    this.cdr.markForCheck();
  }

  isSubOpen(key: string): boolean {
    return this.query().trim().length > 0 || this.openSubs().has(key);
  }

  isTopicOpen(subKey: string, topicKey: string): boolean {
    return this.query().trim().length > 0 || this.openTopics().has(`${subKey}/${topicKey}`);
  }

  toggleSub(key: string): void {
    this.openSubs.update((s) => toggle(s, key));
  }

  toggleTopic(subKey: string, topicKey: string): void {
    this.openTopics.update((s) => toggle(s, `${subKey}/${topicKey}`));
  }

  openDoc(id: string): void {
    this.router.navigate(['/docs', id]);
  }

  async newDoc(): Promise<void> {
    const topics = this.topics();
    const sheet = await this.actionSheet.create({
      header: 'New worldview document in…',
      buttons: [
        { text: 'No topic', handler: () => { this.createDoc(null); return true; } },
        ...topics.map((t) => ({
          text: t.title,
          handler: () => { this.createDoc(t.topic_key); return true; },
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private createDoc(topicKey: string | null): void {
    this.docsApi
      .createDoc({ title: 'Untitled', domain: WV_DOMAIN, doc_type: 'note', topic_key: topicKey })
      .subscribe(({ id }) => this.router.navigate(['/docs', id]));
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  }
}

function toggle(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  next.has(key) ? next.delete(key) : next.add(key);
  return next;
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
