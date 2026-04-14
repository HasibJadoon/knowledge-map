import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface DocSummary {
  id: string;
  title: string;
  doc_type: string;
  domain: string;
  status: string;
  word_count: number;
  updated_at: string;
}

@Component({
  selector: 'km-docs-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="km-docs-layout">
      <aside class="km-docs-sidebar">
        <div class="km-docs-sidebar-header">
          <span class="km-docs-sidebar-title">Documents</span>
          <button class="km-docs-new-btn" (click)="newDoc()">+ New</button>
        </div>
        <div class="km-docs-list">
          @for (doc of docs(); track doc.id) {
            <a class="km-docs-list-item" [routerLink]="['/docs', doc.id]">
              <span class="km-docs-list-title">{{ doc.title || 'Untitled' }}</span>
              <span class="km-docs-list-meta">{{ doc.domain }} · {{ doc.doc_type }}</span>
            </a>
          }
          @if (docs().length === 0 && !loading()) {
            <p class="km-docs-empty">No documents yet. Create your first.</p>
          }
        </div>
      </aside>
      <main class="km-docs-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .km-docs-layout {
      display: flex;
      height: 100vh;
      background: var(--km-bg);
    }
    .km-docs-sidebar {
      width: 260px;
      border-right: 1px solid var(--km-border);
      display: flex;
      flex-direction: column;
      background: var(--km-surface);
    }
    .km-docs-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--km-border);
    }
    .km-docs-sidebar-title {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--km-text-2);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .km-docs-new-btn {
      background: var(--km-gold);
      color: #000;
      border: none;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .km-docs-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }
    .km-docs-list-item {
      display: block;
      padding: 10px 16px;
      cursor: pointer;
      text-decoration: none;
      border-radius: 6px;
      margin: 2px 8px;
      &:hover { background: var(--km-surface-2); }
    }
    .km-docs-list-title {
      display: block;
      font-size: 0.9rem;
      color: var(--km-text);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .km-docs-list-meta {
      display: block;
      font-size: 0.72rem;
      color: var(--km-text-3);
      margin-top: 2px;
    }
    .km-docs-empty {
      padding: 24px 16px;
      color: var(--km-text-3);
      font-size: 0.85rem;
    }
    .km-docs-main {
      flex: 1;
      overflow: hidden;
    }
  `]
})
export class DocsShellComponent implements OnInit {
  private http   = inject(HttpClient);
  private router = inject(Router);

  docs    = signal<DocSummary[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.http.get<{ docs: DocSummary[] }>('/api/docs?status=all&limit=100').subscribe({
      next: res => { this.docs.set(res.docs); this.loading.set(false); },
      error: ()  => { this.loading.set(false); }
    });
  }

  newDoc(): void {
    this.http.post<{ id: string }>('/api/docs', { title: 'Untitled', domain: 'general', doc_type: 'note' })
      .subscribe(({ id }) => this.router.navigate(['/docs', id]));
  }
}
