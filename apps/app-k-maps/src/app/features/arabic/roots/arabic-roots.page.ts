import { Component, OnInit } from '@angular/core';
import { ArabicRootsService, ArabicRoot } from '../../../shared/services/arabic-roots.service';

@Component({
  selector: 'app-arabic-roots',
  templateUrl: './arabic-roots.page.html',
  styleUrls: ['./arabic-roots.page.scss'],
  standalone: false,
})
export class ArabicRootsPage implements OnInit {
  roots: ArabicRoot[] = [];
  filtered: ArabicRoot[] = [];
  loading = false;
  error = '';
  searchTerm = '';

  constructor(private readonly rootsService: ArabicRootsService) {}

  ngOnInit(): void {
    this.loadRoots();
  }

  loadRoots(event?: CustomEvent): void {
    this.loading = true;
    this.error = '';

    this.rootsService.list().subscribe({
      next: (response) => {
        const results = Array.isArray(response?.results) ? response.results : [];
        this.roots = results;
        this.applyFilter(this.searchTerm);
        this.loading = false;
        if (event?.target && 'complete' in event.target) {
          (event.target as HTMLIonRefresherElement).complete();
        }
      },
      error: (err) => {
        const apiError = err?.error?.message || err?.error?.error;
        this.error = apiError || 'Failed to load roots.';
        this.loading = false;
        if (event?.target && 'complete' in event.target) {
          (event.target as HTMLIonRefresherElement).complete();
        }
      },
    });
  }

  onSearchChange(event: CustomEvent): void {
    const value = (event.detail as any)?.value ?? '';
    this.applyFilter(String(value));
  }

  private applyFilter(term: string): void {
    const normalized = term.trim().toLowerCase();
    this.searchTerm = term;
    if (!normalized) {
      this.filtered = [...this.roots];
      return;
    }

    this.filtered = this.roots.filter((item) => {
      const root = item.root?.toLowerCase() ?? '';
      const family = item.family?.toLowerCase() ?? '';
      return root.includes(normalized) || family.includes(normalized);
    });
  }
}
