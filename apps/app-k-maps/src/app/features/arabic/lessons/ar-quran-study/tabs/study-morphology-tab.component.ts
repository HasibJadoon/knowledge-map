import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TargetedNotesModalService } from '../../../../../shared/targeting/targeted-notes-modal.service';
import { buildTaskTargetSafe } from '../../../../../shared/targeting/targeting-builders';
import { TargetRef, makeWordTarget } from '../../../../../shared/targeting/targeting.models';

import { StudyMorphologyItem } from '../ar-quran-study.facade';
import {
  QuranLexiconBundle,
  QuranLexiconDataService,
  QuranLexiconEvidenceRow,
  QuranLexiconMorphologyLink,
  QuranLexiconMorphologyPayload,
  QuranLexiconSynonymWord,
} from '../services/quran-lexicon-data.service';

type MorphologyDetailTab = 'lexicon' | 'morphology' | 'evidence';
type WordLocationParts = {
  surah: number | null;
  ayah: number | null;
  tokenIndex: number | null;
};

type MorphologySelection = {
  text: string;
  location: string;
  surah: number | null;
  ayah: number | null;
  tokenIndex: number | null;
};

type MorphologyField = {
  id: string;
  label: string;
  value: string;
  arabic?: boolean;
};

@Component({
  selector: 'app-study-morphology-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './study-morphology-tab.component.html',
})
export class StudyMorphologyTabComponent implements OnChanges {
  private readonly lexiconData = inject(QuranLexiconDataService);
  private readonly targetedNotesModal = inject(TargetedNotesModalService);

  @Input() nouns: StudyMorphologyItem[] = [];
  @Input() verbs: StudyMorphologyItem[] = [];
  @Input() morphologyItems: Array<Record<string, unknown>> = [];
  @Input() lexiconMorphologyItems: Array<Record<string, unknown>> = [];
  @Input() evidenceItems: Array<Record<string, unknown>> = [];
  @Input() unitId = '';
  @Input() rangeRef = '';

  isMorphologyModalOpen = false;
  activeMorphologyDetailTab: MorphologyDetailTab = 'lexicon';
  selectedMorphologyItem: StudyMorphologyItem | null = null;
  taskTarget: TargetRef | null = null;
  activeWordNoteTarget: TargetRef | null = null;

  remoteLoading = false;
  remoteError = '';
  resolvedLexiconId = '';

  private selectedMorphologyRecord: Record<string, unknown> | null = null;
  private selectedLinkRecord: Record<string, unknown> | null = null;
  private selectedEvidenceRecords: Array<Record<string, unknown>> = [];
  private remoteBundle: QuranLexiconBundle | null = null;
  private remoteLexiconId = '';
  private remoteSequence = 0;

