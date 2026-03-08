import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { BrainstormIdea, BrainstormTopic } from '../../brainstorm.models';
import { BrainstormStoreService } from '../../services/brainstorm-store.service';

type EditTab = 'idea' | 'details' | 'context';

@Component({
  selector: 'app-brainstorm-idea-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './brainstorm-idea-edit.page.html',
  styleUrl: './brainstorm-idea-edit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainstormIdeaEditPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  readonly store = inject(BrainstormStoreService);

  readonly activeTab = signal<EditTab>('idea');
  readonly routeTopicId = signal<string | null>(null);
  readonly ideaId = signal<string | null>(null);
  readonly currentIdea = signal<BrainstormIdea | null>(null);
  readonly hydrating = signal(true);

  readonly form = this.formBuilder.nonNullable.group({
    topicId: '',
    text: '',
    highlighted: false,
    pinned: false,
    tagsText: '',
    reference: '',
    context: '',
  });

  readonly topicOptions = computed<BrainstormTopic[]>(() => this.store.listTopics());
  readonly isEditing = computed(() => this.currentIdea() !== null);
  readonly missingIdea = computed(() => !this.hydrating() && this.ideaId() !== null && this.currentIdea() === null);
  readonly hasTopics = computed(() => this.topicOptions().length > 0);
  readonly loading = computed(() => this.store.loading() || this.hydrating());
  readonly error = computed(() => this.store.error());

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.loadFromRoute(params);
    });
  }

  get canSave(): boolean {
    return Boolean(this.form.controls.topicId.value && this.form.controls.text.value.trim() && !this.store.mutating());
  }

  get backHref(): string {
    const topicId = this.form.controls.topicId.value || this.routeTopicId();
    return topicId ? `/brainstorm/topic/${topicId}` : '/brainstorm/topics';
  }

  get saveLabel(): string {
    return this.isEditing() ? 'Save Changes' : 'Save Idea';
  }

  get tagsPreview(): string[] {
    return this.parseTags(this.form.controls.tagsText.value);
  }

  changeTab(tab: string | number | null | undefined): void {
    if (tab === 'idea' || tab === 'details' || tab === 'context') {
      this.activeTab.set(tab);
    }
  }

  goToTopics(): void {
    void this.router.navigateByUrl('/brainstorm/topics');
  }

  async retryLoad(): Promise<void> {
    await this.loadFromRoute(this.route.snapshot.paramMap, true);
  }

  async createTopicFromEditor(): Promise<void> {
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

              this.form.controls.topicId.setValue(created.id);
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

  async saveIdea(): Promise<void> {
    if (this.missingIdea()) {
      await this.presentToast('This idea is no longer available.');
      return;
    }

    const topicId = this.form.controls.topicId.value;
    const text = this.form.controls.text.value.trim();

    if (!topicId) {
      await this.presentToast('Choose a topic first.');
      return;
    }

    if (!text) {
      await this.presentToast('Add the main thought first.');
      return;
    }

    const payload = {
      topicId,
      text,
      highlighted: this.form.controls.highlighted.value,
      pinned: this.form.controls.pinned.value,
      tags: this.parseTags(this.form.controls.tagsText.value),
      reference: this.form.controls.reference.value,
      context: this.form.controls.context.value,
    };

    try {
      const existingIdea = this.currentIdea();
      if (existingIdea) {
        await this.store.updateIdea(existingIdea.id, payload);
      } else {
        await this.store.createIdea(payload);
      }

      await this.router.navigate(['/brainstorm', 'topic', topicId]);
    } catch {
      await this.presentToast(this.store.error() ?? 'Could not save this idea.');
    }
  }

  async deleteIdea(): Promise<void> {
    const existingIdea = this.currentIdea();
    if (!existingIdea) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Delete Idea',
      message: 'Remove this idea permanently?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.store.deleteIdea(existingIdea.id);
              await this.router.navigate(['/brainstorm', 'topic', existingIdea.topicId]);
            } catch {
              await this.presentToast(this.store.error() ?? 'Unable to delete idea.');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async loadFromRoute(paramMap: ParamMap, force = false): Promise<void> {
    this.hydrating.set(true);
    this.activeTab.set('idea');

    try {
      await this.store.ensureLoaded(force);
    } catch {
      this.hydrating.set(false);
      return;
    }

    const topicId = paramMap.get('topicId');
    const ideaId = paramMap.get('ideaId');
    const idea = ideaId && ideaId !== 'new' ? this.store.getIdea(ideaId) : null;
    const initialTopicId = idea?.topicId ?? topicId ?? this.store.getDefaultTopicId() ?? '';

    this.routeTopicId.set(topicId);
    this.ideaId.set(ideaId && ideaId !== 'new' ? ideaId : null);
    this.currentIdea.set(idea);
    this.form.reset({
      topicId: initialTopicId,
      text: idea?.text ?? '',
      highlighted: idea?.highlighted ?? false,
      pinned: idea?.pinned ?? false,
      tagsText: (idea?.tags ?? []).join(', '),
      reference: idea?.reference ?? '',
      context: idea?.context ?? '',
    });
    this.hydrating.set(false);
  }

  private parseTags(rawValue: string): string[] {
    return Array.from(
      new Set(
        rawValue
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    );
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'bottom',
    });
    await toast.present();
  }
}
