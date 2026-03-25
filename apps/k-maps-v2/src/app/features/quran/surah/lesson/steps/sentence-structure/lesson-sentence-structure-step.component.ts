import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { Subscription } from 'rxjs';

import {
  StudyLessonResponse,
  SurahModulesService,
  UnitTaskVm,
} from '../../../../../../shared/services/surah-modules.service';

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

type AppearanceMode = 'light_soft' | 'dark_transparent';
type NodeKind = 'structure' | 'treebank';
type JsonPath = Array<string | number>;
type SentenceTone = 'gold' | 'amber' | 'cyan' | 'mint' | 'slate';
type SentenceStepKind = 'frame' | 'main' | 'expansion';

interface JsonRecord {
  [key: string]: unknown;
}

interface MotionConfig {
  from?: JsonRecord | null;
  to?: JsonRecord | null;
}

interface SentenceNodeVm {
  id: string;
  nodeType: string;
  subtypeRef: string;
  labelAr: string;
  labelEn: string;
  textAr: string;
  translationEn: string;
  functionLabel: string;
  features: JsonRecord | null;
  morphology: JsonRecord | null;
  targets: string[];
  path: JsonPath;
  pathKey: string;
  depth: number;
  children: SentenceNodeVm[];
}

interface FocusOverlayVm {
  textAr: string;
  translationEn: string;
}

interface SentenceGsapVm {
  rootTimelines: JsonRecord;
  structureClickTimelines: JsonRecord[];
  treebankExpandTimelines: JsonRecord;
  sharedVisualStates: JsonRecord;
}

interface SentenceMorphologyToggleVm {
  enabled: boolean;
  defaultExpanded: boolean;
  visibleNodeIds: Set<string>;
}

interface SentenceSceneVm {
  id: string;
  order: number;
  ref: string;
  title: string;
  textAr: string;
  translationEn: string;
  structureTree: SentenceNodeVm;
  treebank: SentenceNodeVm;
  structureCards: SentenceNodeVm[];
  targetMap: Map<string, string[]>;
  gsapUi: SentenceGsapVm | null;
  morphologyToggle: SentenceMorphologyToggleVm;
  rootPath: JsonPath;
  pathKey: string;
  legacy: boolean;
}

interface SentenceSegmentVm {
  id: string;
  label: string;
  text: string;
  detail: string;
  pattern: string;
  grammar: string[];
  tone: SentenceTone;
}

interface SentenceStepVm {
  id: string;
  order: number;
  kind: SentenceStepKind;
  kindLabel: string;
  title: string;
  text: string;
  detail: string;
  pattern: string;
  grammar: string[];
  tone: SentenceTone;
}

