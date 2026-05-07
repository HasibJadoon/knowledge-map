import { Injectable, signal } from '@angular/core';

@Injectable()
export class QuranResearchSearchService {
  readonly searchTerm = signal('');

  setSearch(value: string | null | undefined): void {
    this.searchTerm.set((value ?? '').replace(/^\s+/, ''));
  }
}
