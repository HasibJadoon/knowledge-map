import {
  Component, OnInit, AfterViewInit,
  ViewChildren, QueryList, ElementRef,
  inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { SurahModulesService, WorldviewNoteVm } from '../../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../shared/services/quran-gsap.service';

@Component({
  selector: 'km-worldview-notes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuranPageShellComponent, SlicePipe],
  templateUrl: './worldview-notes.component.html',
  styleUrl: './worldview-notes.component.scss',
})
export class WorldviewNotesComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef>;

  surahId = signal(0);
  items = signal<WorldviewNoteVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewNotes(id).subscribe({
      next: (r) => { this.items.set(r.notes); this.loading.set(false); },
      error: () => { this.error.set('Failed to load notes'); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    this.cardEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map((e: ElementRef) => e.nativeElement);
      if (els.length) this.gsapSvc.revealOnScroll(els);
    });
  }

  goBack(): void {
    this.router.navigate(['/quran/surah', this.surahId(), 'worldview']);
  }
}
