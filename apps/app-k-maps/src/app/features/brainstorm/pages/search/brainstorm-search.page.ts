import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, IonSearchbar, IonicModule, ToastController } from '@ionic/angular';
import { arrowBackOutline, closeOutline } from 'ionicons/icons';
import { IdeaRowComponent } from '../../components/idea-row/idea-row.component';
import { TopicRowComponent } from '../../components/topic-row/topic-row.component';
import { BrainstormIdeaSearchResult, BrainstormTopic } from '../../brainstorm.models';
import { BrainstormStoreService } from '../../services/brainstorm-store.service';

@Component({
  selector: 'app-brainstorm-search-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TopicRowComponent, IdeaRowComponent],
  templateUrl: './brainstorm-search.page.html',
  styleUrl: './brainstorm-search.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainstormSearchPage {
  readonly icons = {
    arrowBackOutline,
    closeOutline,
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly store = inject(BrainstormStoreService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  readonly loading = computed(() => this.store.loading());
  readonly error = computed(() => this.store.error());
  readonly topicMatches = computed<BrainstormTopic[]>(() => this.store.listTopics(this.query()));
  readonly ideaMatches = computed<BrainstormIdeaSearchResult[]>(() => this.store.searchIdeas(this.query()));

  @ViewChild(IonSearchbar) private searchbar?: IonSearchbar;

  constructor() {
    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.query.set(value.trim());
    });
  }

  async ionViewWillEnter(): Promise<void> {
    try {
      await this.store.ensureLoaded();
    } catch {
      return;
    }

    requestAnimationFrame(() => {
      void this.searchbar?.setFocus();
    });
  }

  trackTopic(_: number, topic: BrainstormTopic): string {
    return topic.id;
  }

  trackIdea(_: number, result: BrainstormIdeaSearchResult): string {
    return result.idea.id;
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
      await this.presentToast(this.store.error() ?? 'Unable to load brainstorm search.');
    }
  }

  openTopic(topicId: string): void {
    void this.router.navigate(['/brainstorm', 'topic', topicId]);
  }

  openIdea(topicId: string, ideaId: string): void {
    void this.router.navigate(['/brainstorm', 'topic', topicId, 'idea', ideaId]);
  }

  closeSearch(): void {
    void this.router.navigateByUrl('/brainstorm/topics');
  }

  back(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl('/brainstorm/topics');
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
            this.openIdea(idea.topicId, idea.id);
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
              await this.presentToast('Unable to rename topic.');
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
