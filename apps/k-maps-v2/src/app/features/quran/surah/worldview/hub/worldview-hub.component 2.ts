import {
  Component, OnInit, AfterViewInit,
  ViewChildren, QueryList, ElementRef,
  inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SurahModulesService, WorldviewHubResponse } from '../../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../shared/quran-gsap.service';
import { ActionIconTileComponent, ActionIconVm } from '../../../action-icon-tile/action-icon-tile.component';

const SVG_NODES = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-7 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm14 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 14l7-3m0 0l7 3"/></svg>`;
const SVG_SOURCES = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
const SVG_PODCASTS = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const SVG_DOCUMENTS = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
const SVG_NOTES = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const SVG_LINKS = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

const ACTIONS: ActionIconVm[] = [
  { id: 'worldview/nodes',     label: 'Nodes',     svgPath: SVG_NODES,     ariaLabel: 'Worldview nodes' },
  { id: 'worldview/sources',   label: 'Sources',   svgPath: SVG_SOURCES,   ariaLabel: 'Worldview sources' },
  { id: 'worldview/podcasts',  label: 'Podcasts',  svgPath: SVG_PODCASTS,  ariaLabel: 'Worldview podcasts' },
  { id: 'worldview/documents', label: 'Documents', svgPath: SVG_DOCUMENTS, ariaLabel: 'Worldview documents' },
  { id: 'worldview/notes',     label: 'Notes',     svgPath: SVG_NOTES,     ariaLabel: 'Worldview notes' },
  { id: 'worldview/links',     label: 'Links',     svgPath: SVG_LINKS,     ariaLabel: 'Worldview links' },
];

@Component({
  selector: 'km-worldview-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuranPageShellComponent, ActionIconTileComponent],
  templateUrl: './worldview-hub.component.html',
  styleUrl: './worldview-hub.component.scss',
})
export class WorldviewHubComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren(ActionIconTileComponent, { read: ElementRef })
  tileEls!: QueryList<ElementRef>;

  surahId = signal(0);
  counts = signal<WorldviewHubResponse['counts'] | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly actions = ACTIONS;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewHub(id).subscribe({
      next: (r) => { this.counts.set(r.counts); this.loading.set(false); },
      error: () => { this.error.set('Failed to load worldview hub'); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    const initial = this.tileEls.toArray().map((e: ElementRef) => e.nativeElement);
    if (initial.length) this.gsapSvc.revealIconTiles(initial, 0.1);

    this.tileEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map((e: ElementRef) => e.nativeElement);
      if (els.length) this.gsapSvc.revealIconTiles(els, 0.1);
    });
  }

  navigate(id: string): void {
    this.router.navigate(['/quran/surah', this.surahId(), id]);
  }

  goBack(): void {
    this.router.navigate(['/quran/surah', this.surahId()]);
  }
}
