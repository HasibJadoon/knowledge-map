import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { KmapsWorkflowShellComponent } from '../../../kmaps-shared/components/workflow-shell/workflow-shell';
import { KmapsUnitWorkspaceTabsComponent } from '../../../kmaps-shared/components/unit-workspace-tabs/unit-workspace-tabs';
import { KmapsClaimStatus, KmapsNote, formatNoteKindLabel } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

@Component({
  selector: 'app-claim-editor-page',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, KmapsWorkflowShellComponent, KmapsUnitWorkspaceTabsComponent],
  templateUrl: './claim-editor-page.html',
  styleUrl: './claim-editor-page.scss',
})
export class ClaimEditorPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  readonly sourceId = signal('');
  readonly unitId = signal('');
  readonly claimId = signal('');
  readonly unit = computed(() => this.workflow.getUnit(this.unitId() || this.claim()?.sourceUnitId));
  readonly claim = computed(() => this.workflow.getClaim(this.claimId()));
  readonly linkedNotes = computed(() => {
    if (this.claim()) {
      return this.workflow.getNotesForClaim(this.claimId());
    }

    return this.workflow.getNotesForUnitScope(this.sourceId(), this.unitId()).slice(0, 4);
  });
  readonly primaryNote = computed(() => this.linkedNotes()[0] || null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    claimText: ['', [Validators.required]],
    status: this.fb.nonNullable.control<KmapsClaimStatus>('draft'),
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paramMap) => {
      const routeSourceId = paramMap.get('sourceId') || '';
      const routeUnitId = paramMap.get('unitId') || '';
      const routeClaimId = paramMap.get('claimId') || '';

      this.sourceId.set(routeSourceId);
      this.unitId.set(routeUnitId);

      if (routeClaimId) {
        this.loadClaim(routeClaimId);
        return;
      }

      if (routeSourceId && routeUnitId) {
        this.ensureContextClaim(routeSourceId, routeUnitId);
        return;
      }

      const noteIds = parseDelimitedIds(this.route.snapshot.queryParamMap.get('noteIds'));
      if (noteIds.length) {
        const claim = this.workflow.createClaimFromNotes(noteIds);
        this.loadClaim(claim.id);
        return;
      }

      this.claimId.set('');
      this.form.reset({ title: '', claimText: '', status: 'draft' });
    });
  }

  noteKindLabel(note: KmapsNote): string {
    return formatNoteKindLabel(note.noteKind);
  }

  openContextConcepts(): void {
    const sourceId = this.sourceId() || this.claim()?.sourceId;
    const unitId = this.unitId() || this.claim()?.sourceUnitId;
    if (!sourceId || !unitId) {
      return;
    }

    void this.router.navigate(['/worldview', 'sources', sourceId, 'units', unitId, 'concepts']);
  }

  openContextDistill(): void {
    const sourceId = this.sourceId() || this.claim()?.sourceId;
    const unitId = this.unitId() || this.claim()?.sourceUnitId;
    if (!sourceId || !unitId) {
      return;
    }

    void this.router.navigate(['/worldview', 'sources', sourceId, 'units', unitId, 'distill']);
  }

  async save(): Promise<void> {
    const claim = this.claim();
    if (!claim || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.workflow.saveClaim({
      ...claim,
      title: this.form.controls.title.value.trim(),
      claimText: this.form.controls.claimText.value.trim(),
      status: this.form.controls.status.value,
    });

    const toast = await this.toastController.create({
      message: 'Claim saved.',
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
  }

  private ensureContextClaim(sourceId: string, unitId: string): void {
    const existing = this.workflow.getClaimsForContext(sourceId, unitId)[0];
    if (existing) {
      this.loadClaim(existing.id);
      return;
    }

    const noteIds = this.workflow
      .getNotesForUnitScope(sourceId, unitId)
      .filter((note) => ['claim_seed', 'reflection', 'highlight', 'summary', 'question'].includes(note.noteKind))
      .slice(0, 4)
      .map((note) => note.id);

    if (!noteIds.length) {
      this.claimId.set('');
      this.form.reset({ title: '', claimText: '', status: 'draft' });
      return;
    }

    const claim = this.workflow.createClaimFromNotes(noteIds);
    this.loadClaim(claim.id);
  }

  private loadClaim(claimId: string): void {
    this.claimId.set(claimId);
    const claim = this.workflow.getClaim(claimId);
    if (!claim) {
      return;
    }

    this.form.reset({
      title: claim.title,
      claimText: claim.claimText,
      status: claim.status,
    });
  }
}

function parseDelimitedIds(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
