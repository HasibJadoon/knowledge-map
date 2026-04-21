import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewChild, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IonTextarea } from '@ionic/angular/standalone';
import { paperPlaneOutline, refreshOutline } from 'ionicons/icons';
import { finalize, take } from 'rxjs';
import { TargetedNotesApiService } from '../../../shared/services/content/targeted-notes-api.service';
import { CaptureNote, TargetRef, computeTitleFromMarkdown } from '../../../shared/models/content/targeting.models';

@Component({
  selector: 'app-targeted-notes-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './targeted-notes-panel.component.html',
  styleUrls: ['./targeted-notes-panel.component.scss'],
})
export class TargetedNotesPanelComponent implements OnChanges {
  @Input({ required: true }) target!: TargetRef;
  @Input() placeholder = 'Add a targeted note...';
  @Input() collapsed = false;

  readonly loading = signal(false);
  readonly adding = signal(false);
  readonly open = signal(true);
  readonly notes = signal<CaptureNote[]>([]);
  readonly error = signal<string | null>(null);
  readonly composerControl = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [1, 2, 3];
  readonly icons = {
    paperPlaneOutline,
    refreshOutline,
  };

  @ViewChild(IonTextarea) private composerField?: IonTextarea;

  private lastTargetKey = '';
  private readonly targetedNotesApi = inject(TargetedNotesApiService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collapsed']) {
      this.open.set(!this.collapsed);
    }

    if (changes['target']) {
      this.refreshIfTargetChanged();
    }
  }

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  refresh(): void {
    this.loadNotes();
  }

  addNote(): void {
    if (!this.target || this.adding()) {
      return;
    }

    const body = this.composerControl.value.trim();
    if (!body) {
      this.error.set('Write something first.');
      return;
    }

    this.error.set(null);
    this.adding.set(true);

    this.targetedNotesApi.createTargetedNote(this.target, body).pipe(
      take(1),
      finalize(() => this.adding.set(false))
    ).subscribe({
      next: (note) => {
        this.composerControl.setValue('', { emitEvent: false });
        this.notes.update((items) => [note, ...items.filter((item) => item.id !== note.id)]);
        requestAnimationFrame(() => {
          void this.composerField?.setFocus();
        });
      },
      error: (error: Error) => {
        this.error.set(error.message || 'Could not add note.');
      },
    });
  }

  titleFor(note: CaptureNote): string {
    return note.title?.trim() || computeTitleFromMarkdown(note.body_md) || 'Untitled';
  }

  get canSubmit(): boolean {
    return !this.adding() && this.composerControl.value.trim().length > 0;
  }

  get noteCountLabel(): string {
    const count = this.notes().length;
    if (count === 1) {
      return '1 note';
    }

    return `${count} notes`;
  }

  previewFor(note: CaptureNote): string {
    const compact = note.body_md.replace(/\s+/g, ' ').trim();
    if (!compact) {
      return '';
    }

    if (compact.length <= 120) {
      return compact;
    }

    return `${compact.slice(0, 119).replace(/\s+$/, '')}...`;
  }

  trackById(_: number, note: CaptureNote): string {
    return note.id;
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    this.addNote();
  }

  private refreshIfTargetChanged(): void {
    if (!this.target) {
      return;
    }

    const key = `${this.target.target_type}:${this.target.target_id}`;
    if (key === this.lastTargetKey) {
      return;
    }

    this.lastTargetKey = key;
    this.loadNotes();
  }

  private loadNotes(): void {
    if (!this.target) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.targetedNotesApi.listTargetNotes(this.target).pipe(
      take(1),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (notes) => {
        this.notes.set(notes);
      },
      error: (error: Error) => {
        this.notes.set([]);
        this.error.set(error.message || 'Could not load notes.');
      },
    });
  }
}
