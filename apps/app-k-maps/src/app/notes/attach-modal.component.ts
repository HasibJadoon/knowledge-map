import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take } from 'rxjs';
import { NotesApiService } from './notes-api.service';
import { NoteLink, parseVerseRef, parseWordRef } from './notes.models';

@Component({
  selector: 'app-attach-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './attach-modal.component.html',
  styleUrls: ['./attach-modal.component.scss'],
})
export class AttachModalComponent {
  @Input({ required: true }) noteId!: string;

  private readonly notesApi = inject(NotesApiService);
  private readonly modalController = inject(ModalController);
  private readonly destroyRef = inject(DestroyRef);

  readonly modeControl = new FormControl<'verse' | 'word'>('verse', { nonNullable: true });
  readonly surahControl = new FormControl<number>(1, { nonNullable: true });
  readonly ayahControl = new FormControl('', { nonNullable: true });
  readonly wordRefControl = new FormControl('', { nonNullable: true });

  readonly saving = signal(false);
  readonly verseError = signal<string | null>(null);
  readonly wordError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  readonly surahOptions = Array.from({ length: 114 }, (_, index) => index + 1);

  constructor() {
    this.modeControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearErrors();
    });
  }

  dismiss(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  save(): void {
    this.clearErrors();

    const mode = this.modeControl.value;
    const payload = mode === 'verse' ? this.buildVersePayload() : this.buildWordPayload();

    if (!payload) {
      return;
    }

    this.saving.set(true);

    this.notesApi.addLink(this.noteId, payload).pipe(
      take(1),
      finalize(() => this.saving.set(false))
    ).subscribe({
      next: (link) => {
        void this.modalController.dismiss(link, 'attached');
      },
      error: (error: unknown) => {
        const message = this.pickErrorMessage(error) ?? 'Could not attach this note.';
        this.saveError.set(message);
      },
    });
  }

  private buildVersePayload(): { target_type: 'quran_ayah'; target_id: string; ref: string } | null {
    const ayahText = this.ayahControl.value.trim();
    const parsed = parseVerseRef(`${this.surahControl.value}:${ayahText}`);

    if (!parsed) {
      this.verseError.set('Use a valid verse like 12:4.');
      return null;
    }

    return {
      target_type: 'quran_ayah',
      target_id: parsed.target_id,
      ref: parsed.ref,
    };
  }

  private buildWordPayload(): { target_type: 'quran_word'; target_id: string; ref: string } | null {
    const parsed = parseWordRef(this.wordRefControl.value);

    if (!parsed) {
      this.wordError.set('Use a valid word ref like 12:1:3.');
      return null;
    }

    return {
      target_type: 'quran_word',
      target_id: parsed.target_id,
      ref: parsed.ref,
    };
  }

  private clearErrors(): void {
    this.verseError.set(null);
    this.wordError.set(null);
    this.saveError.set(null);
  }

  private pickErrorMessage(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    const errorRecord = error as Record<string, unknown>;
    const body = errorRecord['error'];

    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object' && body !== null) {
      const message = (body as Record<string, unknown>)['message'];
      if (typeof message === 'string') {
        return message;
      }
    }

    return null;
  }
}
