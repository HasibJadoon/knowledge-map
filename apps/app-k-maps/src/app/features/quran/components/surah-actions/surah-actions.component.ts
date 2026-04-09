import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ActionIconTileComponent, ActionIconVm } from '../action-icon-tile/action-icon-tile.component';

const S = `width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;

const SVG = {
  study: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  notes: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  worldview: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  vocabulary: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><circle cx="7.5" cy="15.5" r="4.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3"/><path d="M18 5l2 2"/></svg>`,
  review: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>`,
  srs: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><path d="M12 12l1 2.5h2.5l-2 1.5.8 2.5-2.3-1.6-2.3 1.6.8-2.5-2-1.5H11z"/></svg>`,
};

const ACTIONS: ActionIconVm[] = [
  { id: 'study',      label: 'Study',  svgPath: SVG.study,      ariaLabel: 'Study this surah',            color: '#E8C060' },
  { id: 'notes',      label: 'Notes',  svgPath: SVG.notes,      ariaLabel: 'Notes for this surah',        color: '#4DD9A8' },
  { id: 'worldview',  label: 'World',  svgPath: SVG.worldview,  ariaLabel: 'Worldview for this surah',    color: '#6BBAFF' },
  { id: 'vocabulary', label: 'Vocab',  svgPath: SVG.vocabulary, ariaLabel: 'Vocabulary of this surah',    color: '#C084F5' },
  { id: 'review',     label: 'Review', svgPath: SVG.review,     ariaLabel: 'Review this surah',           color: '#FF9F6B' },
  { id: 'srs',        label: 'SRS',    svgPath: SVG.srs,        ariaLabel: 'Spaced repetition for surah', color: '#FF7BAC' },
];

@Component({
  selector: 'app-surah-actions',
  standalone: true,
  imports: [IonicModule, ActionIconTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="surah-actions" (click)="$event.stopPropagation()">
      <div class="surah-actions__divider"></div>
      <div class="surah-actions__tiles">
        @for (action of actions; track action.id) {
          <app-action-icon-tile [config]="action" (tileClick)="navigate(action.id)" />
        }
      </div>
    </div>
  `,
  styles: [`
    .surah-actions { margin-top: 10px; }
    .surah-actions__divider {
      height: 1px;
      background: rgba(255,255,255,0.07);
      margin: 0 0 10px;
    }
    .surah-actions__tiles {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
    }
  `],
})
export class SurahActionsComponent {
  @Input({ required: true }) surahId!: number;

  private readonly router = inject(Router);

  readonly actions = ACTIONS;

  navigate(actionId: string): void {
    const base = ['/quran', 'surah', String(this.surahId)];
    const suffix: Record<string, string> = {
      study: 'study', notes: 'notes', worldview: 'worldview',
      vocabulary: 'vocabulary', review: 'review', srs: 'srs',
    };
    const seg = suffix[actionId];
    if (seg) this.router.navigate([...base, seg]);
  }
}
