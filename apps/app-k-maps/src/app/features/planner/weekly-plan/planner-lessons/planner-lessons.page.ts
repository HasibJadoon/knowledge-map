import { Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { LessonPickerItem } from '../../../../shared/models/planner/sprint.models';
import { LessonsService } from '../../../../shared/services/planner/lessons.service';

@Component({
  selector: 'app-planner-lessons-page',
  standalone: false,
  templateUrl: './planner-lessons.page.html',
  styleUrl: './planner-lessons.page.scss',
})
export class PlannerLessonsPage {
  private readonly lessonsService = inject(LessonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly lessons = signal<LessonPickerItem[]>([]);
  readonly queryControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.queryControl.setValue(params.get('q') ?? '', { emitEvent: false });
      void this.load();
    });
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
