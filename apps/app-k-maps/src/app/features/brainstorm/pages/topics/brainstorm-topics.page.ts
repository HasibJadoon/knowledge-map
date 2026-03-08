import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, IonicModule, ToastController } from '@ionic/angular';
import { addOutline, searchOutline } from 'ionicons/icons';
import { TopicRowComponent } from '../../components/topic-row/topic-row.component';
import { BrainstormTopic } from '../../brainstorm.models';
import { BrainstormStoreService } from '../../services/brainstorm-store.service';

@Component({
  selector: 'app-brainstorm-topics-page',
  standalone: true,
  imports: [CommonModule, IonicModule, TopicRowComponent],
  templateUrl: './brainstorm-topics.page.html',
  styleUrl: './brainstorm-topics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainstormTopicsPage {
  readonly icons = {
    addOutline,
    searchOutline,
  };

  private readonly router = inject(Router);
  readonly store = inject(BrainstormStoreService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly topics = computed<BrainstormTopic[]>(() => this.store.listTopics());
  readonly loading = computed(() => this.store.loading());
  readonly error = computed(() => this.store.error());
  readonly mutating = computed(() => this.store.mutating());

  async ionViewWillEnter(): Promise<void> {
    try {
      await this.store.ensureLoaded();
    } catch {
      return;
    }
  }

  trackTopic(_: number, topic: BrainstormTopic): string {
    return topic.id;
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
      await this.presentToast(this.store.error() ?? 'Unable to load brainstorm topics.');
    }
  }

  openTopic(topicId: string): void {
    void this.router.navigate(['/brainstorm', 'topic', topicId]);
  }

  openSearch(): void {
    void this.router.navigateByUrl('/brainstorm/search');
  }

  archiveTopic(topicId: string): void {
    void this.runStoreAction(
      () => this.store.archiveTopic(topicId),
      'Unable to archive topic.',
    );
  }

  deleteTopicFromRow(topicId: string): void {
    void this.confirmDeleteTopic(topicId, this.store.getTopic(topicId)?.title ?? 'this topic');
  }

  async createTopic(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'New Topic',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Topic title',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          role: 'confirm',
          handler: async (value) => {
            try {
              const created = await this.store.createTopic(String(value.title ?? ''));
              if (!created) {
                await this.presentToast('Topic title cannot be empty.');
                return false;
              }

              await this.router.navigate(['/brainstorm', 'topic', created.id]);
              return true;
            } catch {
              await this.presentToast(this.store.error() ?? 'Unable to create topic.');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async onTopicLongPress(topicId: string): Promise<void> {
    const topic = this.store.getTopic(topicId);
    if (!topic) {
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      header: topic.title,
      buttons: [
        {
          text: 'Rename',
          icon: 'create-outline',
          handler: () => {
            void this.renameTopic(topic);
          },
        },
        {
          text: 'Archive',
          icon: 'archive-outline',
          handler: () => {
            this.archiveTopic(topic.id);
          },
        },
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            void this.confirmDeleteTopic(topic.id, topic.title);
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

  private async renameTopic(topic: BrainstormTopic): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Rename Topic',
      inputs: [
        {
          name: 'title',
          type: 'text',
          value: topic.title,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          role: 'confirm',
          handler: async (value) => {
            try {
              const updated = await this.store.renameTopic(topic.id, String(value.title ?? ''));
              if (!updated) {
                await this.presentToast('Topic title cannot be empty.');
                return false;
              }

              return true;
            } catch {
              await this.presentToast(this.store.error() ?? 'Unable to rename topic.');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async confirmDeleteTopic(topicId: string, title: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Topic',
      message: `Delete ${title}? This removes all ideas inside it.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.runStoreAction(
              () => this.store.deleteTopic(topicId),
              'Unable to delete topic.',
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
