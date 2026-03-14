import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { KmapsUnitBottomTabsComponent } from '../../../kmaps-shared/components/unit-bottom-tabs/unit-bottom-tabs';
import { KmapsPageHeaderComponent } from '../../../kmaps-shared/components/page-header/page-header';
import { KmapsNoteKind, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-quick-capture-note-page',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, KmapsPageHeaderComponent, KmapsUnitBottomTabsComponent],
  templateUrl: './quick-capture-note-page.html',
  styleUrl: './quick-capture-note-page.scss',
})
export class QuickCaptureNotePage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly excerpt = signal('');
  readonly locator = signal('');
  readonly conceptQuery = signal('');
  readonly unit = computed(() => this.workflow.getUnit(this.unitId()));
  readonly kindOptions: KmapsNoteKind[] = ['quote', 'highlight', 'reflection', 'claim_seed'];

  readonly form = this.fb.nonNullable.group({
    noteKind: this.fb.nonNullable.control<KmapsNoteKind>('quote'),
    bodyMd: this.fb.nonNullable.control('', [Validators.required]),
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      this.sourceId.set(paramMap.get('sourceId') || '');
      this.unitId.set(paramMap.get('unitId') || '');
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((queryParamMap) => {
      const excerpt = queryParamMap.get('excerpt') || '';
      const locator = queryParamMap.get('locator') || '';
      this.excerpt.set(excerpt);
      this.locator.set(locator);

      if (excerpt && !this.form.controls.bodyMd.value.trim()) {
        this.form.controls.bodyMd.setValue(excerpt);
      }
    });
  }

  kindLabel(kind: KmapsNoteKind): string {
    return formatNoteKindLabel(kind);
  }

  setNoteKind(kind: KmapsNoteKind): void {
    this.form.controls.noteKind.setValue(kind);
  }

  updateConceptQuery(value: string | null | undefined): void {
    this.conceptQuery.set((value || '').replace(/^\s+/, ''));
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body = this.form.controls.bodyMd.value.trim();
    const title = body.length > 68 ? `${body.slice(0, 65).trim()}...` : body;

    this.workflow.addNote({
      sourceId: this.sourceId(),
      sourceUnitId: this.unitId() || null,
      noteKind: this.form.controls.noteKind.value,
      title,
      bodyMd: body,
      excerptText: this.excerpt() || null,
      locator: this.locator() || this.unit()?.locatorLabel || null,
    });

    const toast = await this.toastController.create({
      message: 'Note created.',
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
    await this.router.navigate(['/worldview', 'sources', this.sourceId(), 'units', this.unitId(), 'notes']);
  }
}