const DEFAULT_STRUCTURE_ENTER: MotionConfig = {
  from: { opacity: 0, y: 24, scale: 0.97 },
  to: { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
};

const DEFAULT_TREEBANK_ENTER: MotionConfig = {
  from: { opacity: 0, y: 20 },
  to: { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
};

const DEFAULT_OVERLAY_ENTER: MotionConfig = {
  from: { opacity: 0, y: 12 },
  to: { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' },
};

@Component({
  selector: 'km-lesson-sentence-structure-step',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-sentence-structure-step.component.html',
  styleUrl: './lesson-sentence-structure-step.component.scss',
})
export class LessonSentenceStructureStepComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly modules = inject(SurahModulesService);
  private readonly cdr = inject(ChangeDetectorRef);

  private motionTimeout: ReturnType<typeof setTimeout> | null = null;
  private commitSub: Subscription | null = null;
  private viewReady = false;

  @Input({ required: true }) lesson!: StudyLessonResponse;

  taskTitle = 'Sentence Structure';
  hasTaskPayload = false;
  sentences: SentenceSceneVm[] = [];

  appearanceMode: AppearanceMode = 'light_soft';
  rootPayload: JsonRecord | null = null;
  workspaceStarted = false;
  showMorphology = false;

  selectedSentenceIndex = 0;
  selectedStructureId: string | null = null;
  activeTargetIds = new Set<string>();
  selectedNodePathKey: string | null = null;

  structureOverlay: FocusOverlayVm | null = null;

  editorVisible = false;
  editorTargetPath: JsonPath | null = null;
  editorTargetLabel = '';
  editorText = '';
  editorDirty = false;
  editorError = '';

  commitState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  commitMessage = '';

  readonly collapsedStructureIds = new Set<string>();
  readonly collapsedTreebankIds = new Set<string>();

  get currentSentence(): SentenceSceneVm | null {
    return this.sentences[this.selectedSentenceIndex] ?? null;
  }

  get activeNode(): SentenceNodeVm | null {
    const sentence = this.currentSentence;
    if (!sentence || !this.selectedNodePathKey) return null;
    return this.findNodeByPathKey(sentence.structureTree, this.selectedNodePathKey)
      ?? this.findNodeByPathKey(sentence.treebank, this.selectedNodePathKey);
  }

  get selectedNodeLabel(): string {
    const node = this.activeNode;
    return this.nodeLabel(node) || 'Selected node';
  }

  get appearanceSliderTransform(): string {
    return this.appearanceMode === 'dark_transparent' ? 'translateX(100%)' : 'translateX(0%)';
  }

  get canCommit(): boolean {
    return Boolean(this.rootPayload && this.lessonId != null && this.editorTargetPath);
  }

  get lessonId(): number | null {
    const value = Number(this.lesson?.lessonId);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('lesson' in changes) {
      this.rebuildFromLesson();
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.queueMotion();
  }

  ngOnDestroy(): void {
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
    }
    this.commitSub?.unsubscribe();
    this.clearMotion();
  }

  setAppearance(mode: AppearanceMode): void {
    if (this.appearanceMode === mode) return;
    this.appearanceMode = mode;
  }

  beginScene(): void {
    if (this.workspaceStarted) {
      this.queueMotion();
      return;
    }
    this.workspaceStarted = true;
    this.queueMotion();
  }

  selectSentence(index: number): void {
    if (index < 0 || index >= this.sentences.length || index === this.selectedSentenceIndex) return;

    const previous = this.currentSentence;
    this.selectedSentenceIndex = index;
    this.resetSentenceState(this.currentSentence);

    if (this.workspaceStarted && previous && this.currentSentence) {
      this.queueMotion();
    }
  }

  focusStructure(node: SentenceNodeVm): void {
    const sentence = this.currentSentence;
    if (!sentence) return;

    this.selectedStructureId = node.id;
    this.selectedNodePathKey = node.pathKey;
    this.activeTargetIds = new Set(this.targetsForStructure(sentence, node.id));
    this.structureOverlay = this.overlayForStructure(sentence, node);

    if (this.workspaceStarted) {
      this.queueMotion();
    }
  }

  onNodeSelected(kind: NodeKind, node: SentenceNodeVm): void {
    this.selectedNodePathKey = node.pathKey;
    if (kind === 'structure') {
      this.focusStructure(node);
      return;
    }

    if (node.children.length) {
      this.toggleCollapsed(kind, node.id);
    }
  }

  toggleCollapsed(kind: NodeKind, nodeId: string): void {
    const bucket = kind === 'structure' ? this.collapsedStructureIds : this.collapsedTreebankIds;
    if (bucket.has(nodeId)) {
      bucket.delete(nodeId);
    } else {
      bucket.add(nodeId);
    }
  }

  isCollapsed(kind: NodeKind, nodeId: string): boolean {
    return (kind === 'structure' ? this.collapsedStructureIds : this.collapsedTreebankIds).has(nodeId);
  }

  isStructureActive(node: SentenceNodeVm): boolean {
    return this.selectedStructureId === node.id;
  }

  isTreebankActive(node: SentenceNodeVm): boolean {
    return this.activeTargetIds.has(node.id);
  }

  isTreebankDimmed(node: SentenceNodeVm): boolean {
    return this.activeTargetIds.size > 0 && !this.activeTargetIds.has(node.id);
  }

  isEditorTarget(node: SentenceNodeVm): boolean {
    return this.selectedNodePathKey === node.pathKey;
  }

  showMorphologyFor(node: SentenceNodeVm): boolean {
    const sentence = this.currentSentence;
    return Boolean(
      sentence
      && this.showMorphology
      && sentence.morphologyToggle.enabled
      && sentence.morphologyToggle.visibleNodeIds.has(node.id)
      && node.morphology
      && Object.keys(node.morphology).length > 0,
    );
  }

  morphologyEntries(node: SentenceNodeVm): Array<{ key: string; value: string }> {
    if (!node.morphology) return [];
    return Object.entries(node.morphology)
      .map(([key, value]) => ({
        key: this.toReadableLabel(key),
        value: this.valueToInlineString(value),
      }))
      .filter((entry) => entry.value.length > 0);
  }

  featureEntries(node: SentenceNodeVm): Array<{ key: string; value: string }> {
    if (!node.features) return [];
    return Object.entries(node.features)
      .map(([key, value]) => ({
        key: this.toReadableLabel(key),
        value: this.valueToInlineString(value),
      }))
      .filter((entry) => entry.value.length > 0)
      .slice(0, 4);
  }

  nodeLabel(node: SentenceNodeVm | null): string {
    if (!node) return '';
    return node.labelAr || node.labelEn || this.toReadableLabel(node.nodeType) || node.id;
  }

  nodeSecondaryLabel(node: SentenceNodeVm): string {
    if (node.labelAr && node.labelEn) {
      return node.labelEn;
    }
    if (!node.labelAr && node.labelEn) {
      return node.labelEn;
    }
    return this.toReadableLabel(node.subtypeRef || node.nodeType);
  }

  nodeBodyText(node: SentenceNodeVm): string {
    return node.textAr || node.translationEn || '';
  }

  nodeBodyDir(node: SentenceNodeVm): 'rtl' | 'ltr' | null {
    const value = node.textAr || node.translationEn;
    return this.dirFor(value);
  }

  visualDepth(node: SentenceNodeVm): number {
    return Math.max(0, node.depth - 1);
  }

  openRootEditor(): void {
    if (!this.rootPayload) return;
    this.openEditor([], 'Task Root');
  }

  openSentenceEditor(): void {
    const sentence = this.currentSentence;
    if (!sentence) return;
    this.openEditor(sentence.rootPath, sentence.title);
  }

  openSelectedNodeEditor(): void {
    const node = this.activeNode;
    if (!node) return;
    this.openEditor(node.path, this.nodeLabel(node));
  }

  closeEditor(): void {
    this.editorVisible = false;
    this.editorTargetPath = null;
    this.editorTargetLabel = '';
    this.editorText = '';
    this.editorDirty = false;
    this.editorError = '';
    this.commitState = 'idle';
    this.commitMessage = '';
    this.cdr.markForCheck();
  }

  onEditorInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.editorText = target?.value ?? '';
    this.editorDirty = true;
    this.editorError = '';
    if (this.commitState === 'saved') {
      this.commitState = 'idle';
      this.commitMessage = '';
    }
  }

  resetEditor(): void {
    if (!this.editorTargetPath || !this.rootPayload) return;
    const current = this.getByPath(this.rootPayload, this.editorTargetPath);
    this.editorText = JSON.stringify(current, null, 2);
    this.editorDirty = false;
    this.editorError = '';
    this.commitState = 'idle';
    this.commitMessage = '';
  }

  applyEditorLocally(): void {
    if (!this.rootPayload || !this.editorTargetPath) return;

    const parsed = this.parseEditorJson();
    if (parsed === null && this.editorText.trim() !== 'null') {
      return;
    }

    const nextPayload = this.applyParsedEdit(parsed);
    if (!nextPayload) return;

    this.loadPayload(nextPayload, {
      resetWorkspace: false,
      preserveSentenceId: this.currentSentence?.id ?? null,
      preserveStructureId: this.selectedStructureId,
      editorPath: this.editorTargetPath,
      editorLabel: this.editorTargetLabel,
    });

    this.editorDirty = false;
    this.commitState = 'idle';
    this.commitMessage = 'Applied locally.';
  }

  commitEditorChanges(): void {
    if (!this.rootPayload || !this.editorTargetPath || this.lessonId == null) return;

    const parsed = this.parseEditorJson();
    if (parsed === null && this.editorText.trim() !== 'null') {
      return;
    }

    const nextPayload = this.applyParsedEdit(parsed);
    if (!nextPayload) return;

    this.commitState = 'saving';
    this.commitMessage = 'Committing sentence structure...';
    this.editorError = '';

    this.commitSub?.unsubscribe();
      this.commitSub = this.modules.commitLessonTask(this.lessonId, {
      task_type: 'sentence_structure',
      task_json: nextPayload,
    }).subscribe({
      next: (response) => {
        if (!response.ok) {
          this.commitState = 'error';
          this.commitMessage = response.error ?? 'Commit failed.';
          this.cdr.markForCheck();
          return;
        }

        const committed = this.normalizeRootPayload(response.result?.task_json ?? nextPayload);
        if (!committed) {
          this.commitState = 'error';
          this.commitMessage = 'Commit returned an invalid task payload.';
          this.cdr.markForCheck();
          return;
        }

        this.loadPayload(committed, {
          resetWorkspace: false,
          preserveSentenceId: this.currentSentence?.id ?? null,
          preserveStructureId: this.selectedStructureId,
          editorPath: this.editorTargetPath,
          editorLabel: this.editorTargetLabel,
        });

        this.editorDirty = false;
        this.commitState = 'saved';
        this.commitMessage = 'Committed to ar_container_unit_task.';
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Commit failed.';
        this.commitState = 'error';
        this.commitMessage = message;
        this.cdr.markForCheck();
      },
    });
  }

  trackSentence(_index: number, sentence: SentenceSceneVm): string {
    return sentence.id;
  }

  trackNode(_index: number, node: SentenceNodeVm): string {
    return node.id;
  }

  trackEntry(_index: number, entry: { key: string; value: string }): string {
    return `${entry.key}:${entry.value}`;
  }

  private rebuildFromLesson(): void {
    const task = this.task();
    this.taskTitle = task?.task_name?.trim() || 'Sentence Structure';
    this.hasTaskPayload = task?.task_json != null;
    this.closeEditor();

    if (!task?.task_json) {
      this.rootPayload = null;
      this.sentences = [];
      this.workspaceStarted = false;
      this.showMorphology = false;
      this.activeTargetIds.clear();
      this.selectedStructureId = null;
      this.selectedNodePathKey = null;
      this.structureOverlay = null;
      this.queueMotion();
      this.cdr.markForCheck();
      return;
    }

    const payload = this.normalizeRootPayload(task.task_json);
    if (!payload) {
      this.rootPayload = null;
      this.sentences = [];
      this.workspaceStarted = false;
      this.queueMotion();
      this.cdr.markForCheck();
      return;
    }

    this.loadPayload(payload, { resetWorkspace: true });
  }

  private loadPayload(
    payload: JsonRecord,
    options: {
      resetWorkspace: boolean;
      preserveSentenceId?: string | null;
      preserveStructureId?: string | null;
      editorPath?: JsonPath | null;
      editorLabel?: string;
    },
  ): void {
    this.rootPayload = payload;
    this.appearanceMode = this.readAppearanceMode(payload);
    this.sentences = this.extractSentences(payload);

    if (!this.sentences.length) {
      this.workspaceStarted = false;
      this.selectedSentenceIndex = 0;
      this.selectedStructureId = null;
      this.selectedNodePathKey = null;
      this.activeTargetIds.clear();
      this.structureOverlay = null;
      this.queueMotion();
      return;
    }

    const preferredSentenceIndex = options.preserveSentenceId
      ? this.sentences.findIndex((entry) => entry.id === options.preserveSentenceId)
      : -1;
    this.selectedSentenceIndex = preferredSentenceIndex >= 0 ? preferredSentenceIndex : 0;

    this.resetSentenceState(this.currentSentence, options.preserveStructureId ?? null);

    if (options.resetWorkspace) {
      this.workspaceStarted = false;
    }

    if (options.editorPath) {
      this.openEditor(options.editorPath, options.editorLabel ?? this.editorTargetLabel);
      this.editorDirty = false;
    }

    this.queueMotion();
    this.cdr.markForCheck();
  }

  private resetSentenceState(sentence: SentenceSceneVm | null, preferredStructureId: string | null = null): void {
    this.collapsedStructureIds.clear();
    this.collapsedTreebankIds.clear();
    this.selectedNodePathKey = null;

    if (!sentence) {
      this.selectedStructureId = null;
      this.activeTargetIds.clear();
      this.structureOverlay = null;
      this.showMorphology = false;
      return;
    }

    this.showMorphology = sentence.morphologyToggle.defaultExpanded;
    const fallbackStructureId = sentence.structureCards[0]?.id ?? sentence.structureTree.id;
    const structureId = preferredStructureId && this.hasStructure(sentence, preferredStructureId)
      ? preferredStructureId
      : fallbackStructureId;

    this.selectedStructureId = structureId;
    this.activeTargetIds = new Set(this.targetsForStructure(sentence, structureId));

    const activeStructure = this.findNodeById(sentence.structureTree, structureId)
      ?? sentence.structureCards[0]
      ?? sentence.structureTree;
    this.selectedNodePathKey = activeStructure?.pathKey ?? sentence.structureTree.pathKey;
    this.structureOverlay = this.overlayForStructure(sentence, activeStructure);
  }

  private task(): UnitTaskVm | null {
    return this.lesson?.tasks?.find((entry) => entry.task_type === 'sentence_structure') ?? null;
  }

  private normalizeRootPayload(raw: unknown): JsonRecord | null {
    const parsed = this.parseUnknown(raw);
    if (!parsed) return null;

    if (Array.isArray(parsed)) {
      return {
        task_type: 'sentence_structure',
        schema_version: 2,
        items: this.cloneValue(parsed),
      };
    }

    const record = this.asRecord(parsed);
    if (!record) return null;

    if (Array.isArray(record['items'])) {
      return this.cloneValue(record) as JsonRecord;
    }

    if (this.looksLikeSentencePayload(record)) {
      return {
        task_type: 'sentence_structure',
        schema_version: this.toNumber(record['schema_version'], 2),
        items: [this.cloneValue(record)],
      };
    }

    return null;
  }

  private extractSentences(payload: JsonRecord): SentenceSceneVm[] {
    const rawItems = Array.isArray(payload['items']) ? payload['items'] : [];
    return rawItems
      .map((rawItem, index) => this.buildSentence(rawItem, index))
      .filter((item): item is SentenceSceneVm => item != null)
      .sort((a, b) => a.order - b.order);
  }

  private buildSentence(rawItem: unknown, index: number): SentenceSceneVm | null {
    const item = this.asRecord(rawItem);
    if (!item) return null;

    if (this.asRecord(item['structure_tree']) || this.asRecord(item['treebank'])) {
      return this.buildStructuredSentence(item, index);
    }

    return this.buildLegacySentence(item, index);
  }

  private buildStructuredSentence(item: JsonRecord, index: number): SentenceSceneVm | null {
    const rootPath: JsonPath = ['items', index];
    const meta = this.asRecord(item['meta']) ?? {};
    const structureTree = this.toNode(item['structure_tree'], [...rootPath, 'structure_tree'], 0);
    const treebank = this.toNode(item['treebank'], [...rootPath, 'treebank'], 0);
    if (!structureTree || !treebank) return null;

    const sentenceId = this.readString(item['id']) ?? `sentence_${index + 1}`;
    const ref =
      this.readString(meta['sentence_ref'])
      ?? this.readString(meta['quranic_ref'])
      ?? `${this.lesson?.surahId ?? ''}:${index + 1}`;
    const text = this.asRecord(item['text']) ?? {};
    const textAr =
      this.readString(text['text_ar'])
      ?? structureTree.textAr
      ?? treebank.textAr;
    const translationEn =
      this.readString(text['translation_en'])
      ?? structureTree.translationEn
      ?? treebank.translationEn;

    const targetMap = this.toTargetMap(item['structure_to_treebank_map'], structureTree);
    const cards = structureTree.children.length ? structureTree.children : [structureTree];
    const order = this.toNumber(meta['ayah'], index + 1);
    const gsapUi = this.toGsap(item['gsap_ui']);
    const morphologyToggle = this.toMorphologyToggle(item['morphology_toggle']);

    return {
      id: sentenceId,
      order,
      ref,
      title: `Sentence ${index + 1}`,
      textAr,
      translationEn,
      structureTree,
      treebank,
      structureCards: cards,
      targetMap,
      gsapUi,
      morphologyToggle,
      rootPath,
      pathKey: this.pathKey(rootPath),
      legacy: false,
    };
  }

  private buildLegacySentence(item: JsonRecord, index: number): SentenceSceneVm | null {
    const rootPath: JsonPath = ['items', index];
    const summary = this.asRecord(item['structure_summary']) ?? {};
    const order = this.toNumber(item['sentence_order'], index + 1);
    const sentenceType = this.pickFirst(summary, ['sentence_type']) || 'Sentence';
    const fullText =
      this.pickFirst(summary, ['full_text'])
      || this.readString(item['canonical_sentence'])
      || '';

    if (!fullText) return null;

    const corePattern = this.pickFirst(summary, ['core_pattern']);
    const mainComponents = this.toSegments(summary['main_components'], 'main');
    const expansions = this.toSegments(summary['expansions'], 'expansion');
    const explicitSteps = this.toExplicitSteps(item['steps']);
    const steps = explicitSteps.length
      ? explicitSteps
      : this.deriveSteps(sentenceType, fullText, corePattern, mainComponents, expansions);

    const structureRootId = `legacy_${order}_structure_root`;
    const treebankRootId = `legacy_${order}_treebank_root`;
    const structureChildren: SentenceNodeVm[] = [];
    const treebankChildren: SentenceNodeVm[] = [];
    const targetMap = new Map<string, string[]>();

    steps.forEach((step, stepIndex) => {
      const stepPath = explicitSteps.length ? [...rootPath, 'steps', stepIndex] : rootPath;
      const structureId = `legacy_${order}_structure_${stepIndex + 1}`;
      const treebankId = `legacy_${order}_treebank_${stepIndex + 1}`;

      structureChildren.push({
        id: structureId,
        nodeType: 'structure_block',
        subtypeRef: step.kind,
        labelAr: step.title,
        labelEn: step.kindLabel,
        textAr: this.isArabic(step.text) ? step.text : '',
        translationEn: !this.isArabic(step.text) ? step.text : step.detail,
        functionLabel: step.detail,
        features: null,
        morphology: null,
        targets: [treebankId],
        path: stepPath,
        pathKey: this.pathKey(stepPath),
        depth: 1,
        children: [],
      });

      treebankChildren.push({
        id: treebankId,
        nodeType: 'legacy_step',
        subtypeRef: step.kind,
        labelAr: step.title,
        labelEn: step.kindLabel,
        textAr: this.isArabic(step.text) ? step.text : '',
        translationEn: this.isArabic(step.text) ? step.detail : step.text,
        functionLabel: step.pattern || step.detail,
        features: step.grammar.length ? { grammar: step.grammar } : null,
        morphology: null,
        targets: [],
        path: stepPath,
        pathKey: this.pathKey(stepPath),
        depth: 1,
        children: [],
      });

      targetMap.set(structureId, [treebankId]);
    });

    const structureTree: SentenceNodeVm = {
      id: structureRootId,
      nodeType: 'structure_root',
      subtypeRef: 'legacy',
      labelAr: sentenceType,
      labelEn: 'Sentence Frame',
      textAr: fullText,
      translationEn: '',
      functionLabel: corePattern,
      features: null,
      morphology: null,
      targets: [],
      path: rootPath,
      pathKey: this.pathKey(rootPath),
      depth: 0,
      children: structureChildren,
    };

    const treebank: SentenceNodeVm = {
      id: treebankRootId,
      nodeType: 'sentence',
      subtypeRef: 'legacy',
      labelAr: sentenceType,
      labelEn: 'Sentence',
      textAr: fullText,
      translationEn: '',
      functionLabel: corePattern,
      features: null,
      morphology: null,
      targets: [],
      path: rootPath,
      pathKey: this.pathKey(rootPath),
      depth: 0,
      children: treebankChildren,
    };

    return {
      id: `legacy_sentence_${order}`,
      order,
      ref: `${this.lesson?.surahId ?? ''}:${order}`,
      title: `Sentence ${order}`,
      textAr: fullText,
      translationEn: '',
      structureTree,
      treebank,
      structureCards: structureChildren.length ? structureChildren : [structureTree],
      targetMap,
      gsapUi: null,
      morphologyToggle: {
        enabled: false,
        defaultExpanded: false,
        visibleNodeIds: new Set<string>(),
      },
      rootPath,
      pathKey: this.pathKey(rootPath),
      legacy: true,
    };
  }

  private toNode(raw: unknown, path: JsonPath, depth: number): SentenceNodeVm | null {
    const record = this.asRecord(raw);
    if (!record) return null;

    const children = Array.isArray(record['children'])
      ? record['children']
          .map((child, index) => this.toNode(child, [...path, 'children', index], depth + 1))
          .filter((node): node is SentenceNodeVm => node != null)
      : [];

    return {
      id: this.readString(record['id']) ?? `${this.pathKey(path)}_node`,
      nodeType: this.readString(record['node_type']) ?? 'node',
      subtypeRef: this.readString(record['subtype_ref']) ?? '',
      labelAr: this.readString(record['label_ar']) ?? '',
      labelEn: this.readString(record['label_en']) ?? '',
      textAr: this.readString(record['text_ar']) ?? '',
      translationEn: this.readString(record['translation_en']) ?? '',
      functionLabel:
        this.readString(record['function'])
        ?? this.readString(record['function_label'])
        ?? '',
      features: this.asRecord(record['features']),
      morphology: this.asRecord(record['morphology']),
      targets: this.stringArray(record['targets']),
      path,
      pathKey: this.pathKey(path),
      depth,
      children,
    };
  }

  private toTargetMap(raw: unknown, structureTree: SentenceNodeVm): Map<string, string[]> {
    const map = new Map<string, string[]>();

    if (Array.isArray(raw)) {
      raw.forEach((entry) => {
        const record = this.asRecord(entry);
        if (!record) return;
        const id = this.readString(record['structure_id']);
        if (!id) return;
        const targets = this.stringArray(record['targets']);
        if (targets.length) {
          map.set(id, targets);
        }
      });
    }

    this.collectNodeTargets(structureTree, map);
    return map;
  }

  private collectNodeTargets(node: SentenceNodeVm, map: Map<string, string[]>): void {
    if (node.targets.length && !map.has(node.id)) {
      map.set(node.id, [...node.targets]);
    }
    node.children.forEach((child) => this.collectNodeTargets(child, map));
  }

  private toGsap(raw: unknown): SentenceGsapVm | null {
    const record = this.asRecord(raw);
    if (!record) return null;
    return {
      rootTimelines: this.asRecord(record['root_timelines']) ?? {},
      structureClickTimelines: Array.isArray(record['structure_click_timelines'])
        ? record['structure_click_timelines'].map((entry) => this.asRecord(entry) ?? {})
        : [],
      treebankExpandTimelines: this.asRecord(record['treebank_expand_timelines']) ?? {},
      sharedVisualStates: this.asRecord(record['shared_visual_states']) ?? {},
    };
  }

  private toMorphologyToggle(raw: unknown): SentenceMorphologyToggleVm {
    const record = this.asRecord(raw);
    return {
      enabled: Boolean(record?.['enabled']),
      defaultExpanded: this.readString(record?.['default_state']) === 'expanded',
      visibleNodeIds: new Set(this.stringArray(record?.['visible_on_nodes'])),
    };
  }

  private readAppearanceMode(payload: JsonRecord): AppearanceMode {
    const ui = this.asRecord(payload['ui']) ?? {};
    const raw =
      this.readString(ui['background_mode'])
      ?? this.readString(ui['appearance_mode'])
      ?? this.readString(payload['background_mode'])
      ?? 'light_soft';
    return raw === 'dark_transparent' ? 'dark_transparent' : 'light_soft';
  }

  private targetsForStructure(sentence: SentenceSceneVm, structureId: string | null): string[] {
    if (!structureId) return [];
    return sentence.targetMap.get(structureId) ?? [];
  }

  private overlayForStructure(sentence: SentenceSceneVm, node: SentenceNodeVm | null): FocusOverlayVm | null {
    if (!node) return null;

    const timeline = sentence.gsapUi?.structureClickTimelines.find((entry) => {
      return this.readString(entry['structure_id']) === node.id;
    }) ?? null;

    if (timeline) {
      const steps = Array.isArray(timeline['steps']) ? timeline['steps'] : [];
      for (const step of steps) {
        const record = this.asRecord(step);
        if (!record || this.readString(record['action']) !== 'show_structure_text') continue;
        return {
          textAr: this.readString(record['text_ar']) ?? node.textAr,
          translationEn: this.readString(record['translation_en']) ?? node.translationEn,
        };
      }
    }

    const textAr = node.textAr || sentence.textAr;
    const translationEn = node.translationEn || sentence.translationEn;
    if (!textAr && !translationEn) return null;
    return { textAr, translationEn };
  }

  private hasStructure(sentence: SentenceSceneVm, structureId: string): boolean {
    return Boolean(this.findNodeById(sentence.structureTree, structureId));
  }

  private findNodeById(node: SentenceNodeVm, targetId: string): SentenceNodeVm | null {
    if (node.id === targetId) return node;
    for (const child of node.children) {
      const found = this.findNodeById(child, targetId);
      if (found) return found;
    }
    return null;
  }

  private findNodeByPathKey(node: SentenceNodeVm, pathKey: string): SentenceNodeVm | null {
    if (node.pathKey === pathKey) return node;
    for (const child of node.children) {
      const found = this.findNodeByPathKey(child, pathKey);
      if (found) return found;
    }
    return null;
  }

  private openEditor(path: JsonPath, label: string): void {
    if (!this.rootPayload) return;
    const value = this.getByPath(this.rootPayload, path);
    this.editorVisible = true;
    this.editorTargetPath = [...path];
    this.editorTargetLabel = label;
    this.editorText = JSON.stringify(value, null, 2);
    this.editorDirty = false;
    this.editorError = '';
    this.commitState = 'idle';
    this.commitMessage = '';
  }

  private applyParsedEdit(parsed: unknown): JsonRecord | null {
    if (!this.rootPayload || !this.editorTargetPath) return null;

    let nextPayload: unknown;
    if (this.editorTargetPath.length === 0) {
      nextPayload = parsed;
    } else {
      nextPayload = this.cloneValue(this.rootPayload);
      this.setByPath(nextPayload, this.editorTargetPath, parsed);
    }

    const normalized = this.normalizeRootPayload(nextPayload);
    if (!normalized) {
      this.editorError = 'Edited JSON no longer matches a valid sentence-structure task payload.';
      return null;
    }

    return normalized;
  }

  private parseEditorJson(): unknown {
    try {
      return JSON.parse(this.editorText);
    } catch (error: unknown) {
      this.editorError = error instanceof Error ? error.message : 'Invalid JSON.';
      return null;
    }
  }

  private parseUnknown(raw: unknown): unknown {
    if (typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  private queueMotion(): void {
    if (!this.viewReady) return;
    if (this.motionTimeout) clearTimeout(this.motionTimeout);
    this.motionTimeout = setTimeout(() => this.runMotion(), 40);
  }

  private runMotion(): void {
    this.motionTimeout = null;
    this.clearMotion();

    if (!this.workspaceStarted || !this.currentSentence) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const root = this.host.nativeElement as HTMLElement;
    const structurePanel = root.querySelector<HTMLElement>('.sst__panel--structure');
    const treebankPanel = root.querySelector<HTMLElement>('.sst__panel--treebank');
    const hero = root.querySelector<HTMLElement>('.sst__hero');
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.sst__task-card'));

    if (hero) {
      gsap.fromTo(
        hero,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out', clearProps: 'transform' },
      );
    }

    this.animateElement(structurePanel, this.structureEnterMotion(this.currentSentence));
    this.animateElement(treebankPanel, this.treebankEnterMotion(this.currentSentence));

    if (cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.34, stagger: 0.05, ease: 'power2.out', clearProps: 'transform' },
      );
    }

    this.runFocusAnimation(this.currentSentence);
  }

  private runFocusAnimation(sentence: SentenceSceneVm): void {
    const root = this.host.nativeElement as HTMLElement;
    const structureId = this.selectedStructureId;
    if (!structureId) return;

    const timeline = sentence.gsapUi?.structureClickTimelines.find((entry) => {
      return this.readString(entry['structure_id']) === structureId;
    }) ?? null;

    const structureEl = root.querySelector<HTMLElement>(`[data-structure-id="${structureId}"]`);
    if (structureEl) {
      gsap.fromTo(
        structureEl,
        { opacity: 0.82, scale: 0.98, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform' },
      );
    }

    const targetIds = Array.from(this.activeTargetIds);
    const targetEls = targetIds
      .map((targetId) => root.querySelector<HTMLElement>(`[data-treebank-id="${targetId}"]`))
      .filter((el): el is HTMLElement => !!el);

    const revealStep = timeline
      ? this.findTimelineStep(timeline, 'reveal_targets_one_by_one')
      : null;

    if (targetEls.length) {
      gsap.fromTo(
        targetEls,
        this.gsapVars(this.asRecord(revealStep?.['from'])) ?? { opacity: 0.35, scale: 0.96, y: 10 },
        {
          ...(this.gsapVars(this.asRecord(revealStep?.['to'])) ?? {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.28,
            ease: 'power2.out',
            stagger: 0.07,
          }),
          clearProps: 'transform',
        },
      );
    }

    const overlayEl = root.querySelector<HTMLElement>('.sst__overlay');
    this.animateElement(overlayEl, this.overlayMotion(sentence));
  }

  private structureEnterMotion(sentence: SentenceSceneVm): MotionConfig {
    const record = sentence.gsapUi?.rootTimelines;
    return {
      from: this.asRecord(this.asRecord(record?.['structure_tree_enter'])?.['from']) ?? DEFAULT_STRUCTURE_ENTER.from ?? null,
      to: this.asRecord(this.asRecord(record?.['structure_tree_enter'])?.['to']) ?? DEFAULT_STRUCTURE_ENTER.to ?? null,
    };
  }

  private treebankEnterMotion(sentence: SentenceSceneVm): MotionConfig {
    const record = sentence.gsapUi?.rootTimelines;
    return {
      from: this.asRecord(this.asRecord(record?.['treebank_enter'])?.['from']) ?? DEFAULT_TREEBANK_ENTER.from ?? null,
      to: this.asRecord(this.asRecord(record?.['treebank_enter'])?.['to']) ?? DEFAULT_TREEBANK_ENTER.to ?? null,
    };
  }

  private overlayMotion(sentence: SentenceSceneVm): MotionConfig {
    const shared = sentence.gsapUi?.sharedVisualStates;
    return {
      from: this.asRecord(this.asRecord(shared?.['structure_text_overlay'])?.['from']) ?? DEFAULT_OVERLAY_ENTER.from ?? null,
      to: this.asRecord(this.asRecord(shared?.['structure_text_overlay'])?.['to']) ?? DEFAULT_OVERLAY_ENTER.to ?? null,
    };
  }

  private findTimelineStep(timeline: JsonRecord, action: string): JsonRecord | null {
    const steps = Array.isArray(timeline['steps']) ? timeline['steps'] : [];
    for (const step of steps) {
      const record = this.asRecord(step);
      if (record && this.readString(record['action']) === action) {
        return record;
      }
    }
    return null;
  }

  private animateElement(element: HTMLElement | null, motion: MotionConfig): void {
    if (!element) return;
    gsap.fromTo(
      element,
      this.gsapVars(motion.from ?? null) ?? { opacity: 0 },
      { ...(this.gsapVars(motion.to ?? null) ?? { opacity: 1, duration: 0.35, ease: 'power2.out' }), clearProps: 'transform' },
    );
  }

  private gsapVars(record: JsonRecord | null): gsap.TweenVars | null {
    if (!record) return null;
    return { ...record } as gsap.TweenVars;
  }

  private clearMotion(): void {
    const root = this.host.nativeElement as HTMLElement;
    const nodes = root.querySelectorAll('.sst__hero, .sst__panel, .sst__task-card, .sst__overlay, .sst-node');
    gsap.killTweensOf(nodes);
    gsap.set(nodes, { clearProps: 'all' });
  }

  private getByPath(source: unknown, path: JsonPath): unknown {
    let current = source;
    for (const segment of path) {
      if (Array.isArray(current) && typeof segment === 'number') {
        current = current[segment];
        continue;
      }
      const record = this.asRecord(current);
      if (!record || typeof segment !== 'string') return null;
      current = record[segment];
    }
    return current;
  }

  private setByPath(source: unknown, path: JsonPath, value: unknown): void {
    if (!path.length) return;

    let current = source as JsonRecord | unknown[];
    for (let index = 0; index < path.length - 1; index += 1) {
      const segment = path[index];
      if (Array.isArray(current) && typeof segment === 'number') {
        current = current[segment] as JsonRecord | unknown[];
        continue;
      }
      if (!Array.isArray(current) && typeof segment === 'string') {
        current = (current as JsonRecord)[segment] as JsonRecord | unknown[];
      }
    }

    const last = path[path.length - 1];
    if (Array.isArray(current) && typeof last === 'number') {
      current[last] = value;
      return;
    }
    if (!Array.isArray(current) && typeof last === 'string') {
      (current as JsonRecord)[last] = value;
    }
  }

  private cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private looksLikeSentencePayload(record: JsonRecord): boolean {
    return Boolean(
      this.asRecord(record['structure_tree'])
      || this.asRecord(record['treebank'])
      || this.asRecord(record['text'])
      || this.readString(record['canonical_sentence'])
      || this.asRecord(record['structure_summary']),
    );
  }

  private asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as JsonRecord
      : null;
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value
          .map((entry) => String(entry ?? '').trim())
          .filter((entry) => entry.length > 0)
      : [];
  }

  private pathKey(path: JsonPath): string {
    return path.map((segment) => String(segment)).join('.');
  }

  isArabic(value: string | null | undefined): boolean {
    return ARABIC_SCRIPT_RE.test(String(value ?? ''));
  }

  dirFor(value: string | null | undefined): 'rtl' | 'ltr' | null {
    const text = String(value ?? '').trim();
    if (!text) return null;
    return this.isArabic(text) ? 'rtl' : 'ltr';
  }

  private valueToInlineString(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map((entry) => this.valueToInlineString(entry)).filter(Boolean).join(' | ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private pickFirst(source: JsonRecord, keys: string[]): string {
    for (const key of keys) {
      const value = this.readString(source[key]);
      if (value) return value;
    }
    return '';
  }

  private toReadableLabel(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (this.isArabic(raw)) return raw;
    const spaced = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const lower = spaced.toLowerCase();
    return lower.replace(/(^|[\s/])([a-z])/g, (_match, prefix: string, chr: string) => `${prefix}${chr.toUpperCase()}`);
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private toSegments(raw: unknown, kind: 'main' | 'expansion'): SentenceSegmentVm[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry, index) => {
        const record = this.asRecord(entry) ?? {};
        const label =
          this.toReadableLabel(this.pickFirst(record, ['component', 'type', 'label']))
          || `${kind === 'main' ? 'Component' : 'Expansion'} ${index + 1}`;
        const text = this.pickFirst(record, ['text', 'phrase', 'value']);
        const detail = this.pickFirst(record, ['role', 'function', 'description', 'explanation']);
        const pattern = this.pickFirst(record, ['pattern']);
        const grammar = this.stringArray(record['grammar']).map((tag) => this.toReadableLabel(tag));
        if (!text && !detail && !pattern) return null;
        return {
          id: `${kind}_${index + 1}`,
          label,
          text,
          detail,
          pattern,
          grammar,
          tone: this.toneFor(label, index, kind === 'expansion'),
        };
      })
      .filter((segment): segment is SentenceSegmentVm => segment != null);
  }

  private toExplicitSteps(raw: unknown): SentenceStepVm[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry, index) => {
        const record = this.asRecord(entry) ?? {};
        const title = this.toReadableLabel(this.pickFirst(record, ['title', 'label', 'component', 'type', 'step']));
        const text = this.pickFirst(record, ['text', 'phrase', 'value']);
        const detail = this.pickFirst(record, ['detail', 'description', 'explanation', 'role', 'function']);
        const pattern = this.pickFirst(record, ['pattern']);
        const grammar = [
          ...this.stringArray(record['grammar']),
          ...this.stringArray(record['tags']),
        ].map((tag) => this.toReadableLabel(tag));

        if (!title && !text && !detail) return null;
        const kind = this.stepKind(this.pickFirst(record, ['kind', 'phase', 'section']));
        return {
          id: `step_${index + 1}`,
          order: index + 1,
          kind,
          kindLabel: this.kindLabel(kind),
          title: title || `${this.kindLabel(kind)} ${index + 1}`,
          text,
          detail,
          pattern,
          grammar,
          tone: this.toneFor(title || detail || text, index, kind === 'expansion'),
        };
      })
      .filter((step): step is SentenceStepVm => step != null);
  }

  private deriveSteps(
    sentenceType: string,
    fullText: string,
    corePattern: string,
    mainComponents: SentenceSegmentVm[],
    expansions: SentenceSegmentVm[],
  ): SentenceStepVm[] {
    const steps: SentenceStepVm[] = [{
      id: 'frame',
      order: 1,
      kind: 'frame',
      kindLabel: this.kindLabel('frame'),
      title: sentenceType || 'Sentence Frame',
      text: fullText,
      detail: 'Start from the full clause, then move through the main structure before the attached phrases.',
      pattern: corePattern,
      grammar: [],
      tone: 'gold',
    }];

    for (const segment of mainComponents) {
      steps.push({
        id: `main_${segment.id}`,
        order: steps.length + 1,
        kind: 'main',
        kindLabel: this.kindLabel('main'),
        title: segment.label,
        text: segment.text,
        detail: segment.detail || 'Key part of the sentence frame.',
        pattern: segment.pattern,
        grammar: segment.grammar,
        tone: segment.tone,
      });
    }

    for (const segment of expansions) {
      steps.push({
        id: `exp_${segment.id}`,
        order: steps.length + 1,
        kind: 'expansion',
        kindLabel: this.kindLabel('expansion'),
        title: segment.label,
        text: segment.text,
        detail: segment.detail || 'Supporting phrase that clarifies or extends the main structure.',
        pattern: segment.pattern,
        grammar: segment.grammar,
        tone: segment.tone,
      });
    }

    return steps;
  }

  private kindLabel(kind: SentenceStepKind): string {
    if (kind === 'main') return 'Main Component';
    if (kind === 'expansion') return 'Expansion';
    return 'Sentence Frame';
  }

  private stepKind(value: string): SentenceStepKind {
    const normalized = value.toLowerCase();
    if (normalized.includes('expand')) return 'expansion';
    if (normalized.includes('main') || normalized.includes('component')) return 'main';
    return 'frame';
  }

  private toneFor(value: string, index: number, isExpansion = false): SentenceTone {
    const normalized = value.toLowerCase();
    if (normalized.includes('main')) return 'gold';
    if (normalized.includes('cause') || normalized.includes('reason') || normalized.includes('result')) return 'amber';
    if (normalized.includes('clarif') || normalized.includes('apposition') || normalized.includes('relative')) return 'cyan';
    if (normalized.includes('circumstantial') || normalized.includes('khabar') || normalized.includes('laalla')) return 'mint';
    if (normalized.includes('idafa') || normalized.includes('adjective') || normalized.includes('preposition')) return 'cyan';
    return isExpansion ? 'slate' : index === 0 ? 'gold' : 'slate';
  }
}
