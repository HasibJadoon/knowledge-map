import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, IonTextarea, IonicModule, ToastController } from '@ionic/angular';
import { createOutline, paperPlaneOutline } from 'ionicons/icons';
import { IdeaRowComponent } from '../../components/idea-row/idea-row.component';
import { BrainstormIdea } from '../../brainstorm.models';
import { BrainstormStoreService } from '../../services/brainstorm-store.service';

@Component({
  selector: 'app-brainstorm-ideas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, IdeaRowComponent],
  templateUrl: './brainstorm-ideas.page.html',
  styleUrl: './brainstorm-ideas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainstormIdeasPage {
  readonly icons = {
    createOutline,
    paperPlaneOutline,
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(BrainstormStoreService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly quickCaptureControl = new FormControl('', { nonNullable: true });
  readonly topicId = signal<string | null>(null);
  readonly loading = computed(() => this.store.loading());
  readonly error = computed(() => this.store.error());
  readonly topic = computed(() => {
    const topicId = this.topicId();
    return topicId ? this.store.getTopic(topicId) : null;
  });
  readonly ideas = computed(() => {
    const topicId = this.topicId();
    return topicId ? this.store.listIdeasForTopic(topicId) : [];
  });

  @ViewChild(IonTextarea) private quickCaptureField?: IonTextarea;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.topicId.set(params.get('topicId'));
      void this.store.ensureLoaded().catch(() => undefined);
    });
  }

  get countLabel(): string {
    const count = this.ideas().length;
    return `${count} ${count === 1 ? 'idea' : 'ideas'}`;
  }

  get canSendQuickCapture(): boolean {
    return Boolean(this.topic()) && this.quickCaptureControl.value.trim().length > 0 && !this.store.mutating();
  }

  trackIdea(_: number, idea: BrainstormIdea): string {
    return idea.id;
  }

  async refresh(event: Event): Promise<void> {
    try {
      await this.store.reload();
    } finally {
      (event as CustomEvent<{ complete: () => void }>).detail.complete();
    }
  }

  async retryLoad(): Promise<void> {
    try {
      await this.store.reload();
    } catch {
      await this.presentToast(this.store.error() ?? 'Unable to load this topic.');
    }
  }

  openComposer(): void {
    const topicId = this.topicId();
    if (!topicId) {
      return;
    }

    void this.router.navigate(['/brainstorm', 'topic', topicId, 'idea', 'new']);
  }

  openIdea(ideaId: string): void {
    const topicId = this.topicId();
    if (!topicId) {
      return;
    }

    void this.router.navigate(['/brainstorm', 'topic', topicId, 'idea', ideaId]);
  }

  toggleIdeaPin(ideaId: string): void {
    void this.runStoreAction(
      () => this.store.togglePinned(ideaId),
      'Unable to update this idea.',
    );
  }

  toggleIdeaHighlight(ideaId: string): void {
    void this.runStoreAction(
      () => this.store.toggleHighlighted(ideaId),
      'Unable to update this idea.',
    );
  }

  deleteIdeaFromRow(ideaId: string): void {
    void this.confirmDeleteIdea(ideaId);
  }

  onQuickCaptureKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    void this.sendQuickCapture();
  }

  async sendQuickCapture(): Promise<void> {
    const topicId = this.topicId();
    const text = this.quickCaptureControl.value.trim();
    if (!topicId || !text || this.store.mutating()) {
      return;
    }

    try {
      await this.store.createIdea({ topicId, text });
      this.quickCaptureControl.setValue('', { emitEvent: false });
      requestAnimationFrame(() => {
        void this.quickCaptureField?.setFocus();
      });
    } catch {
      await this.presentToast(this.store.error() ?? 'Unable to save idea.');
    }
  }

  async onIdeaLongPress(ideaId: string): Promise<void> {
    const idea = this.store.getIdea(ideaId);
    if (!idea) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      header: idea.text,
      buttons: [
        {
          text: idea.pinned ? 'Unpin' : 'Pin',
          icon: 'bookmark-outline',
          handler: () => {
            this.toggleIdeaPin(idea.id);
          },
        },
        {
          text: idea.highlighted ? 'Unhighlight' : 'Highlight',
          icon: 'sparkles-outline',
          handler: () => {
            this.toggleIdeaHighlight(idea.id);
          },
        },
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => {
            this.openIdea(idea.id);
          },
        },
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            void this.confirmDeleteIdea(idea.id);
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  private async confirmDeleteIdea(ideaId: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Idea',
      message: 'Remove this idea from the topic?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.runStoreAction(
              () => this.store.deleteIdea(ideaId),
              'Unable to delete idea.',
            );
          },
        },
      ],
    });

    await alert.present();
  }

  private async runStoreAction<T>(action: () => Promise<T>, fallbackMessage: string): Promise<T | null> {
    try {
      return await action();
    } catch {
      await this.presentToast(this.store.error() ?? fallbackMessage);
      return null;
    }
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
