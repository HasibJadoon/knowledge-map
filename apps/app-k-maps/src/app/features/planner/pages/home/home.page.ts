import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  calendarNumberOutline,
  checkmarkDoneOutline,
  createOutline,
  layersOutline,
  trophyOutline,
} from 'ionicons/icons';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

interface HubCard {
  key: string;
  title: string;
  caption: string;
  icon: string;
  route: string;
  accent: string;
}

@Component({
  selector: 'app-planner-home',
  standalone: false,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  host: { class: 'ion-page' },
})
export class HomePage {
  private readonly api = inject(PlannerApiService);
  private readonly notes = inject(CaptureNotesService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly planCount = signal(0);
  readonly goalCount = signal(0);
  readonly dueCount = signal(0);
  readonly captureCount = signal(0);

  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  readonly cards = computed<HubCard[]>(() => [
    {
      key: 'calendar',
      title: 'Calendar',
      caption: this.dueCount() ? `${this.dueCount()} due now` : 'Schedule & agenda',
      icon: calendarNumberOutline,
      route: '/planner/calendar',
      accent: '#4f96ff',
    },
    {
      key: 'plans',
      title: 'Plans',
      caption: `${this.planCount()} active ${this.planCount() === 1 ? 'plan' : 'plans'}`,
      icon: layersOutline,
      route: '/planner/plans',
      accent: '#c9a84c',
    },
    {
      key: 'goals',
      title: 'Goals',
      caption: `${this.goalCount()} ${this.goalCount() === 1 ? 'goal' : 'goals'}`,
      icon: trophyOutline,
      route: '/planner/goals',
      accent: '#34b996',
    },
    {
      key: 'review',
      title: 'Review',
      caption: this.dueCount() ? `${this.dueCount()} to review` : 'Queue is clear',
      icon: checkmarkDoneOutline,
      route: '/planner/review',
      accent: '#a78bfa',
    },
    {
      key: 'capture',
      title: 'Capture',
      caption: this.captureCount() ? `${this.captureCount()} open` : 'Catch a thought',
      icon: createOutline,
      route: '/planner/capture',
      accent: '#ff9d6c',
    },
  ]);

  constructor() {
    void this.load();
  }

  goHome(): void {
    void this.router.navigate(['/home'], { replaceUrl: true });
  }

  open(route: string): void {
    void this.router.navigate([route]);
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement | null)?.complete();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      // Wait for any in-flight capture-note autosave before counting the inbox,
      // otherwise a note saved on the way back from the editor is missed.
      await this.notes.whenIdle();
      const [plans, goals, due, captures] = await Promise.all([
        firstValueFrom(this.api.listPlans({ status: 'active' })),
        firstValueFrom(this.api.listGoals()),
        firstValueFrom(this.api.reviewDue(50)),
        firstValueFrom(this.notes.list(60)),
      ]);
      this.planCount.set(plans.length);
      this.goalCount.set(goals.filter((goal) => goal.status === 'active').length);
      this.dueCount.set(due.length);
      // "Open" captures = anything that's not yet done.
      this.captureCount.set(captures.filter((note) => note.status !== 'done').length);
    } catch {
      /* the cards still render with zero counts */
    } finally {
      this.loading.set(false);
    }
  }
}
