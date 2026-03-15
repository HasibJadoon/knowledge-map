import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

import {
  KmapsSourceType,
  KmapsUnitType,
  formatSourceTypeLabel,
  formatUnitTypeLabel,
} from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';
import { CreateWorldviewSourceInput, WorldviewSourceUnitDraftInput } from '../../../../../shared/services/worldview-api.service';

type ParentOption = {
  clientId: string;
  label: string;
};

const SOURCE_TYPE_OPTIONS: KmapsSourceType[] = [
  'document',
  'book',
  'article',
  'lecture',
  'podcast',
  'video',
  'story',
  'paper',
  'conversation',
  'other',
];

const UNIT_TYPE_OPTIONS: KmapsUnitType[] = ['passage', 'chapter', 'section', 'heading', 'topic', 'segment', 'scene', 'timestamp', 'other'];

@Component({
  selector: 'app-source-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './source-editor-modal.html',
  styleUrl: './source-editor-modal.scss',
})
export class SourceEditorModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  @Input() sourceId: string | null = null;

  readonly saving = signal(false);
  readonly form = this.fb.nonNullable.group({
    sourceType: this.fb.nonNullable.control<KmapsSourceType>('document'),
    title: this.fb.nonNullable.control(''),
    subtitle: this.fb.nonNullable.control(''),
    description: this.fb.nonNullable.control(''),
    creator: this.fb.nonNullable.control(''),
    publisher: this.fb.nonNullable.control(''),
    publicationYear: this.fb.nonNullable.control(''),
    language: this.fb.nonNullable.control(''),
    sourceUrl: this.fb.nonNullable.control(''),
    sourceRef: this.fb.nonNullable.control(''),
    units: this.fb.array<FormGroup>([]),
  });

  readonly source = computed(() => this.workflow.getSource(this.sourceId?.trim() || null));
  readonly isEditMode = computed(() => !!this.sourceId?.trim() && !!this.source());
  readonly headerTitle = computed(() => (this.isEditMode() ? 'Edit Source' : 'Add Source'));

  ngOnInit(): void {
    const source = this.source();
    if (source) {
      this.form.patchValue({
        sourceType: source.sourceType,
        title: source.title,
        subtitle: source.subtitle ?? '',
        description: source.description ?? '',
        creator: source.creator ?? '',
        publisher: source.publisher ?? '',
        publicationYear: source.publicationYear ? String(source.publicationYear) : '',
        language: source.language ?? '',
        sourceUrl: source.sourceUrl ?? '',
        sourceRef: source.sourceRef ?? '',
      });
      return;
    }

    this.addUnitDraft();
  }

  get sourceTypeOptions(): KmapsSourceType[] {
    return SOURCE_TYPE_OPTIONS;
  }

  get unitTypeOptions(): KmapsUnitType[] {
    return UNIT_TYPE_OPTIONS;
  }

  get unitsArray(): FormArray<FormGroup> {
    return this.form.controls.units;
  }

  trackUnitDraft(index: number, control: AbstractControl): string {
    return String(control.get('clientId')?.value ?? index);
  }

  parentOptionsFor(index: number): ParentOption[] {
    return this.unitsArray.controls
      .slice(0, index)
      .map((control, optionIndex) => {
        const title = String(control.get('title')?.value ?? '').trim();
        const unitType = String(control.get('unitType')?.value ?? 'section') as KmapsUnitType;
        return {
          clientId: String(control.get('clientId')?.value ?? `unit-${optionIndex + 1}`),
          label: title || `${this.unitTypeLabel(unitType)} ${optionIndex + 1}`,
        } satisfies ParentOption;
      });
  }

  addUnitDraft(): void {
    this.unitsArray.push(
      this.fb.nonNullable.group({
        clientId: crypto.randomUUID(),
        parentClientId: '',
        unitType: 'passage' as KmapsUnitType,
        title: '',
        startRef: '',
        endRef: '',
        anchorText: '',
        summary: '',
        readingBodyText: '',
      }),
    );
  }

  removeUnitDraft(index: number): void {
    this.unitsArray.removeAt(index);
  }

  sourceTypeLabel(type: KmapsSourceType): string {
    return formatSourceTypeLabel(type);
  }

  unitTypeLabel(type: KmapsUnitType): string {
    return formatUnitTypeLabel(type);
  }

  close(): Promise<boolean> {
    return this.modalController.dismiss(null, 'close');
  }

  async save(): Promise<void> {
    if (this.saving()) {
      return;
    }

    const title = this.form.controls.title.value.trim();
    if (!title) {
      await this.presentToast('Source title is required.');
      return;
    }

    const unitDrafts = this.buildUnitDrafts();
    if (!this.isEditMode()) {
      const incompleteUnit = unitDrafts.find((unit) => !unit.title.trim());
      if (incompleteUnit) {
        await this.presentToast('Each unit draft needs a title before saving.');
        return;
      }
    }

    this.saving.set(true);

    try {
      if (this.isEditMode()) {
        const result = await this.workflow.updateSource({
          sourceId: this.sourceId!.trim(),
          source: this.buildSourcePayload(),
        });
        await this.presentToast('Source updated.');
        await this.modalController.dismiss({ sourceId: result.sourceId }, 'save');
        return;
      }

      const result = await this.workflow.createSourceWithUnits({
        source: this.buildSourcePayload(),
        units: unitDrafts,
      } satisfies CreateWorldviewSourceInput);

      await this.presentToast('Source created.');
      await this.modalController.dismiss({ sourceId: result.sourceId }, 'save');
    } catch (error: unknown) {
      await this.presentToast(error instanceof Error ? error.message : 'Failed to save source.');
    } finally {
      this.saving.set(false);
    }
  }

  private buildSourcePayload() {
    return {
      sourceType: this.form.controls.sourceType.value,
      title: this.form.controls.title.value.trim(),
      subtitle: normalizeOptional(this.form.controls.subtitle.value),
      description: normalizeOptional(this.form.controls.description.value),
      creator: normalizeOptional(this.form.controls.creator.value),
      publisher: normalizeOptional(this.form.controls.publisher.value),
      publicationYear: normalizeYear(this.form.controls.publicationYear.value),
      language: normalizeOptional(this.form.controls.language.value),
      sourceUrl: normalizeOptional(this.form.controls.sourceUrl.value),
      sourceRef: normalizeOptional(this.form.controls.sourceRef.value),
    };
  }

  private buildUnitDrafts(): WorldviewSourceUnitDraftInput[] {
    if (this.isEditMode()) {
      return [];
    }

    const drafts: WorldviewSourceUnitDraftInput[] = [];

    this.unitsArray.controls.forEach((control, index) => {
      const title = String(control.get('title')?.value ?? '').trim();
      const startRef = normalizeOptional(String(control.get('startRef')?.value ?? ''));
      const endRef = normalizeOptional(String(control.get('endRef')?.value ?? ''));
      const summary = normalizeOptional(String(control.get('summary')?.value ?? ''));
      const readingBody = splitReadingBody(String(control.get('readingBodyText')?.value ?? ''));
      const hasContent = !!title || !!startRef || !!summary || readingBody.length > 0;

      if (!hasContent) {
        return;
      }

      drafts.push({
        clientId: String(control.get('clientId')?.value ?? crypto.randomUUID()),
        parentClientId: normalizeOptional(String(control.get('parentClientId')?.value ?? '')),
        unitType: control.get('unitType')?.value as KmapsUnitType,
        title,
        orderIndex: index + 1,
        startRef,
        endRef,
        anchorText: normalizeOptional(String(control.get('anchorText')?.value ?? '')),
        summary,
        readingBody,
        readingMinutes: null,
        locatorLabel: composeLocatorLabel(startRef, endRef),
      });
    });

    return drafts;
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'bottom',
    });
    await toast.present();
  }
}

function normalizeOptional(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function normalizeYear(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const year = Math.trunc(parsed);
  return year >= 1 && year <= 3000 ? year : null;
}

function splitReadingBody(value: string): string[] {
  return value
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function composeLocatorLabel(startRef: string | null, endRef: string | null): string | null {
  if (startRef && endRef && startRef !== endRef) {
    return `${startRef}-${endRef}`;
  }

  return startRef ?? endRef ?? null;
}
