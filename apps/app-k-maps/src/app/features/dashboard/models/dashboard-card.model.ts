import { DashboardMenuLink, DashboardMenuSection, DashboardTone } from '../data/dashboard-menu.data';

export type DashboardCardView = {
  title: string;
  subtitle: string;
  icon: string;
  route: string[];
  tone: DashboardTone;
};

export function dashboardSectionRoute(section: Pick<DashboardMenuSection, 'key'> | string): string[] {
  const key = typeof section === 'string' ? section : section.key;
  return ['/dashboard', key];
}

export function toDashboardSectionCard(section: DashboardMenuSection): DashboardCardView {
  return {
    title: section.title,
    subtitle: section.subtitle,
    icon: section.icon,
    tone: section.tone,
    route: dashboardSectionRoute(section),
  };
}

export function toDashboardItemCard(item: DashboardMenuLink, tone: DashboardTone): DashboardCardView {
  return {
    title: item.title,
    subtitle: item.subtitle,
    icon: item.icon,
    tone,
    route: item.route,
  };
}
