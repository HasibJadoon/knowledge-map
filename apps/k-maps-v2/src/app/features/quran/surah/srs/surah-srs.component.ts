import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgClass, TitleCasePipe } from '@angular/common';
import { SurahModulesService, SrsCardVm } from '../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../shared/services/quran-gsap.service';

type SrsFilter = 'due' | 'upcoming' | 'all' | 'suspended';

@Component({
  selector: 'km-surah-srs',
  standalone: true,
  imports: [NgClass, TitleCasePipe, QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-srs.component.html',
  styleUrl: './surah-srs.component.scss',
})
export class SurahSrsComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('srsEl') srsEls!: QueryList<ElementRef>;

  surahId = signal(0);
  items = signal<SrsCardVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeFilter = signal<SrsFilter>('due');

  readonly filters: SrsFilter[] = ['due', 'upcoming', 'all', 'suspended'];

  ngAfterViewInit(): void {
    this.srsEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsapSvc.revealOnScroll(els);
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.load('due');
  }

  load(filter: SrsFilter): void {
    this.activeFilter.set(filter);
    this.loading.set(true);
    this.svc.getSurahSrs(this.surahId(), filter).subscribe({
      next: (res) => { this.items.set(res.items); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  back(): void { this.router.navigate(['/quran']); }

  daysUntil(item: SrsCardVm): string {
    if (!item.due_at) return '';
    const diff = Math.ceil((new Date(item.due_at).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    return `In ${diff}d`;
  }
}
