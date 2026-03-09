import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { DashboardMenuSection, findDashboardMenuSection } from '../../dashboard-menu.data';
import { toDashboardItemCard } from '../../dashboard-card.model';

@Component({
  selector: 'app-dashboard-section',
  templateUrl: './dashboard-section.page.html',
  styleUrl: './dashboard-section.page.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSectionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly section = signal<DashboardMenuSection | null>(null);
  readonly cards = computed(() => {
    const currentSection = this.section();

    if (!currentSection) {
      return [];
    }

    return currentSection.items.map((item) => toDashboardItemCard(item, currentSection.tone));
  });

  constructor() {
    this.route.paramMap.pipe(
      map((params) => findDashboardMenuSection(params.get('section'))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((section) => {
      this.section.set(section);
    });
  }
}
