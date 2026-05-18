import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_DOMAINS,
  PLAN_STATUS_LABELS,
  Plan,
  PlanType,
  PlannerDomain,
  domainConfig,
  planDomain,
} from '../../../../shared/models/planner/plan.models';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

type DomainFilter = 'all' | PlannerDomain;

const DOMAIN_PLAN_TYPE: Record<PlannerDomain, PlanType> = {
  quran: 'quran',
  arabic: 'arabic',
  worldview: 'worldview_research',
  content: 'other',
  general: 'personal',
};

@Component({
  selector: 'app-planner-plans',
  standalone: false,
  templateUrl: './plans.page.html',
  styleUrl: './plans.page.scss',
  host: { class: 'ion-page' },
})
export class PlansPage {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly plans = signal<Plan[]>([]);
  readonly domainFilter = signal<DomainFilter>('all');
  readonly showArchived = signal(false);

  readonly createOpen = signal(false);
  readonly newTitle = new FormControl('', { nonNullable: true });
  readonly newDomain = signal<PlannerDomain>('quran');

  readonly domains = PLANNER_DOMAINS;
  readonly statusLabels = PLAN_STATUS_LABELS;

  readonly visiblePlans = computed<Plan[]>(() => {
    const domain = this.domainFilter();
    const archived = this.showArchived();
    return this.plans()
      .filter((plan) => archived || plan.status !== 'archived')
      .filter((plan) => domain === 'all' || planDomain(plan) === domain);
  });

  constructor() {
    void this.load();
  }

  planDomainOf(plan: Plan): PlannerDomain {
    return planDomain(plan);
  }

  domainLabel(domain: PlannerDomain): string {
    return domainConfig(domain).label;
  }

  domainColor(domain: PlannerDomain): string {
    return domainConfig(domain).color;
  }

  setDomainFilter(value: string | number | null | undefined): void {
    if (value === 'all' || PLANNER_DOMAINS.some((entry) => entry.id === value)) {
      this.domainFilter.set(value as DomainFilter);
    }
  }

  setNewDomain(value: string | number | null | undefined): void {
    if (PLANNER_DOMAINS.some((entry) => entry.id === value)) {
      this.newDomain.set(value as PlannerDomain);
    }
  }

  toggleArchived(): void {
    this.showArchived.update((value) => !value);
  }

  openPlan(plan: Plan): void {
    void this.router.navigate(['/planner/plans', plan.id]);
  }

  openCreate(): void {
    this.newTitle.setValue('');
    this.newDomain.set('quran');
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    const title = this.newTitle.value.trim();
    if (!title) {
      await this.presentToast('Add a plan title first.');
      return;
    }

    this.saving.set(true);
    try {
      const domain = this.newDomain();
      const plan = await firstValueFrom(this.api.createPlan({
        title,
        plan_type: DOMAIN_PLAN_TYPE[domain],
        status: 'active',
        meta_json: JSON.stringify({ domain }),
      }));
      this.plans.update((rows) => [plan, ...rows]);
      this.createOpen.set(false);
      await this.presentToast('Plan created.');
      void this.router.navigate(['/planner/plans', plan.id]);
    } catch {
      await this.presentToast('Could not create the plan.');
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
      const plans = await firstValueFrom(this.api.listPlans());
      this.plans.set(plans);
    } catch {
      await this.presentToast('Could not load plans.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'bottom' });
    await toast.present();
  }
}
