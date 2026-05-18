import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_DOMAINS,
  PLAN_STATUS_LABELS,
  Plan,
  PlanType,
  PlannerDomain,
  domainConfig,
  planDomain,
} from '../../planner.models';
import { PlannerApiService } from '../../planner-api.service';

type DomainFilter = 'all' | PlannerDomain;

const DOMAIN_PLAN_TYPE: Record<PlannerDomain, PlanType> = {
  quran: 'quran',
  arabic: 'arabic',
  worldview: 'worldview_research',
  content: 'other',
  general: 'personal',
};

@Component({
  selector: 'km-planner-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans.component.html',
})
export class PlansComponent {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly plans = signal<Plan[]>([]);
  readonly domainFilter = signal<DomainFilter>('all');
  readonly showArchived = signal(false);
  readonly createOpen = signal(false);

  readonly domains = PLANNER_DOMAINS;
  readonly statusLabels = PLAN_STATUS_LABELS;

  newTitle = '';
  newDescription = '';
  newDomain: PlannerDomain = 'quran';

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

  setDomainFilter(value: DomainFilter): void {
    this.domainFilter.set(value);
  }

  toggleArchived(): void {
    this.showArchived.update((value) => !value);
  }

  openPlan(plan: Plan): void {
    void this.router.navigate(['/planner/plans', plan.id]);
  }

  openCreate(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.newDomain = 'quran';
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const plan = await firstValueFrom(this.api.createPlan({
        title,
        plan_type: DOMAIN_PLAN_TYPE[this.newDomain],
        description_md: this.newDescription.trim() || null,
        status: 'active',
        meta_json: JSON.stringify({ domain: this.newDomain }),
      }));
      this.plans.update((rows) => [plan, ...rows]);
      this.createOpen.set(false);
      void this.router.navigate(['/planner/plans', plan.id]);
    } catch {
      this.error.set('Could not create the plan.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.plans.set(await firstValueFrom(this.api.listPlans()));
    } catch {
      this.error.set('Could not load plans.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}
