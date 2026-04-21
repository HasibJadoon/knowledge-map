import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, IonTextarea, IonicModule, ToastController } from '@ionic/angular';
import { paperPlaneOutline } from 'ionicons/icons';
import { blurActiveElement } from '../../../../shared/focus-utils';
import { TopicRowComponent } from '../../components/topic-row/topic-row.component';
import { BrainstormSubtopic } from '../../../../shared/models/worldview/brainstorm.models';
import { BrainstormStoreService } from '../../../../shared/services/worldview/brainstorm-store.service';

@Component({
  selector: 'app-brainstorm-subtopics-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TopicRowComponent],
  templateUrl: './brainstorm-subtopics.page.html',
  styleUrl: './brainstorm-subtopics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainstormSubtopicsPage {
  readonly icons = {
    paperPlaneOutline,
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(BrainstormStoreService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly subtopicCaptureControl = new FormControl('', { nonNullable: true });
  readonly topicId = signal<string | null>(null);
  readonly query = signal('');
  readonly loading = computed(() => this.store.loading());
  readonly error = computed(() => this.store.error());
  readonly topic = computed(() => {
    const topicId = this.topicId();
    return topicId ? this.store.getTopic(topicId) : null;
  });
  readonly subtopics = computed<BrainstormSubtopic[]>(() => {
    const topicId = this.topicId();
    return topicId ? this.store.listSubtopicsForTopic(topicId, this.query()) : [];
  });

  @ViewChild(IonTextarea) private subtopicCaptureField?: IonTextarea;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.topicId.set(params.get('topicId'));
      void this.store.ensureLoaded().catch(() => undefined);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.query.set((params.get('q') ?? '').trim());
    });
  }

  get canSendSubtopicCapture(): boolean {
    return Boolean(this.topic()) && this.subtopicCaptureControl.value.trim().length > 0 && !this.store.mutating();
  }

  trackSubtopic(_: number, subtopic: BrainstormSubtopic): string {
    return subtopic.id;
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

  openSubtopic(subtopicId: string): void {
    const topicId = this.topicId();
    if (!topicId) {
      return;
    }

    blurActiveElement();
    void this.router.navigate(['/brainstorm', 'topic', topicId, 'subtopic', subtopicId]);
  }

  deleteSubtopicFromRow(subtopicId: string): void {
    const topicId = this.topicId();
    const subtopic = topicId ? this.store.getSubtopic(topicId, subtopicId) : null;
    if (!topicId || !subtopic) {
      return;
    }

    void this.confirmDeleteSubtopic(topicId, subtopic);
  }

  onSubtopicCaptureKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    void this.sendSubtopicCapture();
  }

  async sendSubtopicCapture(): Promise<void> {
    const topicId = this.topicId();
    const title = this.subtopicCaptureControl.value.trim();
    if (!topicId || !title || this.store.mutating()) {
      return;
    }

    try {
      const created = await this.store.createSubtopic(topicId, title);
      if (!created) {
        await this.presentToast('Subtopic title cannot be empty.');
        return;
      }

      this.subtopicCaptureControl.setValue('', { emitEvent: false });
      blurActiveElement();
      await this.router.navigate(['/brainstorm', 'topic', topicId, 'subtopic', created.id]);
    } catch {
      await this.presentToast(this.store.error() ?? 'Unable to create subtopic.');
      requestAnimationFrame(() => {
        void this.subtopicCaptureField?.setFocus();
      });
    }
  }

  async onSubtopicLongPress(subtopicId: string): Promise<void> {
    const topicId = this.topicId();
    const subtopic = topicId ? this.store.getSubtopic(topicId, subtopicId) : null;
    if (!topicId || !subtopic) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      header: subtopic.title,
      buttons: [
        {
          text: 'Rename',
          icon: 'create-outline',
          handler: () => {
            void this.renameSubtopic(topicId, subtopic);
          },
        },
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            void this.confirmDeleteSubtopic(topicId, subtopic);
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

  private async renameSubtopic(topicId: string, subtopic: BrainstormSubtopic): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Rename Subtopic',
      inputs: [
        {
          name: 'title',
          type: 'text',
          value: subtopic.title,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          role: 'confirm',
          handler: async (value) => {
            try {
              const updated = await this.store.renameSubtopic(topicId, subtopic.id, String(value.title ?? ''));
              if (!updated) {
                await this.presentToast('Subtopic title cannot be empty.');
                return false;
              }

              return true;
            } catch {
              await this.presentToast(this.store.error() ?? 'Unable to rename subtopic.');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async confirmDeleteSubtopic(topicId: string, subtopic: BrainstormSubtopic): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Subtopic',
      message: `Delete ${subtopic.title}? This removes all ideas inside it.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.runStoreAction(
              () => this.store.deleteSubtopic(topicId, subtopic.id),
              'Unable to delete subtopic.',
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
