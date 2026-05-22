import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { StudioApiService } from '../../services/studio-api.service';
import { StudioTemplate, formatLabel } from '../../studio.models';

@Component({
  selector: 'app-template-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/studio" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>New Episode</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="km-tg-center"><ion-spinner name="dots"></ion-spinner></div>
      } @else {
        <button class="km-tg-blank" (click)="create(null)" [disabled]="creating()">
          <ion-icon name="add-outline"></ion-icon>
          <div>
            <h3>Blank episode</h3>
            <p>Start from an empty intro section.</p>
          </div>
        </button>

        <div class="km-tg-heading">Templates</div>

        @for (tpl of templates(); track tpl.id) {
          <ion-card class="km-tg-card" button (click)="create(tpl.id)" [disabled]="creating()">
            <div class="km-tg-card-top">
              <h3>{{ tpl.name }}</h3>
              <ion-badge class="km-tg-badge">{{ fmt(tpl.format) }}</ion-badge>
            </div>
            @if (tpl.description) {
              <p class="km-tg-desc">{{ tpl.description }}</p>
            }
            <p class="km-tg-meta">{{ summary(tpl) }}</p>
            <div class="km-tg-chips">
              @for (heading of headings(tpl); track $index) {
                <span class="km-tg-chip">{{ heading }}</span>
              }
            </div>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    :host { display: block; }
    .km-tg-center { display: flex; justify-content: center; padding: 60px 0; }

    .km-tg-blank {
      display: flex; align-items: center; gap: 12px; width: calc(100% - 24px);
      margin: 14px 12px 4px; padding: 14px; text-align: left;
      background: rgba(201,168,76,0.1); border: 1px dashed rgba(201,168,76,0.4);
      border-radius: 12px; color: var(--ion-text-color);
    }
    .km-tg-blank ion-icon { font-size: 1.6rem; color: #c9a84c; }
    .km-tg-blank h3 { margin: 0; font-size: 0.96rem; font-weight: 600; }
    .km-tg-blank p { margin: 2px 0 0; font-size: 0.78rem; color: var(--ion-color-medium); }

    .km-tg-heading {
      padding: 16px 16px 4px; font-size: 0.66rem; font-weight: 700;
      letter-spacing: 0.09em; text-transform: uppercase; color: var(--ion-color-medium);
    }

    .km-tg-card { margin: 8px 12px; border-radius: 12px; padding: 12px 14px; }
    .km-tg-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .km-tg-card-top h3 { margin: 0; font-size: 0.98rem; font-weight: 600; }
    .km-tg-badge { --background: rgba(201,168,76,0.18); --color: #c9a84c; text-transform: capitalize; }
    .km-tg-desc { margin: 6px 0 0; font-size: 0.82rem; color: var(--ion-color-medium); }
    .km-tg-meta {
      margin: 8px 0 0; font-size: 0.72rem; font-weight: 600; color: #c9a84c;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .km-tg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .km-tg-chip {
      padding: 3px 9px; border-radius: 10px; font-size: 0.72rem;
      background: rgba(255,255,255,0.06); color: var(--ion-text-color);
    }
  `],
})
export class TemplateGalleryPage implements OnInit {
  private studio = inject(StudioApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly fmt = formatLabel;

  templates = signal<StudioTemplate[]>([]);
  loading = signal(true);
  creating = signal(false);

  ngOnInit(): void {
    this.studio.listTemplates().subscribe({
      next: (rows) => { this.templates.set(rows); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
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
        error: () => { this.creating.set(false); this.cdr.markForCheck(); },
      });
  }
}
