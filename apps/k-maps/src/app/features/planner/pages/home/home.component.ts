import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PlannerApiService } from '../../planner-api.service';

interface HubCard {
  key: string;
  title: string;
  caption: string;
  glyph: string;
  route: string;
  accent: string;
}

@Component({
  selector: 'km-planner-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly api = inject(PlannerApiService);

  readonly loading = signal(true);
  readonly planCount = signal(0);
  readonly goalCount = signal(0);
  readonly dueCount = signal(0);

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
      glyph: '◷',
      route: '/planner/calendar',
      accent: '#4f96ff',
    },
    {
      key: 'plans',
      title: 'Plans',
      caption: `${this.planCount()} active ${this.planCount() === 1 ? 'plan' : 'plans'}`,
      glyph: '▦',
      route: '/planner/plans',
      accent: '#c9a84c',
    },
    {
      key: 'goals',
      title: 'Goals',
      caption: `${this.goalCount()} ${this.goalCount() === 1 ? 'goal' : 'goals'}`,
      glyph: '◎',
      route: '/planner/goals',
      accent: '#34b996',
    },
    {
      key: 'review',
      title: 'Review',
      caption: this.dueCount() ? `${this.dueCount()} to review` : 'Queue is clear',
      glyph: '✓',
      route: '/planner/review',
      accent: '#a78bfa',
    },
    {
      key: 'capture',
      title: 'Capture',
      caption: 'Catch a thought',
      glyph: '✎',
      route: '/planner/capture',
      accent: '#ff9d6c',
    },
  ]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [plans, goals, due] = await Promise.all([
        firstValueFrom(this.api.listPlans({ status: 'active' })),
        firstValueFrom(this.api.listGoals()),
        firstValueFrom(this.api.reviewDue(50)),
      ]);
      this.planCount.set(plans.length);
      this.goalCount.set(goals.filter((goal) => goal.status === 'active').length);
      this.dueCount.set(due.length);
    } catch {
      /* the cards still render with zero counts */
    } finally {
      this.loading.set(false);
    }
  }
}
