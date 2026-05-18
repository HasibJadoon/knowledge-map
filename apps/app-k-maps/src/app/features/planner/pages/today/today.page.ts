import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_DOMAINS,
  Plan,
  PlanTask,
  PlannerDomain,
  domainConfig,
  planDomain,
} from '../../../../shared/models/planner/plan.models';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

interface DomainCount {
  domain: PlannerDomain;
  label: string;
  color: string;
  count: number;
}

@Component({
  selector: 'app-planner-today',
  standalone: false,
  templateUrl: './today.page.html',
  styleUrl: './today.page.scss',
  host: { class: 'ion-page' },
})
export class TodayPage {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dueTasks = signal<PlanTask[]>([]);
  readonly plans = signal<Plan[]>([]);

  private readonly todayIso = isoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  readonly overdue = computed(() => this.dueTasks().filter((task) => isBefore(task.due_date, this.todayIso)));
  readonly dueToday = computed(() => this.dueTasks().filter((task) => !isBefore(task.due_date, this.todayIso)));

  readonly domainCounts = computed<DomainCount[]>(() => {
    const active = this.plans();
    return PLANNER_DOMAINS
      .map((entry) => ({
        domain: entry.id,
        label: entry.label,
        color: entry.color,
        count: active.filter((plan) => planDomain(plan) === entry.id).length,
      }))
      .filter((entry) => entry.count > 0);
  });

  readonly focusCount = computed(() => this.dueTasks().length);
  readonly planCount = computed(() => this.plans().length);

  constructor() {
    void this.load();
  }

  planTitle(planId: string): string {
    return this.plans().find((plan) => plan.id === planId)?.title ?? 'Plan';
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  openPlan(plan: Plan): void {
    void this.router.navigate(['/planner/plans', plan.id]);
  }

  planDomainColor(plan: Plan): string {
    return domainConfig(planDomain(plan)).color;
  }

  async completeTask(task: PlanTask, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(this.api.completeTask(task.id));
      this.dueTasks.update((rows) => rows.filter((row) => row.id !== task.id));
      await this.presentToast('Task completed.');
    } catch {
      await this.presentToast('Could not complete the task.');
    } finally {
      this.saving.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement | null)?.complete();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [due, plans] = await Promise.all([
        firstValueFrom(this.api.reviewDue(50)),
        firstValueFrom(this.api.listPlans({ status: 'active' })),
      ]);
      this.dueTasks.set(due);
      this.plans.set(plans);
    } catch {
      await this.presentToast('Could not load your day.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'bottom' });
    await toast.present();
  }
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isBefore(due: string | null, today: string): boolean {
  return Boolean(due) && (due as string).slice(0, 10) < today;
}
