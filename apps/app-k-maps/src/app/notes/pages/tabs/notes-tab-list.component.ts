import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule, RefresherCustomEvent, ToastController } from '@ionic/angular';
import { paperPlaneOutline } from 'ionicons/icons';
import { Observable, catchError, distinctUntilChanged, finalize, map, of, switchMap, take, tap } from 'rxjs';
import { NotesApiService } from '../../../shared/services/content/notes-api.service';
import { Note, computePreview, computeTitleFromMarkdown } from '../../../shared/models/content/notes.model';

export type NotesTabMode = 'draft' | 'flag' | 'published';

@Component({
  selector: 'app-notes-tab-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterLink],
  templateUrl: './notes-tab-list.component.html',
  styleUrls: ['./notes-tab-list.component.scss'],
})
export class NotesTabListComponent implements OnInit {
  @Input({ required: true }) mode: NotesTabMode = 'draft';

  private readonly notesApi = inject(NotesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notes = signal<Note[]>([]);
  readonly query = signal('');
  readonly creating = signal(false);
  readonly composerControl = new FormControl('', { nonNullable: true });
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  readonly icons = {
    paperPlaneOutline,
  };

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      map((params) => (params.get('q') ?? '').trim()),
      distinctUntilChanged(),
      switchMap((query) => this.fetchNotes(query)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  onRefresh(event: RefresherCustomEvent): void {
    const query = (this.route.snapshot.queryParamMap.get('q') ?? '').trim();
    this.fetchNotes(query, () => event.target.complete()).pipe(take(1)).subscribe();
  }

  titleFor(note: Note): string {
    return note.title?.trim() || computeTitleFromMarkdown(note.body_md) || 'Untitled';
  }

  previewFor(note: Note): string {
    return computePreview(note.body_md, 100) || 'Tap to start writing...';
  }

  emptyStateTitle(): string {
    if (this.mode === 'published') {
      return 'No published notes';
    }

    if (this.mode === 'flag') {
      return 'No flagged notes';
    }

    return 'No drafts yet';
  }

  emptyStateMessage(): string {
    if (this.mode === 'published') {
      return 'Move a note to Published in the editor to collect it here.';
    }

    if (this.mode === 'flag') {
      return 'Move a note to Flag in the editor to keep it here.';
    }

    return 'Capture the first draft below.';
  }

  get showComposer(): boolean {
    return this.mode === 'draft';
  }

  get canSendComposer(): boolean {
    return !this.creating() && this.composerControl.value.trim().length > 0;
  }

  createDraftNote(): void {
    const body = this.composerControl.value.trim();
    if (!body || this.creating() || this.mode !== 'draft') {
      return;
    }

    this.creating.set(true);

    this.notesApi.createNote({
      body_md: body,
      title: computeTitleFromMarkdown(body),
      status: 'draft',
    }).pipe(
      take(1),
      finalize(() => this.creating.set(false))
    ).subscribe({
      next: (note) => {
        this.composerControl.setValue('', { emitEvent: false });

        if (this.matchesQuery(note, this.query())) {
          this.notes.update((items) => [note, ...items.filter((item) => item.id !== note.id)]);
        }
      },
      error: () => {
        void this.presentToast('Could not save note.');
      },
    });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.createDraftNote();
  }

  private fetchNotes(query: string, done?: () => void): Observable<Note[]> {
    this.loading.set(true);
    this.error.set(null);
    this.query.set(query);

    return this.listByMode(query).pipe(
      tap((notes) => {
        this.notes.set(notes);
      }),
      catchError((error: unknown) => {
        this.notes.set([]);
        this.error.set(this.toErrorMessage(error));
        return of([]);
      }),
      finalize(() => {
        this.loading.set(false);
        done?.();
      })
    );
  }

  private listByMode(query: string): Observable<Note[]> {
    return this.notesApi.listNotes(this.mode, query);
  }

  private toErrorMessage(error: unknown): string {
    const status = this.readStatus(error);
    if (status === 401) {
      return 'Session expired. Please log in again.';
    }

    return 'Could not load notes.';
  }

  private readStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const candidate = (error as Record<string, unknown>)['status'];
    if (typeof candidate === 'number') {
      return candidate;
    }

    return null;
  }

  private matchesQuery(note: Note, query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    const haystack = `${note.title ?? ''}\n${note.body_md}`.toLowerCase();
    return haystack.includes(normalized);
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
    });

    await toast.present();
  }
}
