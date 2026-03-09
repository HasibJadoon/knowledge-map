import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DashboardCardView, toDashboardSectionCard } from '../../dashboard-card.model';
import { DASHBOARD_MENU_SECTIONS, DashboardMenuLink, DashboardMenuSection } from '../../dashboard-menu.data';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly query = signal('');

  readonly cards = computed(() => {
    const normalizedQuery = normalizeQuery(this.query());
    if (!normalizedQuery) {
      return DASHBOARD_MENU_SECTIONS.map(toDashboardSectionCard);
    }

    return DASHBOARD_MENU_SECTIONS.reduce<DashboardCardView[]>((cards, section) => {
      cards.push(...this.matchingItemCards(section, normalizedQuery));
      return cards;
    }, []);
  });

  readonly emptyText = computed(() => {
    return this.query().trim()
      ? 'No tools match that search.'
      : 'No menu items.';
  });

  readonly searchSummary = computed(() => {
    const normalizedQuery = normalizeQuery(this.query());
    if (!normalizedQuery) {
      const sectionCount = DASHBOARD_MENU_SECTIONS.length;
      return `${sectionCount} ${sectionCount === 1 ? 'section' : 'sections'} ready`;
    }

    const matchCount = this.cards().length;
    return `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`;
  });

  onSearchInput(value: string | null | undefined): void {
    this.query.set(value ?? '');
  }

  private matchingItemCards(section: DashboardMenuSection, query: string): DashboardCardView[] {
    const sectionMatches = matchesMenuText(section.title, query) || matchesMenuText(section.subtitle, query);

    return section.items
      .filter((item) => {
        return sectionMatches
          || matchesMenuText(item.title, query)
          || matchesMenuText(item.subtitle, query);
      })
      .map((item) => this.toSearchCard(item, section));
  }

  private toSearchCard(item: DashboardMenuLink, section: DashboardMenuSection): DashboardCardView {
    const itemSubtitle = item.subtitle.trim();
    const sectionTitle = section.title.trim();
    const subtitle = itemSubtitle.toLowerCase() === sectionTitle.toLowerCase()
      ? sectionTitle
      : `${sectionTitle} · ${itemSubtitle}`;

    return {
      title: item.title,
      subtitle,
      icon: item.icon,
      route: item.route,
      tone: section.tone,
    };
  }
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesMenuText(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}
