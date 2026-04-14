import { Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { arrowBackOutline } from 'ionicons/icons';

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
  readonly searchValue = signal('');
  readonly title = computed(() => plannerTabTitle(this.activeTab()));
  readonly showSearch = computed(() => this.activeTab() === 'lessons' || this.activeTab() === 'podcast');
  readonly searchPlaceholder = computed(() => (
    this.activeTab() === 'podcast' ? 'Search episodes' : 'Search lessons'
  ));

  ngOnInit(): void {
    const initialTab = resolvePlannerTab(
      this.route.snapshot.queryParamMap.get('tab'),
      this.router.url,
    );
    this.activeTab.set(initialTab);
    this.searchValue.set(this.route.snapshot.queryParamMap.get('q') ?? '');

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParams) => {
        this.activeTab.set(resolvePlannerTab(queryParams.get('tab'), this.router.url));
        this.searchValue.set(queryParams.get('q') ?? '');
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

  openSettings(): void {
    void this.router.navigate(['/home']);
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

  onSearchInput(value: string | null | undefined): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: (value ?? '').trim() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

type PlannerTabKey = 'week' | 'kanban' | 'inbox' | 'lessons' | 'podcast' | 'review';

function isPlannerTabKey(value: string | null | undefined): value is PlannerTabKey {
  return value === 'week'
    || value === 'kanban'
    || value === 'inbox'
    || value === 'lessons'
    || value === 'podcast'
    || value === 'review';
}

function resolvePlannerTab(value: string | null | undefined, url: string): PlannerTabKey {
  if (isPlannerTabKey(value)) {
    return value;
  }

  if (url.includes('/planner/kanban')) return 'kanban';
  if (url.includes('/planner/inbox')) return 'inbox';
  if (url.includes('/planner/lessons')) return 'lessons';
  if (url.includes('/planner/podcast')) return 'podcast';
  if (url.includes('/planner/review')) return 'review';
  return 'week';
}

function plannerTabTitle(tab: PlannerTabKey): string {
  switch (tab) {
    case 'kanban':
      return 'Kanban';
    case 'inbox':
      return 'Inbox';
    case 'lessons':
      return 'Lessons';
    case 'podcast':
      return 'Podcast';
    case 'review':
      return 'Review';
    default:
      return 'Week';
  }
}
