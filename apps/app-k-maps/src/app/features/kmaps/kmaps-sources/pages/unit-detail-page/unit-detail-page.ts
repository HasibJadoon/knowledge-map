import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { isAdminToken } from '../../../../../core/auth/auth.utils';
import { KmapsUnitBottomTabsComponent } from '../../../kmaps-shared/components/unit-bottom-tabs/unit-bottom-tabs';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsNote, KmapsSourceUnit, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';

type OverviewMetric = {
  key: 'highlights' | 'notes' | 'nodes' | 'distill';
  label: string;
  value: number;
  tone: 'yellow' | 'blue' | 'green' | 'purple';
};

@Component({
  selector: 'app-unit-detail-page',
  standalone: true,
  imports: [CommonModule, IonicModule, KmapsPageHeaderComponent, KmapsUnitBottomTabsComponent],
  templateUrl: './unit-detail-page.html',
  styleUrl: './unit-detail-page.scss',
})
export class UnitDetailPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);
  readonly canManageDistill = isAdminToken(localStorage.getItem('auth_token'));

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly isEditingSummary = signal(false);
  readonly summaryDraft = signal('');
  readonly summaryOverride = signal<string | null>(null);

  readonly source = computed(() => this.workflow.getSource(this.sourceId()));
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly scopedNotes = computed(() => this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()));
  readonly highlightNotes = computed(() =>
    this.scopedNotes()
      .filter((note) => note.noteKind === 'highlight')
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
  );
  readonly recentNotes = computed(() =>
    this.scopedNotes()
      .filter((note) => note.noteKind !== 'highlight')
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 3),
  );
  readonly recentHighlights = computed(() => this.highlightNotes().slice(0, 3));
  readonly nodeCount = computed(() => this.workflow.getConceptsForContext(this.sourceId(), this.unitId()).length);
  readonly distillItemCount = computed(() =>
    this.scopedNotes().filter((note) =>
      note.noteKind === 'highlight' ||
      note.noteKind === 'reflection' ||
      note.noteKind === 'question' ||
      note.noteKind === 'claim_seed' ||
      note.noteKind === 'insight',
    ).length,
  );
  readonly metrics = computed<OverviewMetric[]>(() => [
    { key: 'highlights', label: 'Highlights', value: this.highlightNotes().length, tone: 'yellow' },
    { key: 'notes', label: 'Notes', value: this.recentNotes().length, tone: 'blue' },
    { key: 'nodes', label: 'Nodes', value: this.nodeCount(), tone: 'green' },
    { key: 'distill', label: 'Distill Items', value: this.distillItemCount(), tone: 'purple' },
  ]);
  readonly lastReadingDateLabel = computed(() => formatSessionDay(this.source()?.lastOpenedAt));
  readonly lastReadingDurationLabel = computed(() => `${Math.max(this.unit()?.readingMinutes ?? 0, 12)} min`);
  readonly lastReadingPositionLabel = computed(() => this.sourceRecentLocator() || this.unit()?.locatorLabel || 'No marker yet');
  readonly summaryText = computed(
    () =>
      this.summaryOverride() ||
      this.unit()?.summary ||
      'Add the chapter summary to anchor your highlights, notes, and distill work.',
  );
  readonly keyThemes = computed(() => buildThemeLabels(this.workflow.getConceptsForContext(this.sourceId(), this.unitId()), this.unit()));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
      this.summaryOverride.set(null);
      this.isEditingSummary.set(false);
    });

    effect(() => {
      if (!this.isEditingSummary()) {
        this.summaryDraft.set(this.summaryText());
      }
    });
  }

  async saveSummary(): Promise<void> {
    const nextSummary = this.summaryDraft().trim();
    this.summaryOverride.set(nextSummary || this.unit()?.summary || null);
    this.isEditingSummary.set(false);

    const toast = await this.toastController.create({
      message: 'Summary updated for this workspace view.',
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
  }

  cancelSummaryEdit(): void {
    this.isEditingSummary.set(false);
    this.summaryDraft.set(this.summaryText());
  }

  startSummaryEdit(): void {
    this.summaryDraft.set(this.summaryText());
    this.isEditingSummary.set(true);
  }

  onSummaryInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.summaryDraft.set(target?.value ?? '');
  }

  openHighlights(): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'distill']);
  }

  openNotes(): void {
    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'notes']);
  }

  startDistill(): void {
    this.openHighlights();
  }

  onMetricSelected(metric: OverviewMetric): void {
    if (metric.key === 'highlights' || metric.key === 'distill') {
      this.openHighlights();
      return;
    }

    if (metric.key === 'notes') {
      this.openNotes();
      return;
    }

    void this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'concepts']);
  }

  noteKindLabel(note: KmapsNote): string {
    return formatNoteKindLabel(note.noteKind);
  }

  notePreview(note: KmapsNote, maxLength = 110): string {
    const value = (note.excerptText || note.bodyMd || note.title || '').trim();
    return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
  }

  noteMeta(note: KmapsNote): string {
    return [note.locator, formatRelativeTime(note.createdAt)].filter(Boolean).join(' • ');
  }

  trackNote(_: number, note: KmapsNote): string {
    return note.id;
  }

  private sourceRecentLocator(): string {
    const value = this.source()?.sourceJson?.['recentLocator'];
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
}

function formatSessionDay(value: string | null | undefined): string {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);
  const now = new Date();
  const delta = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (delta < oneDay) {
    return 'Today';
  }

  if (delta < oneDay * 2) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const deltaMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const hours = Math.round(deltaMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function buildThemeLabels(labels: Array<{ label: string }>, unit: KmapsSourceUnit | null): string[] {
  const unique = new Set<string>();
  const themes: string[] = [];

  for (const concept of labels) {
    const label = concept.label.trim();
    if (!label || unique.has(label.toLowerCase())) {
      continue;
    }

    unique.add(label.toLowerCase());
    themes.push(label);
    if (themes.length === 4) {
      return themes;
    }
  }

  const haystack = `${unit?.title || ''} ${unit?.summary || ''} ${unit?.anchorText || ''}`.toLowerCase();
  const keywordThemes = [
    { match: 'trust', label: 'Trust' },
    { match: 'authority', label: 'Authority' },
    { match: 'virtue', label: 'Virtue' },
    { match: 'ethic', label: 'Ethics' },
    { match: 'memory', label: 'Institutional Memory' },
    { match: 'discipline', label: 'Discipline' },
    { match: 'power', label: 'Power' },
    { match: 'legitim', label: 'Legitimacy' },
    { match: 'justice', label: 'Justice' },
  ];

  for (const entry of keywordThemes) {
    if (!haystack.includes(entry.match) || unique.has(entry.label.toLowerCase())) {
      continue;
    }

    unique.add(entry.label.toLowerCase());
    themes.push(entry.label);
    if (themes.length === 4) {
      break;
    }
  }

  while (themes.length < 4) {
    themes.push(['Insight', 'Chapter Flow', 'Distill Queue', 'Reading Memory'][themes.length] || 'Theme');
  }

  return themes.slice(0, 4);
}
