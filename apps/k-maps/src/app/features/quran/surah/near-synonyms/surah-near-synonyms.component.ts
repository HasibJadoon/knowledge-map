import {
  Component, OnInit, AfterViewInit, ViewChildren, QueryList,
  ElementRef, ViewChild, inject, signal, ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  QuranSurahService,
  NearSynonymSetVm,
} from '../../../../shared/services/quran/quran-surah.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../shared/services/quran/quran-gsap.service';

@Component({
  selector: 'km-surah-near-synonyms',
  standalone: true,
  imports: [QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-near-synonyms.component.html',
  styleUrl: './surah-near-synonyms.component.scss',
})
export class SurahNearSynonymsComponent implements OnInit, AfterViewInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(QuranSurahService);
  private gsap   = inject(QuranGsapService);

  @ViewChildren('setCard') cardEls!: QueryList<ElementRef>;
  @ViewChild('detailPanel') detailPanel?: ElementRef<HTMLElement>;

  surahId  = signal(0);
  sets     = signal<NearSynonymSetVm[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  expanded = signal<string | null>(null); // set id currently expanded
  searchQuery = signal('');
  filteredSets = computed(() => {
    const query = this.normalizeSearch(this.searchQuery());
    if (!query) return this.sets();
    return this.sets().filter(set => this.matchesSet(set, query));
  });
  selectedSet = computed(() => {
    const id = this.expanded();
    return id ? this.sets().find(set => set.id === id) ?? null : null;
  });

  ngAfterViewInit(): void {
    this.cardEls.changes.subscribe((list: QueryList<ElementRef>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (els.length) this.gsap.revealOnScroll(els);
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getNearSynonymsBySurah(id).subscribe({
      next: (res) => { this.sets.set(res.sets); this.loading.set(false); },
      error: (e)  => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  toggle(id: string): void {
    if (this.expanded() === id) {
      this.closePanel();
      return;
    }
    this.expanded.set(id);
    this.animatePanelIn();
  }

  closePanel(): void {
    const panel = this.detailPanel?.nativeElement;
    if (!panel) {
      this.expanded.set(null);
      return;
    }
    this.gsap.slideOutSidePanel(panel, () => this.expanded.set(null));
  }

  updateSearch(value: string | null | undefined): void {
    this.searchQuery.set(value ?? '');
  }

  domainLabel(domainId: string | null): string {
    if (!domainId) return '';
    // "SF:NS:AFTERLIFE" → "Afterlife"
    const parts = domainId.split(':');
    const raw = parts[parts.length - 1] ?? '';
    return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  back(): void { this.router.navigate(['/quran']); }

  private animatePanelIn(): void {
    requestAnimationFrame(() => {
      const panel = this.detailPanel?.nativeElement;
      if (panel) this.gsap.slideInSidePanel(panel);
    });
  }

  private matchesSet(set: NearSynonymSetVm, query: string): boolean {
    const memberFields = set.members.reduce<(string | null | undefined)[]>((fields, member) => {
      fields.push(
        member.arabic_display,
        member.basic_gloss,
        member.basic_gloss_ur,
        member.nuance_note,
        member.nuance_note_ur,
        member.contrast_note,
        member.contrast_note_ur,
        member.usage_rule_ur,
        member.quran_usage_pattern_ur,
      );
      return fields;
    }, []);
    const haystack = [
      set.set_name,
      set.canonical_en,
      set.canonical_ar,
      set.canonical_ur,
      set.description_md,
      set.pos_hint,
      ...memberFields,
    ].filter(Boolean).join(' ');
    return this.normalizeSearch(haystack).includes(query);
  }

  private normalizeSearch(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .toLowerCase()
      .trim();
  }
}
