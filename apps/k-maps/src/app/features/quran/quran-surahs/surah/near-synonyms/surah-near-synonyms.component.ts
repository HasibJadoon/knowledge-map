import {
  Component, OnInit, AfterViewInit, ViewChildren, QueryList,
  ElementRef, ViewChild, inject, signal, ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  QuranSurahService,
  NearSynonymMemberVm,
  NearSynonymSetPatchVm,
  NearSynonymSetVm,
} from '../../../../../shared/services/quran/quran-surah.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../../../../shared/services/quran/quran-gsap.service';

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
  editMode = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  editDraft = signal<NearSynonymEditDraft | null>(null);
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
      if (!els.length) return;
      this.gsap.revealOnScroll(els);
      els.forEach(el => this.gsap.setupSynonymCardMotion(el));
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
    this.gsap.slideOutSidePanel(panel, () => {
      this.expanded.set(null);
      this.resetEditing();
    });
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

  private normalizeComparable(value: string | null | undefined): string {
    return this.normalizeSearch(value)
      .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
