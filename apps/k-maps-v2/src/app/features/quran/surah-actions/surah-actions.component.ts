import {
  Component, Input, OnInit, AfterViewInit,
  ViewChildren, QueryList, ElementRef,
  inject, ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { ActionIconTileComponent, ActionIconVm } from '../action-icon-tile/action-icon-tile.component';
import { QuranGsapService } from '../shared/quran-gsap.service';

// Inline SVG paths for each action icon
const SVG = {
  // Open book with spine
  study: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>`,

  // Pencil writing on notepad
  notes: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>`,

  // Globe / world
  worldview: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`,

  // Key — unlock word meanings / vocabulary
  vocabulary: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7.5" cy="15.5" r="4.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3"/>
    <path d="M18 5l2 2"/>
  </svg>`,

  // Refresh / circular arrow — review
  review: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </svg>`,

  // Stacked cards with star — SRS
  srs: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
    <path d="M12 12l1 3h3l-2.5 1.8 1 3L12 18l-2.5 1.8 1-3L8 15h3z"/>
  </svg>`,
};

const ACTIONS: ActionIconVm[] = [
  { id: 'study',      label: 'Study',  svgPath: SVG.study,      ariaLabel: 'Study this surah' },
  { id: 'notes',      label: 'Notes',  svgPath: SVG.notes,      ariaLabel: 'Notes for this surah' },
  { id: 'worldview',  label: 'World',  svgPath: SVG.worldview,  ariaLabel: 'Worldview for this surah' },
  { id: 'vocabulary', label: 'Vocab',  svgPath: SVG.vocabulary, ariaLabel: 'Vocabulary of this surah' },
  { id: 'review',     label: 'Review', svgPath: SVG.review,     ariaLabel: 'Review this surah' },
  { id: 'srs',        label: 'SRS',    svgPath: SVG.srs,        ariaLabel: 'Spaced repetition for this surah' },
];

@Component({
  selector: 'km-surah-actions',
  standalone: true,
  imports: [ActionIconTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-actions.component.html',
  styleUrl: './surah-actions.component.scss',
})
export class SurahActionsComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) surahId!: number;

  // Query the host elements of each tile to pass to GSAP
  @ViewChildren(ActionIconTileComponent, { read: ElementRef })
  private tileRefs!: QueryList<ElementRef<HTMLElement>>;

  private readonly router = inject(Router);
  private readonly gsap = inject(QuranGsapService);

  readonly actions = ACTIONS;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const els = this.tileRefs.map((r) => r.nativeElement);
    // Small stagger delay so card entrance animations settle first
    this.gsap.revealIconTiles(els, 0.12);
  }

  navigate(actionId: string): void {
    const base = ['/quran', 'surah', String(this.surahId)];
    const suffix: Record<string, string> = {
      study: 'study',
      notes: 'notes',
      worldview: 'worldview',
      vocabulary: 'vocabulary',
      review: 'review',
      srs: 'srs',
    };
    const seg = suffix[actionId];
    if (seg) this.router.navigate([...base, seg]);
  }
}
