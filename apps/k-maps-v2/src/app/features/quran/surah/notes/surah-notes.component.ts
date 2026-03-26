import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { SurahModulesService, NoteListItemVm } from '../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../shared/services/quran-gsap.service';

@Component({
  selector: 'km-surah-notes',
  standalone: true,
  imports: [QuranPageShellComponent, SlicePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-notes.component.html',
  styleUrl: './surah-notes.component.scss',
})
export class SurahNotesComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('noteEl') noteEls!: QueryList<ElementRef>;

  surahId = signal(0);
  notes = signal<NoteListItemVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.noteEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsapSvc.revealOnScroll(els);
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getSurahNotes(id).subscribe({
      next: (res) => { this.notes.set(res.notes); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  back(): void { this.router.navigate(['/quran']); }

  excerpt(note: NoteListItemVm): string {
    return (note.body_md ?? '').slice(0, 120).replace(/[#*`]/g, '') || '—';
  }
}
