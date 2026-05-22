import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudioApiService } from '../../studio-api.service';
import { StudioTemplate, formatLabel } from '../../studio.models';

@Component({
  selector: 'km-studio-template-gallery',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="st-page">
      <div class="st-wrap">
        <div class="st-topbar">
          <a class="st-back" routerLink="/studio">← Studio</a>
        </div>

        <header class="st-head">
          <h1>New Episode</h1>
          <p>Start blank or from a template.</p>
        </header>

        @if (loading()) {
          <div class="st-state">Loading templates…</div>
        } @else {
          <button type="button" class="st-blank" (click)="create(null)" [disabled]="creating()">
            <span class="st-blank-icon">＋</span>
            <span>
              <strong>Blank episode</strong>
              <small>Start from an empty intro section.</small>
            </span>
          </button>

          <div class="st-section-label">Templates</div>

          <div class="st-grid">
            @for (tpl of templates(); track tpl.id) {
              <button type="button" class="st-tpl" (click)="create(tpl.id)" [disabled]="creating()">
                <div class="st-tpl-top">
                  <h3>{{ tpl.name }}</h3>
                  <span class="st-badge">{{ fmt(tpl.format) }}</span>
                </div>
                @if (tpl.description) {
                  <p class="st-tpl-desc">{{ tpl.description }}</p>
                }
                <p class="st-tpl-meta">{{ summary(tpl) }}</p>
                <div class="st-tpl-chips">
                  @for (heading of headings(tpl); track $index) {
                    <span class="st-chip">{{ heading }}</span>
                  }
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .st-page {
      min-height: 100dvh; background: var(--km-bg, #080808);
      color: var(--km-text, rgba(255,255,255,0.92));
      font-family: var(--km-font-body, system-ui, sans-serif); overflow-y: auto;
    }
    .st-wrap { max-width: 760px; margin: 0 auto; padding: 20px 20px 60px; }
    .st-topbar { display: flex; align-items: center; }
    .st-back { color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.85rem; }
    .st-back:hover { color: var(--km-gold, #c9a84c); }

    .st-head { margin: 22px 0 16px; }
    .st-head h1 {
      margin: 0; font-family: var(--km-font-heading, Georgia, serif);
      font-size: 1.7rem; color: var(--km-gold, #c9a84c);
    }
    .st-head p { margin: 6px 0 0; color: rgba(255,255,255,0.5); font-size: 0.9rem; }

    .st-state { padding: 50px 0; text-align: center; color: rgba(255,255,255,0.45); }

    .st-blank {
      display: flex; align-items: center; gap: 14px; width: 100%; text-align: left;
      padding: 16px; border-radius: 12px; cursor: pointer;
      background: rgba(201,168,76,0.08); border: 1px dashed rgba(201,168,76,0.4);
      color: var(--km-text, #fff);
    }
    .st-blank:hover { background: rgba(201,168,76,0.13); }
    .st-blank:disabled { opacity: 0.5; cursor: default; }
    .st-blank-icon { font-size: 1.5rem; color: var(--km-gold, #c9a84c); }
    .st-blank strong { display: block; font-size: 0.95rem; }
    .st-blank small { color: rgba(255,255,255,0.5); font-size: 0.78rem; }

    .st-section-label {
      margin: 22px 0 10px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: rgba(255,255,255,0.4);
    }
    .st-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px; }

    .st-tpl {
      text-align: left; padding: 14px 16px; border-radius: 12px; cursor: pointer;
      background: var(--km-surface, #0d0d0d); border: 1px solid rgba(255,255,255,0.07);
      color: var(--km-text, #fff);
    }
    .st-tpl:hover { border-color: rgba(201,168,76,0.4); }
    .st-tpl:disabled { opacity: 0.5; cursor: default; }
    .st-tpl-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .st-tpl-top h3 { margin: 0; font-size: 0.98rem; font-weight: 600; }
    .st-badge {
      font-size: 0.66rem; padding: 3px 8px; border-radius: 9px; text-transform: capitalize;
      background: rgba(201,168,76,0.16); color: var(--km-gold, #c9a84c);
    }
    .st-tpl-desc { margin: 7px 0 0; font-size: 0.82rem; color: rgba(255,255,255,0.5); }
    .st-tpl-meta {
      margin: 8px 0 0; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: var(--km-gold, #c9a84c);
    }
    .st-tpl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .st-chip {
      padding: 3px 9px; border-radius: 9px; font-size: 0.72rem;
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75);
    }
  `],
})
export class TemplateGalleryComponent implements OnInit {
  private studio = inject(StudioApiService);
  private router = inject(Router);

  readonly fmt = formatLabel;

  templates = signal<StudioTemplate[]>([]);
  loading = signal(true);
  creating = signal(false);

  ngOnInit(): void {
    this.studio.listTemplates().subscribe({
      next: (rows) => { this.templates.set(rows); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  summary(tpl: StudioTemplate): string {
    const people = tpl.structure?.participants?.length ?? 0;
    const sections = tpl.structure?.sections?.length ?? 0;
    const peopleLabel = people === 1 ? '1 person' : `${people} people`;
    const sectionLabel = sections === 1 ? '1 section' : `${sections} sections`;
    return `${peopleLabel} · ${sectionLabel}`;
  }

  headings(tpl: StudioTemplate): string[] {
    return (tpl.structure?.sections ?? []).map((s) => s.heading);
  }

  create(templateRef: string | null): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.studio
      .createEpisode({ title: 'Untitled Episode', template_ref: templateRef ?? undefined })
      .subscribe({
        next: (ep) => this.router.navigate(['/studio', ep.id], { replaceUrl: true }),
        error: () => this.creating.set(false),
      });
  }
}
