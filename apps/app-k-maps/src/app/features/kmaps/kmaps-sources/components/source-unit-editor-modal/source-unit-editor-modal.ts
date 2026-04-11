import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

import { KmapsSourceUnit, KmapsUnitType, formatUnitTypeLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../../../shared/services/kmaps-workflow.service';

type ParentOption = {
  id: string | null;
  label: string;
};

const UNIT_TYPE_OPTIONS: KmapsUnitType[] = ['passage', 'chapter', 'section', 'heading', 'topic', 'segment', 'scene', 'timestamp', 'other'];

@Component({
  selector: 'app-source-unit-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './source-unit-editor-modal.html',
  styleUrl: './source-unit-editor-modal.scss',
})
export class SourceUnitEditorModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  @Input({ required: true }) sourceId = '';
  @Input() unitId: string | null = null;
  @Input() initialParentUnitId: string | null = null;

  readonly saving = signal(false);
  readonly unit = computed(() => this.workflow.getUnit(this.unitId?.trim() || null));
  readonly sourceUnits = computed(() => this.workflow.getUnitsForSource(this.sourceId));
  readonly parentOptions = computed(() => buildParentOptions(this.sourceUnits(), this.unit()));
  readonly isEditMode = computed(() => !!this.unit());
  readonly headerTitle = computed(() => (this.isEditMode() ? 'Edit Unit' : this.initialParentUnitId ? 'Add Subunit' : 'Add Unit'));
  readonly form = this.fb.nonNullable.group({
    unitType: this.fb.nonNullable.control<KmapsUnitType>('passage'),
    title: this.fb.nonNullable.control(''),
    parentUnitId: this.fb.nonNullable.control(''),
    startRef: this.fb.nonNullable.control(''),
    endRef: this.fb.nonNullable.control(''),
    anchorText: this.fb.nonNullable.control(''),
    summary: this.fb.nonNullable.control(''),
    readingBodyText: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    const unit = this.unit();
    if (unit) {
      this.form.patchValue({
        unitType: unit.unitType,
        title: unit.title,
        parentUnitId: unit.parentUnitId ?? '',
        startRef: unit.startRef ?? '',
        endRef: unit.endRef ?? '',
        anchorText: unit.anchorText ?? '',
        summary: unit.summary ?? '',
        readingBodyText: unit.readingBody.join('\n'),
      });
      return;
    }

    this.form.patchValue({
      parentUnitId: this.initialParentUnitId ?? '',
      unitType: this.initialParentUnitId ? 'segment' : 'passage',
    });
  }

  get unitTypeOptions(): KmapsUnitType[] {
    return UNIT_TYPE_OPTIONS;
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
      await this.presentToast('Unit title is required.');
      return;
    }

    const payload = {
      sourceId: this.sourceId,
      parentUnitId: normalizeOptional(this.form.controls.parentUnitId.value),
      unitType: this.form.controls.unitType.value,
      title,
      startRef: normalizeOptional(this.form.controls.startRef.value),
      endRef: normalizeOptional(this.form.controls.endRef.value),
      anchorText: normalizeOptional(this.form.controls.anchorText.value),
      summary: normalizeOptional(this.form.controls.summary.value),
      readingBody: splitReadingBody(this.form.controls.readingBodyText.value),
      readingSchema: this.unit()?.readingSchema ?? null,
      readingBlocks: this.unit()?.readingBlocks ?? null,
      locatorLabel: composeLocatorLabel(
        normalizeOptional(this.form.controls.startRef.value),
        normalizeOptional(this.form.controls.endRef.value),
      ),
    };

    this.saving.set(true);

    try {
      if (this.isEditMode()) {
        const result = await this.workflow.updateUnit({
          unitId: this.unitId!,
          unit: payload,
        });
        await this.presentToast('Unit updated.');
        await this.modalController.dismiss({ unitId: result.unitId }, 'save');
        return;
      }

      const result = await this.workflow.createUnit(payload);
      await this.presentToast(this.initialParentUnitId ? 'Subunit created.' : 'Unit created.');
      await this.modalController.dismiss({ unitId: result.unitId }, 'save');
    } catch (error: unknown) {
      await this.presentToast(error instanceof Error ? error.message : 'Failed to save unit.');
    } finally {
      this.saving.set(false);
    }
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

function buildParentOptions(units: KmapsSourceUnit[], currentUnit: KmapsSourceUnit | null): ParentOption[] {
  const blockedIds = new Set(currentUnit ? collectDescendantIds(units, currentUnit.id) : []);
  if (currentUnit) {
    blockedIds.add(currentUnit.id);
  }

  return [
    { id: null, label: 'Top level' },
    ...units
      .filter((unit) => !blockedIds.has(unit.id))
      .map((unit) => ({
        id: unit.id,
        label: unit.title,
      })),
  ];
}

function collectDescendantIds(units: KmapsSourceUnit[], unitId: string): string[] {
  const descendantIds: string[] = [];
  const queue = [unitId];

  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const children = units.filter((unit) => unit.parentUnitId === currentId).map((unit) => unit.id);
    descendantIds.push(...children);
    queue.push(...children);
  }

  return descendantIds;
}

function normalizeOptional(value: string): string | null {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
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
