import {
  Component, OnInit, AfterViewInit,
  ViewChildren, QueryList, ElementRef,
  inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuranSurahService, WorldviewNodeVm } from '../../../../../shared/services/quran/quran-surah.service';
import { QuranPageShellComponent } from '../../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../../shared/services/quran/quran-gsap.service';

@Component({
  selector: 'km-worldview-nodes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuranPageShellComponent],
  templateUrl: './worldview-nodes.component.html',
  styleUrl: './worldview-nodes.component.scss',
})
export class WorldviewNodesComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(QuranSurahService);
  private gsapSvc = inject(QuranGsapService);

  @ViewChildren('cardEl') cardEls!: QueryList<ElementRef>;

  surahId = signal(0);
  items = signal<WorldviewNodeVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewNodes(id).subscribe({
      next: (r) => { this.items.set(r.nodes); this.loading.set(false); },
      error: () => { this.error.set('Failed to load nodes'); this.loading.set(false); },
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
