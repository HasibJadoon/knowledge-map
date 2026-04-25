import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import gsap from 'gsap';
import {
  QuranSurahService,
  NearSynonymSetVm,
} from '../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-surah-near-synonyms-page',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-near-synonyms.page.html',
  styleUrl: './surah-near-synonyms.page.scss',
})
export class SurahNearSynonymsPage implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc    = inject(QuranSurahService);

  @ViewChild('detailPanel') detailPanel?: ElementRef<HTMLElement>;

  readonly surahId  = signal(0);
  readonly sets     = signal<NearSynonymSetVm[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly expanded = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly filteredSets = computed(() => {
    const query = this.normalizeSearch(this.searchQuery());
    if (!query) return this.sets();
    return this.sets().filter(set => this.matchesSet(set, query));
  });
  readonly selectedSet = computed(() => {
    const id = this.expanded();
    return id ? this.sets().find(set => set.id === id) ?? null : null;
  });

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
    if (this.prefersReducedMotion()) {
      this.expanded.set(null);
      return;
    }
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      opacity: 0,
      x: 28,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => this.expanded.set(null),
    });
  }

  updateSearch(value: string | null | undefined): void {
    this.searchQuery.set(value ?? '');
  }

  domainLabel(domainId: string | null): string {
    if (!domainId) return '';
    const parts = domainId.split(':');
    const raw = parts[parts.length - 1] ?? '';
    return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
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

  private animatePanelIn(): void {
    requestAnimationFrame(() => {
      const panel = this.detailPanel?.nativeElement;
      if (!panel) return;
      const members = Array.from(panel.querySelectorAll<HTMLElement>('.syn-member'));
      gsap.killTweensOf([panel, ...members]);
      if (this.prefersReducedMotion()) {
        gsap.set(panel, { opacity: 1, x: 0 });
        gsap.set(members, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        panel,
        { opacity: 0, x: 34 },
        { opacity: 1, x: 0, duration: 0.34, ease: 'expo.out', clearProps: 'transform' },
      );
      if (members.length) {
        gsap.fromTo(
          members,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.28, delay: 0.1, stagger: 0.035, ease: 'power2.out', clearProps: 'transform' },
        );
      }
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
