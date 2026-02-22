import { Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { RefresherCustomEvent, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { LessonPickerItem } from '../../sprint/models/sprint.models';
import { LessonsService } from '../../sprint/services/lessons.service';

@Component({
  selector: 'app-planner-lessons-page',
  standalone: false,
  templateUrl: './planner-lessons.page.html',
  styleUrl: './planner-lessons.page.scss',
})
export class PlannerLessonsPage {
  private readonly lessonsService = inject(LessonsService);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly lessons = signal<LessonPickerItem[]>([]);
  readonly queryControl = new FormControl('', { nonNullable: true });

  constructor() {
    void this.load();
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.load();
    event.target.complete();
  }

  onQueryInput(value: string | null | undefined): void {
    this.queryControl.setValue(value ?? '', { emitEvent: false });
    void this.load();
  }

  openLesson(lesson: LessonPickerItem): void {
    void this.router.navigate(['/arabic/lessons', lesson.id, 'study']);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const query = this.queryControl.value.trim();
      const lessons = await firstValueFrom(this.lessonsService.list(query, 80));
      this.lessons.set(lessons);
    } catch {
      await this.presentToast('Could not load lessons.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1400,
      position: 'bottom',
    });
    await toast.present();
  }
}