  private readonly arabicDiacriticsRe = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  private readonly arabicTatweelRe = /\u0640/g;
  private readonly arabicNonLettersRe = /[^\u0621-\u063A\u0641-\u064A]/g;
  private readonly arabicScriptRe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unitId'] || changes['rangeRef']) {
      this.taskTarget = this.buildTaskTarget();
    }

    if (!this.selectedMorphologyItem) return;
    if (changes['morphologyItems'] || changes['lexiconMorphologyItems'] || changes['evidenceItems']) {
      this.recomputeSelectionDetails();
    }
  }

  openMorphologyDetails(item: StudyMorphologyItem): void {
    this.selectedMorphologyItem = item;
    this.activeWordNoteTarget = this.buildWordTarget(item);
    this.activeMorphologyDetailTab = 'lexicon';
    this.isMorphologyModalOpen = true;
    this.recomputeSelectionDetails();
  }

  async openWordNotesModal(): Promise<void> {
    if (!this.activeWordNoteTarget) return;

    const subtitle = [this.activeWord, this.activeLocation]
      .map((value) => value.trim())
      .filter((value) => value && value !== '—')
      .join(' • ');

    await this.targetedNotesModal.open({
      target: this.activeWordNoteTarget,
      title: 'Word Notes',
      subtitle: subtitle || 'Word target',
      placeholder: 'Add a note for this word...',
    });
  }

  closeMorphologyDetails(): void {
    this.isMorphologyModalOpen = false;
    this.selectedMorphologyItem = null;
    this.activeWordNoteTarget = null;
    this.activeMorphologyDetailTab = 'lexicon';
    this.selectedMorphologyRecord = null;
    this.selectedLinkRecord = null;
    this.selectedEvidenceRecords = [];
    this.resolvedLexiconId = '';
    this.clearRemoteState();
  }

  onMorphologyModalDismiss(): void {
    this.closeMorphologyDetails();
  }

  onMorphologyDetailTabChange(event: Event): void {
    const value = (event as CustomEvent<{ value?: string | null }>).detail?.value;
    if (value === 'lexicon' || value === 'morphology' || value === 'evidence') {
      this.activeMorphologyDetailTab = value;
    }
  }

  get activeWord(): string {
    return this.textValue(this.selectedMorphologyItem?.word) || '—';
  }

  get activeLocation(): string {
    return this.textValue(this.selectedMorphologyItem?.location) || '—';
  }

  get activePos(): string {
    return this.posValue;
  }

  get primaryMeaning(): string {
    const explicit = this.meaningPrimary;
    if (explicit) return explicit;

    const fallback = this.textValue(this.selectedMorphologyItem?.gloss);
    if (fallback) return fallback;

    return '—';
  }

  get meaningList(): string[] {
    const values: string[] = [];
    const primary = this.primaryMeaning;
    if (primary && primary !== '—') values.push(primary);

    for (const entry of this.meaningAlternatives) {
      const value = entry.trim();
      if (value) values.push(value);
    }

    const glossFallback = this.textValue(this.selectedMorphologyItem?.gloss);
    for (const token of this.parseMeaningTokens(glossFallback)) {
      values.push(token);
    }

    const output: string[] = [];
    const seen = new Set<string>();
    for (const entry of values) {
      const key = entry.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(entry);
      if (output.length >= 10) break;
    }

    return output;
  }

  get lexiconInfoFields(): MorphologyField[] {
    return [
      { id: 'word', label: 'Word', value: this.activeWord, arabic: true },
      { id: 'lexicon', label: 'ar_u_lexicon', value: this.resolvedLexiconId || '—' },
      { id: 'root', label: 'Root', value: this.rootValue || '—', arabic: this.looksArabic(this.rootValue) },
      { id: 'lemma', label: 'Lemma', value: this.lemmaValue || '—', arabic: this.looksArabic(this.lemmaValue) },
      { id: 'pattern', label: 'Pattern', value: this.patternValue || '—' },
      { id: 'pos', label: 'POS', value: this.posValue ? this.posValue.toUpperCase() : '—' },
      { id: 'reference', label: 'Reference', value: this.activeLocation || '—' },
    ];
  }

  get morphologyProfileFields(): MorphologyField[] {
    return [
      { id: 'profile-root', label: 'Root', value: this.rootValue || '—', arabic: this.looksArabic(this.rootValue) },
      { id: 'profile-lemma', label: 'Lemma', value: this.lemmaValue || '—', arabic: this.looksArabic(this.lemmaValue) },
      { id: 'profile-pattern', label: 'Pattern', value: this.patternValue || '—' },
      { id: 'profile-pos', label: 'POS', value: this.posValue ? this.posValue.toUpperCase() : '—' },
      { id: 'profile-form', label: 'Form', value: this.formValue || '—', arabic: this.looksArabic(this.formValue) },
      { id: 'profile-ref', label: 'Reference', value: this.activeLocation || '—' },
    ];
  }

  get morphologySingularForm(): string {
    return this.firstText(this.morphologySingularRecord, ['form_ar']);
  }

  get morphologySingularPattern(): string {
    return this.firstText(this.morphologySingularRecord, ['pattern']);
  }

  get morphologyPluralForm(): string {
    return this.firstText(this.morphologyPluralRecord, ['form_ar']);
  }

  get morphologyPluralPattern(): string {
    return this.firstText(this.morphologyPluralRecord, ['pattern']);
  }

  get morphologyPluralType(): string {
    return this.firstText(this.morphologyPluralRecord, ['type']);
  }

  get morphologyDerivedTriplet(): string {
    const source = this.morphologyDerivedFromVerbRecord;
    if (!source) return '';
    const pieces = [
      this.firstText(source, ['past', 'verb_past', 'perfect']),
      this.firstText(source, ['present', 'verb_present', 'imperfect']),
      this.firstText(source, ['masdar', 'verbal_noun', 'infinitive']),
    ].filter(Boolean);
    return pieces.join(' - ');
  }

  get morphologyFeatureBadges(): string[] {
    const features = this.morphologyFeatureRecord;
    if (!features) return [];

    const labels: string[] = [];
    const derivationType = this.firstText(features, ['derivation_type']);
    if (derivationType) labels.push(derivationType);

    const isMushtaq = features['is_mushtaq'] === true;
    if (isMushtaq) labels.push('مشتق');

    const isTriliteral = features['is_triliteral_root'] === true;
    const rootClass = this.firstText(features, ['root_class']);
    if (isTriliteral && rootClass) {
      labels.push(`ثلاثي ${rootClass}`);
    } else if (isTriliteral) {
      labels.push('ثلاثي');
    } else if (rootClass) {
      labels.push(rootClass);
    }

    return this.uniqueTexts(labels, 8);
  }

  get morphologyCardMeanings(): string[] {
    const record = this.activeMorphologyRecord;
    if (!record) return [];
    const direct = record['meanings'];
    if (!Array.isArray(direct)) return [];
    return direct.map((value) => this.textValue(value)).filter(Boolean);
  }

  get synonymChips(): string[] {
    const chips: string[] = [];
    const seen = new Set<string>();
    const selectedWords = new Set<string>(
      [
        this.normalizeSynonymWord(this.activeWord),
        this.normalizeSynonymWord(this.lemmaValue),
        this.normalizeSynonymWord(this.rootValue),
      ].filter(Boolean)
    );

    const append = (entry: Record<string, unknown>) => {
      const normalizedWord =
        this.normalizeSynonymWord(this.textValue(entry['word_norm'])) ||
        this.normalizeSynonymWord(this.textValue(entry['word_ar']));
      if (normalizedWord && selectedWords.has(normalizedWord)) return;

      const label = this.synonymLabel(entry);
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      chips.push(label);
    };

    for (const entry of this.localSynonymRecords) append(entry);
    for (const entry of this.remoteSynonymRecords) append(entry);
    return chips.slice(0, 14);
  }

  get evidenceCount(): number {
    return this.evidenceDisplayRecords.length;
  }

  get evidenceDisplayRecords(): Array<Record<string, unknown>> {
    return this.evidenceRecords.filter((item) => Boolean(this.evidenceExtractText(item)));
  }

  get isLoadingForSelection(): boolean {
    return this.remoteLoading && Boolean(this.resolvedLexiconId);
  }

  evidenceGroupTitle(item: Record<string, unknown>): string {
    const sourceType = this.textValue(item['source_type']);
    const sourceId = this.textValue(item['source_id']);
    const source = `${sourceType} ${sourceId}`.toLowerCase();
    if (source.includes('quran')) return 'Qur\'an Example';
    if (source.includes('lex') || source.includes('dictionary') || source.includes('book')) return 'Definition';
    if (source.includes('sinai') || source.includes('scholar') || source.includes('tafsir')) return 'Scholarly Note';
    return 'Evidence';
  }

  evidenceExtractText(item: Record<string, unknown>): string {
    return this.cleanEvidenceText(item['extract_text']);
  }

  evidenceSource(item: Record<string, unknown>): string {
    const location = this.locationFromRecord(item);
    const segments = location.split(':').filter(Boolean);
    const sourceType = this.textValue(item['source_type']);
    const sourceId = this.textValue(item['source_id']);
    const page = this.numberValue(item['page_no']);
    const parts: string[] = [];

    if (segments.length >= 2) {
      const surah = this.numberValue(segments[0]);
      const ayah = this.numberValue(segments[1]);
      if (surah != null && ayah != null) {
        parts.push(`Surah ${surah}:${ayah}`);
      }
    }

    const sourceLabel = this.humanizeEvidenceSource(sourceId || sourceType);
    if (sourceLabel) parts.push(sourceLabel);
    if (page != null) parts.push(`p.${page}`);
    return parts.join(' | ') || 'Source not set';
  }

  isArabicText(value: string): boolean {
    return this.looksArabic(value);
  }

  trackByField = (_: number, item: MorphologyField): string => item.id;

  trackByTerm = (index: number, term: string): string => `${term}-${index}`;

  trackByEvidence = (index: number, item: Record<string, unknown>): string => {
    const id = this.textValue(item['evidence_id']);
    if (id) return id;
    return `${this.textValue(item['source_id'])}|${this.textValue(item['chunk_id'])}|${index}`;
  };

  private recomputeSelectionDetails() {
    if (!this.selectedMorphologyItem) {
      this.selectedMorphologyRecord = null;
      this.selectedLinkRecord = null;
      this.selectedEvidenceRecords = [];
      this.resolvedLexiconId = '';
      this.clearRemoteState();
      return;
    }

    const selection = this.toSelection(this.selectedMorphologyItem);
    const location = this.normalizeLocation(selection.location);
    const normalizedWord = this.normalizeArabic(selection.text);
    const locationParts = this.parseLocation(selection.location, selection);

    this.selectedMorphologyRecord = this.findBestRecord({
      source: this.morphologyItems,
      location,
      normalizedWord,
      locationParts,
      textKeys: ['surface_ar', 'surface_norm', 'lemma_ar', 'lemma_norm', 'word', 'text'],
      preferredLexiconId: '',
    });

    const lexiconId =
      this.lexiconIdOf(this.selectedMorphologyRecord) ||
      this.lexiconIdOf(
        this.findBestRecord({
          source: this.lexiconMorphologyItems,
          location,
          normalizedWord,
          locationParts,
          textKeys: ['surface_ar', 'surface_norm'],
          preferredLexiconId: '',
        })
      );

    this.selectedLinkRecord = this.findBestRecord({
      source: this.lexiconMorphologyItems,
      location,
      normalizedWord,
      locationParts,
      textKeys: ['surface_ar', 'surface_norm'],
      preferredLexiconId: lexiconId,
    });

    const effectiveLexiconId = lexiconId || this.lexiconIdOf(this.selectedLinkRecord);
    this.resolvedLexiconId = effectiveLexiconId;
    this.selectedEvidenceRecords = this.findEvidenceMatches({
      location,
      locationParts,
      normalizedWord,
      lexiconId: effectiveLexiconId,
    });
    void this.syncRemoteLexiconBundle(effectiveLexiconId);
  }

  private async syncRemoteLexiconBundle(lexiconId: string) {
    const normalizedLexiconId = this.textValue(lexiconId);
    this.remoteSequence += 1;
    const requestId = this.remoteSequence;

    if (!normalizedLexiconId) {
      this.clearRemoteState();
      return;
    }

    if (this.remoteLexiconId === normalizedLexiconId && this.remoteBundle) {
      this.remoteError = '';
      this.remoteLoading = false;
      return;
    }

    this.remoteLoading = true;
    this.remoteError = '';
    try {
      const bundle = await this.lexiconData.getLexiconBundle(normalizedLexiconId);
      if (requestId !== this.remoteSequence) return;
      this.remoteBundle = bundle;
      this.remoteLexiconId = normalizedLexiconId;
    } catch (error: unknown) {
      if (requestId !== this.remoteSequence) return;
      this.remoteBundle = null;
      this.remoteLexiconId = normalizedLexiconId;
      this.remoteError = error instanceof Error ? error.message : 'Failed to load lexicon data.';
    } finally {
      if (requestId === this.remoteSequence) {
        this.remoteLoading = false;
      }
    }
  }

  private clearRemoteState() {
    this.remoteBundle = null;
    this.remoteLexiconId = '';
    this.remoteLoading = false;
    this.remoteError = '';
  }

  private get evidenceRecords(): Array<Record<string, unknown>> {
    const merged = [...this.selectedEvidenceRecords, ...this.remoteEvidenceRecords];
    const deduped: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    for (const item of merged) {
      const key = [
        this.textValue(item['ar_u_lexicon']) || this.resolvedLexiconId,
        this.textValue(item['source_id']) || this.textValue(item['source_type']),
        this.textValue(item['chunk_id']),
        this.textValue(item['extract_text']),
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  }

  private get rootValue(): string {
    const direct = this.firstText(this.activeMorphologyRecord, ['root_norm', 'root']);
    if (direct) return direct;
    const fromLink = this.firstText(this.activeLinkRecord, ['root_norm', 'root']);
    if (fromLink) return fromLink;
    return this.firstText(this.lexiconMorphPayloadRecord, ['root_norm']);
  }

  private get lemmaValue(): string {
    const direct = this.firstText(this.activeMorphologyRecord, ['lemma_ar', 'lemma_norm', 'surface_ar', 'surface_norm']);
    if (direct) return direct;
    const fromLink = this.firstText(this.activeLinkRecord, ['surface_ar', 'surface_norm', 'lemma_ar', 'lemma_norm']);
    if (fromLink) return fromLink;
    return this.firstText(this.lexiconMorphPayloadRecord, ['lemma_ar', 'lemma_norm']);
  }

  private get posValue(): string {
    const direct = this.firstText(this.activeMorphologyRecord, ['pos', 'pos2']);
    if (direct) return direct;
    const fromLink = this.firstText(this.activeLinkRecord, ['pos2', 'pos']);
    if (fromLink) return fromLink;
    return this.firstText(this.lexiconMorphPayloadRecord, ['pos']);
  }

  private get patternValue(): string {
    const direct = this.patternFromRecord(this.activeMorphologyRecord);
    if (direct) return direct;
    const fromLink = this.patternFromRecord(this.activeLinkRecord);
    if (fromLink) return fromLink;
    const fromLexicon = this.firstText(this.lexiconMorphPayloadRecord, ['morph_pattern']);
    if (fromLexicon) return fromLexicon;
    return this.firstText(this.lexiconPrimaryDerivationRecord, ['pattern']);
  }

  private get formValue(): string {
    const direct = this.firstText(this.activeLinkRecord, ['verb_form', 'form']);
    if (direct) return direct;
    return this.lexiconFormValue;
  }

  private get meaningPrimary(): string {
    const direct = this.translationPrimary(this.activeMorphologyRecord);
    if (direct) return direct;
    return this.firstText(this.activeLinkRecord, ['notes']);
  }

  private get meaningAlternatives(): string[] {
    const values: string[] = [];
    const translation = this.activeMorphologyRecord?.['translation'];
    if (translation && typeof translation === 'object' && !Array.isArray(translation)) {
      const alternatives = (translation as Record<string, unknown>)['alternatives'];
      if (Array.isArray(alternatives)) {
        for (const item of alternatives) {
          const value = this.textValue(item);
          if (value) values.push(value);
        }
      }
    }

    for (const meaning of this.morphologyCardMeanings) {
      if (meaning) values.push(meaning);
    }

    return this.uniqueTexts(values, 10);
  }

  private get localSynonymRecords(): Array<Record<string, unknown>> {
    const records: Array<Record<string, unknown>> = [];
    records.push(...this.parseSynonymRecords(this.activeMorphologyRecord?.['synonyms_json']));
    records.push(...this.parseSynonymRecords(this.activeLinkRecord?.['synonyms_json']));
    return records;
  }

  private get remoteSynonymRecords(): Array<Record<string, unknown>> {
    const bundle = this.remoteBundle;
    if (!bundle) return [];
    return bundle.synonymWords.map((entry) => this.toSynonymRecord(entry));
  }

  private get activeMorphologyRecord(): Record<string, unknown> | null {
    const local = this.selectedMorphologyRecord;
    const remote = this.remoteFocusedMorphologyRecord;
    if (local && remote) return { ...remote, ...local };
    return local ?? remote;
  }

  private get activeLinkRecord(): Record<string, unknown> | null {
    const local = this.selectedLinkRecord;
    const remote = this.remoteFocusedLinkRecord;
    if (local && remote) return { ...remote, ...local };
    return local ?? remote;
  }

  private get morphologyRecord(): Record<string, unknown> | null {
    return this.asRecord(this.activeMorphologyRecord?.['morphology']);
  }

  private get morphologySingularRecord(): Record<string, unknown> | null {
    return this.asRecord(this.morphologyRecord?.['singular']);
  }

  private get morphologyPluralRecord(): Record<string, unknown> | null {
    return this.asRecord(this.morphologyRecord?.['plural']);
  }

  private get morphologyFeatureRecord(): Record<string, unknown> | null {
    return this.asRecord(this.morphologyRecord?.['morph_features']);
  }

  private get morphologyDerivedFromVerbRecord(): Record<string, unknown> | null {
    return this.extractDerivedFromVerb(this.activeMorphologyRecord);
  }

  private get remoteFocusedMorphologyRecord(): Record<string, unknown> | null {
    const bundle = this.remoteBundle;
    if (!bundle) return null;
    const morphologyId = this.resolveFocusedMorphologyId(bundle);
    if (!morphologyId) return null;
    const row = bundle.morphologyById[morphologyId];
    if (!row) return null;
    return { ...row };
  }

  private get remoteFocusedLinkRecord(): Record<string, unknown> | null {
    const bundle = this.remoteBundle;
    if (!bundle) return null;
    const morphologyId = this.resolveFocusedMorphologyId(bundle);
    if (!morphologyId) return null;
    const link = bundle.morphologyLinks.find((entry) => this.textValue(entry.ar_u_morphology) === morphologyId) ?? null;
    if (!link) return null;
    return this.toLinkRecord(link);
  }

  private get remoteEvidenceRecords(): Array<Record<string, unknown>> {
    const bundle = this.remoteBundle;
    if (!bundle) return [];
    return bundle.evidenceRows.map((row) => this.toEvidenceRecord(row, bundle.lexiconId));
  }

  private get lexiconMorphPayloadRecord(): Record<string, unknown> | null {
    const bundle = this.remoteBundle;
    if (!bundle?.lexiconMorphology) return null;
    return this.toLexiconMorphologyRecord(bundle.lexiconMorphology);
  }

  private get lexiconMorphFeaturesRecord(): Record<string, unknown> | null {
    return this.asRecord(this.lexiconMorphPayloadRecord?.['morph_features']);
  }

  private get lexiconMorphDerivationRecords(): Array<Record<string, unknown>> {
    const value = this.lexiconMorphPayloadRecord?.['morph_derivations'];
    if (!Array.isArray(value)) return [];
    return value.map((entry) => this.asRecord(entry)).filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  private get lexiconPrimaryDerivationRecord(): Record<string, unknown> | null {
    const records = this.lexiconMorphDerivationRecords;
    if (!records.length) return null;
    return (
      records.find((entry) => {
        const kind = this.firstText(entry, ['kind', 'type']).toLowerCase();
        return kind.includes('singular') || kind.includes('single') || kind.includes('مفرد');
      }) ?? records[0]
    );
  }

  private get lexiconFormValue(): string {
    const features = this.lexiconMorphFeaturesRecord;
    const pieces: string[] = [];
    const derivationType = this.firstText(features, ['derivation_type']);
    if (derivationType) pieces.push(derivationType);

    const isMushtaq = features?.['is_mushtaq'];
    if (isMushtaq === true) pieces.push('مشتق');
    if (isMushtaq === false) pieces.push('جامد');

    const rootClassRaw = this.firstText(features, ['root_class']);
    const rootClass = this.normalizeRootClassLabel(rootClassRaw);
    if (rootClass) pieces.push(rootClass);

    const derivationKind = this.firstText(this.lexiconPrimaryDerivationRecord, ['type', 'kind']);
    if (derivationKind && !pieces.includes(derivationKind)) pieces.push(derivationKind);
    return this.uniqueTexts(pieces, 6).join(' • ');
  }

  private toSelection(item: StudyMorphologyItem): MorphologySelection {
    const rawLocation = this.textValue(item.location);
    const parsed = this.parseLocation(rawLocation, null);
    return {
      text: this.textValue(item.word),
      location: rawLocation,
      surah: parsed.surah,
      ayah: parsed.ayah,
      tokenIndex: parsed.tokenIndex,
    };
  }

  private findBestRecord(config: {
    source: Array<Record<string, unknown>>;
    location: string;
    normalizedWord: string;
    locationParts: WordLocationParts;
    textKeys: string[];
    preferredLexiconId: string;
  }): Record<string, unknown> | null {
    let best: Record<string, unknown> | null = null;
    let bestScore = 0;

    for (const item of config.source) {
      const score = this.scoreRecord({
        item,
        location: config.location,
        normalizedWord: config.normalizedWord,
        locationParts: config.locationParts,
        textKeys: config.textKeys,
        preferredLexiconId: config.preferredLexiconId,
      });
      if (score <= bestScore) continue;
      bestScore = score;
      best = item;
    }

    return bestScore > 0 ? best : null;
  }

  private scoreRecord(config: {
    item: Record<string, unknown>;
    location: string;
    normalizedWord: string;
    locationParts: WordLocationParts;
    textKeys: string[];
    preferredLexiconId: string;
  }): number {
    let score = 0;
    const item = config.item;

    const itemLocation = this.locationFromRecord(item);
    if (config.location && itemLocation && itemLocation === config.location) {
      score += 14;
    } else if (this.matchesLocationParts(item, config.locationParts)) {
      score += 9;
    }

    if (config.normalizedWord) {
      for (const key of config.textKeys) {
        const value = this.normalizeArabic(this.textValue(item[key]));
        if (!value) continue;
        if (value === config.normalizedWord) {
          score += 6;
          break;
        }
      }
    }

    if (config.preferredLexiconId) {
      const itemLexiconId = this.lexiconIdOf(item);
      if (itemLexiconId && itemLexiconId === config.preferredLexiconId) {
        score += 5;
      }
    }

    if (this.patternFromRecord(item)) score += 1;
    if (this.firstText(item, ['pos', 'pos2'])) score += 1;
    return score;
  }

  private findEvidenceMatches(config: {
    location: string;
    locationParts: WordLocationParts;
    normalizedWord: string;
    lexiconId: string;
  }): Array<Record<string, unknown>> {
    return this.evidenceItems
      .map((item) => ({ item, score: this.scoreEvidenceRecord(item, config) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item);
  }

  private scoreEvidenceRecord(
    item: Record<string, unknown>,
    config: { location: string; locationParts: WordLocationParts; normalizedWord: string; lexiconId: string }
  ): number {
    let score = 0;
    const itemLocation = this.locationFromRecord(item);
    if (config.location && itemLocation && itemLocation === config.location) {
      score += 14;
    } else if (this.matchesLocationParts(item, config.locationParts)) {
      score += 9;
    }

    if (config.lexiconId) {
      const lexiconId = this.lexiconIdOf(item);
      if (lexiconId && lexiconId === config.lexiconId) score += 8;
    }

    if (config.normalizedWord) {
      const extract = this.normalizeArabic(this.textValue(item['extract_text']));
      const heading = this.normalizeArabic(this.textValue(item['heading_raw']));
      if (extract && extract === config.normalizedWord) score += 5;
      if (heading && heading.includes(config.normalizedWord)) score += 2;
    }

    return score;
  }

  private resolveFocusedMorphologyId(bundle: QuranLexiconBundle): string {
    const directIds = [
      this.firstText(this.selectedLinkRecord, ['ar_u_morphology']),
      this.firstText(this.selectedMorphologyRecord, ['ar_u_morphology']),
    ].filter(Boolean);
    for (const id of directIds) {
      if (bundle.morphologyById[id]) return id;
    }

    const normalizedWord = this.normalizeArabic(this.activeWord);
    if (normalizedWord) {
      const match = bundle.morphologyLinks.find((row) => {
        const surfaceAr = this.normalizeArabic(this.textValue(row.surface_ar));
        const surfaceNorm = this.normalizeArabic(this.textValue(row.surface_norm));
        return surfaceAr === normalizedWord || surfaceNorm === normalizedWord;
      });
      if (match && bundle.morphologyById[this.textValue(match.ar_u_morphology)]) {
        return this.textValue(match.ar_u_morphology);
      }
    }

    const first = bundle.morphologyLinks.find((entry) => bundle.morphologyById[this.textValue(entry.ar_u_morphology)]);
    return first ? this.textValue(first.ar_u_morphology) : '';
  }

  private toEvidenceRecord(row: QuranLexiconEvidenceRow, lexiconId: string): Record<string, unknown> {
    return {
      ar_u_lexicon: lexiconId,
      source_type: row.source_code || 'source',
      source_id: row.source_code || '',
      heading_raw: row.title || '',
      page_no: row.page_no,
      chunk_id: row.chunk_id,
      extract_text: row.extract_text || '',
      note_md: row.notes || '',
      link_role: 'supports',
    };
  }

  private toLinkRecord(link: QuranLexiconMorphologyLink): Record<string, unknown> {
    return {
      ar_u_lexicon: link.ar_u_lexicon,
      ar_u_morphology: link.ar_u_morphology,
      link_role: link.link_role,
      surface_ar: link.surface_ar,
      surface_norm: link.surface_norm,
      pos2: link.pos2,
      derived_pattern: link.derived_pattern,
      verb_form: link.verb_form,
      created_at: link.created_at,
    };
  }

  private toSynonymRecord(entry: QuranLexiconSynonymWord): Record<string, unknown> {
    return {
      topic_id: entry.topic_id,
      word_norm: entry.word_norm,
      word_ar: entry.word_ar,
      word_en: entry.word_en,
      root_norm: entry.root_norm,
      root_ar: entry.root_ar,
      order_index: entry.order_index,
    };
  }

  private toLexiconMorphologyRecord(entry: QuranLexiconMorphologyPayload): Record<string, unknown> {
    return {
      ar_u_lexicon: entry.ar_u_lexicon,
      lemma_ar: entry.lemma_ar,
      lemma_norm: entry.lemma_norm,
      root_norm: entry.root_norm,
      pos: entry.pos,
      morph_pattern: entry.morph_pattern,
      morph_features: entry.morph_features,
      morph_derivations: entry.morph_derivations,
    };
  }

  private extractDerivedFromVerb(source: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!source) return null;

    const direct = this.asRecord(source['derived_from_verb']);
    if (direct && this.hasVerbTripletParts(direct)) return direct;

    const morphMeta = this.asRecord(source['morph_meta']);
    if (morphMeta) {
      const nested = this.asRecord(morphMeta['derived_from_verb']);
      if (nested && this.hasVerbTripletParts(nested)) return nested;
      if (this.hasVerbTripletParts(morphMeta)) return morphMeta;
    }

    const meta = this.asRecord(source['meta']);
    if (meta) {
      const nested = this.asRecord(meta['derived_from_verb']);
      if (nested && this.hasVerbTripletParts(nested)) return nested;
    }

    const morphology = this.asRecord(source['morphology']);
    if (morphology) {
      const nested = this.asRecord(morphology['derived_from_verb']);
      if (nested && this.hasVerbTripletParts(nested)) return nested;
    }

    return null;
  }

  private hasVerbTripletParts(record: Record<string, unknown>): boolean {
    return Boolean(
      this.firstText(record, ['past', 'verb_past', 'perfect']) ||
      this.firstText(record, ['present', 'verb_present', 'imperfect']) ||
      this.firstText(record, ['masdar', 'verbal_noun', 'infinitive'])
    );
  }

  private buildTaskTarget(): TargetRef | null {
    return buildTaskTargetSafe(this.unitId, 'morphology', this.rangeRef);
  }

  private buildWordTarget(item: StudyMorphologyItem): TargetRef | null {
    const parsed = this.parseLocation(item.location, null);
    if (parsed.surah == null || parsed.ayah == null || parsed.tokenIndex == null) {
      return null;
    }

    try {
      return makeWordTarget(parsed.surah, parsed.ayah, parsed.tokenIndex);
    } catch {
      return null;
    }
  }

  private locationFromRecord(item: Record<string, unknown>): string {
    const direct = this.normalizeLocation(this.textValue(item['word_location']));
    if (direct) return direct;

    const surah = this.numberValue(item['surah']);
    const ayah = this.numberValue(item['ayah']);
    const token = this.numberValue(item['token_index']);
    if (surah == null || ayah == null) return '';
    if (token == null) return `${surah}:${ayah}`;
    return `${surah}:${ayah}:${token}`;
  }

  private matchesLocationParts(item: Record<string, unknown>, parts: WordLocationParts): boolean {
    if (parts.surah == null || parts.ayah == null) return false;
    const surah = this.numberValue(item['surah']);
    const ayah = this.numberValue(item['ayah']);
    if (surah == null || ayah == null || surah !== parts.surah || ayah !== parts.ayah) return false;
    if (parts.tokenIndex == null) return true;
    const token = this.numberValue(item['token_index']);
    return token != null && token === parts.tokenIndex;
  }

  private parseLocation(
    location: string,
    fallback: { surah?: number | null; ayah?: number | null; tokenIndex?: number | null } | null
  ): WordLocationParts {
    const normalized = this.normalizeLocation(location);
    const segments = normalized.split(':').filter(Boolean);
    if (segments.length >= 2) {
      const surah = this.numberValue(segments[0]);
      const ayah = this.numberValue(segments[1]);
      const tokenIndex = this.numberValue(segments[2]);
      if (surah != null && ayah != null) {
        return { surah, ayah, tokenIndex };
      }
    }

    return {
      surah: this.numberValue(fallback?.surah),
      ayah: this.numberValue(fallback?.ayah),
      tokenIndex: this.numberValue(fallback?.tokenIndex),
    };
  }

  private patternFromRecord(record: Record<string, unknown> | null): string {
    const direct = this.firstText(record, ['morph_pattern', 'derived_pattern', 'verb_form', 'pattern']);
    if (direct) return direct;

    const morphology = record?.['morphology'];
    if (!morphology || typeof morphology !== 'object' || Array.isArray(morphology)) return '';
    const singular = (morphology as Record<string, unknown>)['singular'];
    if (!singular || typeof singular !== 'object' || Array.isArray(singular)) return '';
    return this.textValue((singular as Record<string, unknown>)['pattern']);
  }

  private translationPrimary(record: Record<string, unknown> | null): string {
    if (!record) return '';
    const translation = record['translation'];
    if (typeof translation === 'string') return translation.trim();
    if (!translation || typeof translation !== 'object' || Array.isArray(translation)) return '';
    const primary = (translation as Record<string, unknown>)['primary'];
    return this.textValue(primary);
  }

  private lexiconIdOf(record: Record<string, unknown> | null): string {
    if (!record) return '';
    return this.firstText(record, ['ar_u_lexicon', 'lexicon_id']);
  }

  private firstText(record: Record<string, unknown> | null | undefined, keys: string[]): string {
    if (!record) return '';
    for (const key of keys) {
      const value = this.textValue(record[key]);
      if (value) return value;
    }
    return '';
  }

  private parseMeaningTokens(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((entry) => this.textValue(entry)).map((entry) => entry.trim()).filter(Boolean);
    }

    const raw = this.textValue(value);
    if (!raw) return [];
    return raw
      .split(/[|;,/]/)
      .map((entry) => entry.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  private parseSynonymRecords(value: unknown): Array<Record<string, unknown>> {
    const toRecord = (entry: unknown): Record<string, unknown> | null => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const text = entry.trim();
        if (!text) return null;
        return { word_norm: text, word_en: text };
      }
      if (typeof entry !== 'object' || Array.isArray(entry)) return null;
      return { ...(entry as Record<string, unknown>) };
    };

    if (Array.isArray(value)) {
      return value.map((entry) => toRecord(entry)).filter((entry): entry is Record<string, unknown> => Boolean(entry));
    }

    const raw = this.textValue(value);
    if (!raw) return [];
    const trimmed = raw.trim();

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((entry) => toRecord(entry))
            .filter((entry): entry is Record<string, unknown> => Boolean(entry));
        }
      } catch {
        // Fallback to split mode.
      }
    }

    return trimmed
      .split(/[|;,]/)
      .map((entry) => toRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  private normalizeSynonymWord(value: string): string {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(this.arabicDiacriticsRe, '')
      .replace(this.arabicTatweelRe, '')
      .replace(this.arabicNonLettersRe, '')
      .trim();
  }

  private normalizeRootClassLabel(value: string): string {
    const normalized = this.textValue(value);
    if (!normalized) return '';
    const lower = normalized.toLowerCase();
    if (lower === 'triliteral') return 'ثلاثي';
    if (lower === 'quadriliteral') return 'رباعي';
    return normalized;
  }

  private synonymLabel(entry: Record<string, unknown>): string {
    const wordAr = this.textValue(entry['word_ar']);
    const wordEn = this.textValue(entry['word_en']);
    const wordNorm = this.textValue(entry['word_norm']);
    if (wordAr && wordEn) return `${wordAr} · ${wordEn}`;
    if (wordEn) return wordEn;
    if (wordAr) return wordAr;
    return wordNorm;
  }

  private normalizeArabic(value: string): string {
    return String(value)
      .normalize('NFKC')
      .replace(this.arabicDiacriticsRe, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/[ـ]/g, '')
      .trim();
  }

  private normalizeLocation(value: string): string {
    return String(value ?? '').trim();
  }

  private textValue(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  private numberValue(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private cleanEvidenceText(value: unknown): string {
    const raw = this.textValue(value);
    if (!raw) return '';
    return raw
      .replace(this.arabicScriptRe, ' ')
      .replace(/\*+/g, '')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/\s*:\s*/g, ': ')
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s|:,\-.]+/, '')
      .replace(/[\s|:,\-.]+$/, '')
      .trim();
  }

  private humanizeEvidenceSource(value: string): string {
    let text = this.textValue(value);
    if (!text) return '';

    text = text
      .replace(/^SRC\s*:\s*/i, '')
      .replace(/^source\s*:\s*/i, '')
      .replace(/^chunk\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';

    const lower = text.toLowerCase();
    if (lower === 'book' || lower === 'source' || lower === 'lexicon') return '';

    if (text.includes(':')) {
      const firstPart = text.split(':')[0]?.trim() ?? text;
      if (firstPart) text = firstPart;
    }

    text = text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && text === text.toUpperCase()) {
      text = text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    }
    return text;
  }

  private looksArabic(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }

  private uniqueTexts(values: string[], limit = 20): string[] {
    const output: string[] = [];
    const seen = new Set<string>();
    for (const entry of values) {
      const text = entry.trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(text);
      if (output.length >= limit) break;
    }
    return output;
  }
}
