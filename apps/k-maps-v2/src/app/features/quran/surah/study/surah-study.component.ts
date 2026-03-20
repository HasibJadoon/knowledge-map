import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SurahModulesService, UnitGridItemVm } from '../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../shared/quran-gsap.service';

@Component({
  selector: 'km-surah-study',
  standalone: true,
  imports: [QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-study.component.html',
  styleUrl: './surah-study.component.scss',
})
export class SurahStudyComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef>;

  surahId = signal(0);
  units = signal<UnitGridItemVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getSurahLessonGrid(id).subscribe({
      next: (res) => { this.units.set(res.units); this.loading.set(false); },
      error: () => { this.error.set('Failed to load lessons'); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    this.cardEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsapSvc.revealCards(els, 0.1);
    });
  }

  openUnit(unit: UnitGridItemVm): void {
    this.router.navigate(['/quran', 'lesson', unit.unit_id]);
  }

  back(): void { this.router.navigate(['/quran']); }

  ayahRange(u: UnitGridItemVm): string {
    if (!u.ayah_from) return u.start_ref ?? '';
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${this.surahId()}:${u.ayah_from}–${u.ayah_to}`
      : `${this.surahId()}:${u.ayah_from}`;
  }
}
