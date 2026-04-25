import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import gsap from 'gsap';
import {
  QuranSurahService,
  NearSynonymMemberVm,
  NearSynonymSetPatchVm,
  NearSynonymSetVm,
} from '../../../../shared/services/quran/quran-surah.service';
import { QuranGsapService } from '../../../../shared/services/quran/quran-gsap.service';

@Component({
  selector: 'app-surah-near-synonyms-page',
  standalone: true,
  imports: [IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-near-synonyms.page.html',
  styleUrl: './surah-near-synonyms.page.scss',
})
export class SurahNearSynonymsPage implements OnInit, AfterViewInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc    = inject(QuranSurahService);
  private readonly gsapFx = inject(QuranGsapService);

  @ViewChildren('setCard') cardEls!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('detailPanel') detailPanel?: ElementRef<HTMLElement>;

  readonly surahId  = signal(0);
  readonly sets     = signal<NearSynonymSetVm[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly expanded = signal<string | null>(null);
  readonly editMode = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly editDraft = signal<NearSynonymEditDraft | null>(null);
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

  ngAfterViewInit(): void {
    this.cardEls.changes.subscribe((list: QueryList<ElementRef<HTMLElement>>) => {
      const els = list.toArray().map(e => e.nativeElement);
      if (!els.length) return;
      this.gsapFx.revealCards(els);
      els.forEach(el => this.gsapFx.setupSynonymCardMotion(el));
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
      this.resetEditing();
      return;
    }
    if (this.prefersReducedMotion()) {
      this.expanded.set(null);
      this.resetEditing();
      return;
    }
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      opacity: 0,
      x: 28,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        this.expanded.set(null);
        this.resetEditing();
      },
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

  showMemberDetail(
    set: NearSynonymSetVm,
    member: NearSynonymMemberVm,
    field: 'basic_gloss' | 'basic_gloss_ur' | 'nuance_note' | 'nuance_note_ur' | 'contrast_note' | 'contrast_note_ur',
  ): boolean {
    const value = member[field];
    const normalized = this.normalizeComparable(value);
    if (!normalized) return false;

    const repeatedSetValues = [
      set.set_name,
      set.canonical_en,
      set.canonical_ur,
      set.description_md,
      member.arabic_display,
    ].map(v => this.normalizeComparable(v));

    if (repeatedSetValues.includes(normalized)) return false;

    const memberValues = set.members
      .map(m => this.normalizeComparable(m[field]))
      .filter(Boolean);
    return new Set(memberValues).size !== 1;
  }

  hasMemberDetails(set: NearSynonymSetVm, member: NearSynonymMemberVm): boolean {
    return [
      'basic_gloss',
      'basic_gloss_ur',
      'nuance_note',
      'nuance_note_ur',
      'contrast_note',
      'contrast_note_ur',
    ].some(field => this.showMemberDetail(
      set,
      member,
      field as 'basic_gloss' | 'basic_gloss_ur' | 'nuance_note' | 'nuance_note_ur' | 'contrast_note' | 'contrast_note_ur',
    ));
  }

  hasAnyMemberDetails(set: NearSynonymSetVm): boolean {
    return set.members.some(member => this.hasMemberDetails(set, member));
  }

  startEdit(set: NearSynonymSetVm): void {
    this.saveError.set(null);
    this.editDraft.set(this.createDraft(set));
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.resetEditing();
  }

  updateDraftField(field: keyof Omit<NearSynonymEditDraft, 'members'>, value: string): void {
    const draft = this.editDraft();
    if (!draft) return;
    this.editDraft.set({ ...draft, [field]: value });
  }

  updateMemberDraftField(
    index: number,
    field: keyof Omit<NearSynonymMemberEditDraft, 'id'>,
    value: string,
  ): void {
    const draft = this.editDraft();
    if (!draft) return;
    const members = draft.members.map((member, i) =>
      i === index ? { ...member, [field]: value } : member,
    );
    this.editDraft.set({ ...draft, members });
  }

  saveEdit(set: NearSynonymSetVm): void {
    const draft = this.editDraft();
    if (!draft || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    this.svc.updateNearSynonymSet(set.id, this.toPatch(draft)).subscribe({
      next: (updated) => {
        this.sets.update(sets => sets.map(item => item.id === updated.id ? updated : item));
        this.saving.set(false);
        this.resetEditing();
      },
      error: (e) => {
        this.saving.set(false);
        this.saveError.set(e?.message ?? 'Failed to save near synonym changes');
      },
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

  private normalizeComparable(value: string | null | undefined): string {
    return this.normalizeSearch(value)
      .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
      .replace(/\s+/g, ' ')
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

  private resetEditing(): void {
    this.editMode.set(false);
    this.saving.set(false);
    this.saveError.set(null);
    this.editDraft.set(null);
  }

  private createDraft(set: NearSynonymSetVm): NearSynonymEditDraft {
    return {
      set_name: set.set_name ?? '',
      canonical_en: set.canonical_en ?? '',
      canonical_ar: set.canonical_ar ?? '',
      canonical_ur: set.canonical_ur ?? '',
      description_md: set.description_md === 'TOdo' ? '' : set.description_md ?? '',
      pos_hint: set.pos_hint ?? 'mixed',
      members: set.members.map(member => ({
        id: member.id,
        arabic_display: member.arabic_display ?? '',
        basic_gloss: member.basic_gloss ?? '',
        basic_gloss_ur: member.basic_gloss_ur ?? '',
        nuance_note: member.nuance_note ?? '',
        nuance_note_ur: member.nuance_note_ur ?? '',
        contrast_note: member.contrast_note ?? '',
        contrast_note_ur: member.contrast_note_ur ?? '',
        usage_rule_ur: member.usage_rule_ur ?? '',
        quran_usage_pattern_ur: member.quran_usage_pattern_ur ?? '',
      })),
    };
  }

  private toPatch(draft: NearSynonymEditDraft): NearSynonymSetPatchVm {
    return {
      set_name: draft.set_name,
      canonical_en: draft.canonical_en,
      canonical_ar: draft.canonical_ar,
      canonical_ur: draft.canonical_ur,
      description_md: draft.description_md,
      pos_hint: draft.pos_hint,
      members: draft.members,
    };
  }
}

interface NearSynonymEditDraft {
  set_name: string;
  canonical_en: string;
  canonical_ar: string;
  canonical_ur: string;
  description_md: string;
  pos_hint: string;
  members: NearSynonymMemberEditDraft[];
}

interface NearSynonymMemberEditDraft {
  id: string;
  arabic_display: string;
  basic_gloss: string;
  basic_gloss_ur: string;
  nuance_note: string;
  nuance_note_ur: string;
  contrast_note: string;
  contrast_note_ur: string;
  usage_rule_ur: string;
  quran_usage_pattern_ur: string;
}
