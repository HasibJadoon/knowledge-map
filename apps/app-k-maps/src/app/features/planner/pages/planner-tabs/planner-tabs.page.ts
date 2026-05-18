import { Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { arrowBackOutline } from 'ionicons/icons';

const PLANNER_TAB_KEYS = ['week', 'capture', 'plan', 'kanban', 'calendar', 'timeline', 'review'] as const;
type PlannerTabKey = (typeof PLANNER_TAB_KEYS)[number];

@Component({
  selector: 'app-planner-tabs-page',
  standalone: false,
  templateUrl: './planner-tabs.page.html',
  styleUrl: './planner-tabs.page.scss',
  host: {
    class: 'ion-page',
  },
})
export class PlannerTabsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly icons = {
    arrowBackOutline,
  };
  readonly activeTab = signal<PlannerTabKey>('week');
  readonly title = computed(() => plannerTabTitle(this.activeTab()));

  ngOnInit(): void {
    const initialTab = resolvePlannerTab(
      this.route.snapshot.queryParamMap.get('tab'),
      this.router.url,
    );
    this.activeTab.set(initialTab);

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParams) => {
        this.activeTab.set(resolvePlannerTab(queryParams.get('tab'), this.router.url));
      });
  }

  back(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/home'], { replaceUrl: true });
  }

  goHome(): void {
    void this.router.navigate(['/home'], { replaceUrl: true });
  }

  onPlannerTabSelected(tabKey: string): void {
    if (!isPlannerTabKey(tabKey) || tabKey === this.activeTab()) {
      return;
    }

    this.activeTab.set(tabKey);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: tabKey,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

function isPlannerTabKey(value: string | null | undefined): value is PlannerTabKey {
  return PLANNER_TAB_KEYS.includes(value as PlannerTabKey);
}

function resolvePlannerTab(value: string | null | undefined, url: string): PlannerTabKey {
  if (isPlannerTabKey(value)) {
    return value;
  }

  if (url.includes('/planner/capture')) return 'capture';
  if (url.includes('/planner/plan')) return 'plan';
  if (url.includes('/planner/kanban')) return 'kanban';
  if (url.includes('/planner/calendar')) return 'calendar';
  if (url.includes('/planner/timeline')) return 'timeline';
  if (url.includes('/planner/review')) return 'review';
  return 'week';
}

function plannerTabTitle(tab: PlannerTabKey): string {
  switch (tab) {
    case 'capture':
      return 'Capture';
    case 'plan':
      return 'Plan';
    case 'kanban':
      return 'Kanban';
    case 'calendar':
      return 'Calendar';
    case 'timeline':
      return 'Timeline';
    case 'review':
      return 'Review';
    default:
      return 'Week';
  }
}
