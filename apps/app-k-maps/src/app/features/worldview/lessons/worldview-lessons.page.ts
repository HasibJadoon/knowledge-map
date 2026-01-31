import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { worldviewEntries, worldviewKinds } from './worldview-mock';

@Component({
  selector: 'app-worldview-lessons',
  templateUrl: './worldview-lessons.page.html',
  styleUrls: ['./worldview-lessons.page.scss'],
  standalone: false,
})
export class WorldviewLessonsPage {
  q = '';
  activeKind = 'All';
  kinds = ['All', ...worldviewKinds];
  rows = worldviewEntries;

  private readonly router = inject(Router);

  setKind(kind: string) {
    this.activeKind = kind;
    this.applyFilters();
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLIonSearchbarElement | null;
    this.q = target?.value?.toString() ?? '';
    this.applyFilters();
  }

  openEntry(id: number) {
    this.router.navigate(['/worldview/lessons', id]);
  }

  openCapture() {
    this.router.navigate(['/worldview/lessons/new'], { queryParams: { mode: 'capture' } });
  }

  private applyFilters() {
    const q = this.q.trim().toLowerCase();
    this.rows = worldviewEntries.filter((entry) => {
      const matchesKind = this.activeKind === 'All' || entry.source.kind === this.activeKind;
      const matchesQuery =
        !q ||
        entry.source.title.toLowerCase().includes(q) ||
        entry.source.creator.toLowerCase().includes(q) ||
        entry.summary.one_line.toLowerCase().includes(q);
      return matchesKind && matchesQuery;
    });
  }
}
