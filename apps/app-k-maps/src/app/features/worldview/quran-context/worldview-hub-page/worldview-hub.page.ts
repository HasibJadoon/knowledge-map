import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ActionIconTileComponent, ActionIconVm } from '../../../quran/components/action-icon-tile/action-icon-tile.component';
import { QuranSurahService } from '../../../../shared/services/quran/quran-surah.service';

const S = `width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;

const ACTIONS: ActionIconVm[] = [
  { id: 'nodes',     label: 'Nodes',     svgPath: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-7 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm14 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`, ariaLabel: 'Worldview nodes',     color: '#6BBAFF' },
  { id: 'sources',   label: 'Sources',   svgPath: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, ariaLabel: 'Worldview sources',   color: '#E8C060' },
  { id: 'podcasts',  label: 'Podcasts',  svgPath: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`, ariaLabel: 'Worldview podcasts',  color: '#FF9F6B' },
  { id: 'documents', label: 'Documents', svgPath: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`, ariaLabel: 'Worldview documents', color: '#C084F5' },
  { id: 'notes',     label: 'Notes',     svgPath: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`, ariaLabel: 'Worldview notes',     color: '#4DD9A8' },
  { id: 'links',     label: 'Links',     svgPath: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ${S}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`, ariaLabel: 'Worldview links',     color: '#FF7BAC' },
];

@Component({
  selector: 'app-worldview-hub-page',
  standalone: true,
  imports: [IonicModule, ActionIconTileComponent],
  templateUrl: './worldview-hub.page.html',
  styleUrl: './worldview-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewHubPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly counts = signal<{ nodes: number; sources: number; notes: number; documents: number } | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly actions = ACTIONS;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewHub(id).subscribe({
      next: (r) => { this.counts.set(r.counts); this.loading.set(false); },
      error: () => { this.error.set('Failed to load worldview hub'); this.loading.set(false); },
    });
  }

  navigate(id: string): void {
    this.router.navigate(['/quran', 'surah', this.surahId(), 'worldview', id]);
  }
}
