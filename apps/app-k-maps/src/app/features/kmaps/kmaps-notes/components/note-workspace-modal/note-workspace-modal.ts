import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

import { KmapsNoteKind } from '../../../kmaps-shared/models/kmaps.models';
import { KmapsWorkflowService } from '../../../kmaps-shared/services/kmaps-workflow.service';

type WorkspaceNoteKind = Extract<KmapsNoteKind, 'highlight' | 'quote' | 'reflection' | 'question' | 'insight' | 'observation' | 'claim_seed' | 'idea'>;

const BASE_NOTE_KIND_OPTIONS: WorkspaceNoteKind[] = ['question', 'reflection', 'quote', 'insight', 'observation', 'idea'];

type WorkspaceNoteLike = {
  noteKind: KmapsNoteKind;
  title: string | null;
  bodyMd: string;
  excerptText: string | null;
};

@Component({
  selector: 'app-note-workspace-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './note-workspace-modal.html',
  styleUrl: './note-workspace-modal.scss',
})
export class NoteWorkspaceModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly workflow = inject(KmapsWorkflowService);

  @Input({ required: true }) sourceId = '';
  @Input({ required: true }) unitId = '';
  @Input() noteId: string | null = null;
  @Input() preferredKind: WorkspaceNoteKind = 'question';
  @Input() initialTitle = '';
  @Input() initialBodyMd = '';
  @Input() initialExcerptText: string | null = null;
  @Input() initialLocator: string | null = null;

  readonly activeNoteId = signal<string | null>(null);
  readonly activeNote = computed(() => this.workflow.getNoteById(this.activeNoteId()));
  readonly form = this.fb.nonNullable.group({
    noteKind: this.fb.nonNullable.control<WorkspaceNoteKind>('question'),
    title: this.fb.nonNullable.control(''),
    bodyMd: this.fb.nonNullable.control(''),
  });
  readonly headerTitle = computed(() => (this.activeNoteId() ? 'Edit Note' : 'Create Note'));

  ngOnInit(): void {
    this.activeNoteId.set(this.noteId?.trim() || null);
    const note = this.activeNote();

    if (note && isWorkspaceNote(note.noteKind)) {
      this.patchFormFromNote(note);
      return;
    }

    this.form.patchValue({
      noteKind: this.preferredKind,
      title: this.initialTitle.trim(),
      bodyMd: this.initialBodyMd.trim(),
    });
  }

  close(): Promise<boolean> {
    return this.modalController.dismiss(null, 'close');
  }

  get kindOptions(): WorkspaceNoteKind[] {
    const activeKind = this.form.controls.noteKind.value;
    return BASE_NOTE_KIND_OPTIONS.includes(activeKind) ? BASE_NOTE_KIND_OPTIONS : [...BASE_NOTE_KIND_OPTIONS, activeKind];
  }

  selectKind(kind: WorkspaceNoteKind): void {
    this.form.controls.noteKind.setValue(kind);
  }

  noteKindLabel(kind: WorkspaceNoteKind): string {
    switch (kind) {
      case 'observation':
        return 'C';
      case 'claim_seed':
        return 'Claim Seed';
      case 'idea':
        return 'Idea';
      default:
        return kind.charAt(0).toUpperCase();
    }
  }

  noteKindIcon(kind: WorkspaceNoteKind): string {
    switch (kind) {
      case 'question':
        return 'help-circle-outline';
      case 'highlight':
        return 'color-wand-outline';
      case 'reflection':
        return 'chatbox-ellipses-outline';
      case 'quote':
        return 'bookmark-outline';
      case 'insight':
        return 'bulb-outline';
      case 'observation':
        return 'chatbubble-outline';
      case 'claim_seed':
        return 'flash-outline';
      case 'idea':
        return 'sparkles-outline';
      default:
        return 'document-text-outline';
    }
  }

  async save(): Promise<void> {
    const title = this.form.controls.title.value.trim();
    const body = this.form.controls.bodyMd.value.trim();

    if (!title && !body) {
      const toast = await this.toastController.create({
        message: 'Add a statement or note before saving.',
        duration: 1400,
        position: 'bottom',
      });
      await toast.present();
      return;
    }

    const noteTitle = title || deriveTitleFromBody(body, this.form.controls.noteKind.value);
    const noteBody = body || noteTitle;
    const unit = this.workflow.getUnit(this.unitId);
    const locator = this.initialLocator?.trim() || unit?.locatorLabel || unit?.startRef || null;

    if (this.activeNoteId()) {
      this.workflow.updateNote(this.activeNoteId()!, {
        noteKind: this.form.controls.noteKind.value,
        title: noteTitle,
        bodyMd: noteBody,
        excerptText: this.activeNote()?.excerptText || this.initialExcerptText || null,
        locator,
      });
    } else {
      this.workflow.addNote({
        sourceId: this.sourceId,
        sourceUnitId: this.unitId || null,
        noteKind: this.form.controls.noteKind.value,
        title: noteTitle,
        bodyMd: noteBody,
        excerptText: this.initialExcerptText || null,
        locator,
      });
    }

    const toast = await this.toastController.create({
      message: this.activeNoteId() ? 'Note updated.' : 'Note created.',
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
    await this.modalController.dismiss({ saved: true }, 'save');
  }

  private patchFormFromNote(note: WorkspaceNoteLike): void {
    this.form.patchValue({
      noteKind: isWorkspaceNote(note.noteKind) ? note.noteKind : this.preferredKind,
      title: note.title || '',
      bodyMd: note.bodyMd || '',
    });
  }
}

function isWorkspaceNote(kind: KmapsNoteKind): kind is WorkspaceNoteKind {
  return (
    kind === 'highlight' ||
    kind === 'quote' ||
    kind === 'reflection' ||
    kind === 'question' ||
    kind === 'insight' ||
    kind === 'observation' ||
    kind === 'claim_seed' ||
    kind === 'idea'
  );
}

function deriveTitleFromBody(body: string, kind: WorkspaceNoteKind): string {
  const trimmed = body.trim();
  if (!trimmed) {
    switch (kind) {
      case 'highlight':
        return 'Highlight';
      case 'observation':
        return 'Comment';
      case 'claim_seed':
        return 'Claim Seed';
      case 'idea':
        return 'Idea';
      default:
        return kind.charAt(0).toUpperCase() + kind.slice(1);
    }
  }

  return trimmed.length > 72 ? `${trimmed.slice(0, 69).trim()}...` : trimmed;
}
