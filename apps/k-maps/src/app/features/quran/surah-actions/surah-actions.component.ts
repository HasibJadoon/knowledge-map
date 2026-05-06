import {
  Component, Input,
  inject, ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { ActionIconTileComponent, ActionIconVm } from '../action-icon-tile/action-icon-tile.component';

// stroke attrs must live on <svg> itself — Angular encapsulation doesn't pierce innerHTML
const S = `width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;

const SVG = {
  study: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>`,

  notes: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}>
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>`,

  worldview: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`,

  // Annotated-text icon: syntax bracket over two text lines with a diacritic dot
  // — represents Ihrab, morphology, balagha and the layered Arabic linguistic sciences
  arabic: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}>
    <path d="M5 9 C5 6 8 5 12 5 C16 5 19 6 19 9"/>
    <circle cx="12" cy="3.5" r="1.5" fill="currentColor" stroke="none"/>
    <line x1="3" y1="13" x2="21" y2="13"/>
    <line x1="3" y1="18" x2="15" y2="18"/>
  </svg>`,

  review: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}>
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </svg>`,

  srs: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
    <path d="M12 12l1 2.5h2.5l-2 1.5.8 2.5-2.3-1.6-2.3 1.6.8-2.5-2-1.5H11z"/>
  </svg>`,

};

const ACTIONS: ActionIconVm[] = [
  { id: 'vocabulary', label: 'Ling',   svgPath: SVG.arabic,     ariaLabel: 'Linguistics for this surah',       color: '#C084F5' }, // bright purple — first, before Study
  { id: 'study',      label: 'Study',  svgPath: SVG.study,      ariaLabel: 'Study this surah',                 color: '#E8C060' }, // bright gold
  { id: 'notes',      label: 'Notes',  svgPath: SVG.notes,      ariaLabel: 'Notes for this surah',             color: '#4DD9A8' }, // bright teal
  { id: 'worldview',  label: 'World',  svgPath: SVG.worldview,  ariaLabel: 'Worldview for this surah',         color: '#6BBAFF' }, // bright blue
  { id: 'review',     label: 'Review', svgPath: SVG.review,     ariaLabel: 'Review this surah',                color: '#FF9F6B' }, // bright orange
  { id: 'srs',        label: 'SRS',    svgPath: SVG.srs,        ariaLabel: 'Spaced repetition for this surah', color: '#FF7BAC' }, // bright rose
];

@Component({
  selector: 'km-surah-actions',
  standalone: true,
  imports: [ActionIconTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-actions.component.html',
  styleUrl: './surah-actions.component.scss',
})
export class SurahActionsComponent {
  @Input({ required: true }) surahId!: number;

  private readonly router = inject(Router);

  readonly actions = ACTIONS;

  navigate(actionId: string): void {
    const base = ['/quran', 'sura', String(this.surahId)];
    const suffix: Record<string, string> = {
      study: 'study', notes: 'notes', worldview: 'worldview',
      vocabulary: 'linguistics', review: 'review', srs: 'srs',
    };
    const seg = suffix[actionId];
    if (seg) this.router.navigate([...base, seg]);
  }
}
