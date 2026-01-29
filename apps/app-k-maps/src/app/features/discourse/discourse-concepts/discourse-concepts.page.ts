import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { discourseConcepts, DiscourseConcept } from '../discourse-mock';

type CategoryFilter = {
  key: string;
  label: string;
};

@Component({
  selector: 'app-discourse-concepts',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './discourse-concepts.page.html',
  styleUrls: ['./discourse-concepts.page.scss'],
})
export class DiscourseConceptsPage {
  query = '';
  activeFilters = new Set<string>();
  readonly filters: CategoryFilter[] = [
    { key: 'Epistemology', label: 'Epistemology' },
    { key: 'Law', label: 'Law' },
    { key: 'Morality', label: 'Morality' },
    { key: 'Power', label: 'Power' },
    { key: 'Society', label: 'Society' },
    { key: 'Narrative', label: 'Narrative' },
  ];

  wv_concepts = discourseConcepts;
  filtered: DiscourseConcept[] = discourseConcepts;

  constructor(private readonly router: Router) {}

  onSearch(event: Event) {
    const target = event.target as HTMLIonSearchbarElement | null;
    this.query = target?.value?.toString() ?? '';
    this.applyFilters();
  }

  toggleFilter(key: string) {
    if (this.activeFilters.has(key)) {
      this.activeFilters.delete(key);
    } else {
      this.activeFilters.add(key);
    }
    this.applyFilters();
  }

  isFilterActive(key: string) {
    return this.activeFilters.has(key);
  }

  openConcept(slug: string) {
    this.router.navigate(['/discourse/wv_concepts', slug]);
  }

  private applyFilters() {
    const q = this.query.trim().toLowerCase();
    const active = this.activeFilters;
    this.filtered = this.wv_concepts.filter((concept) => {
      const matchesQuery =
        !q ||
        concept.label_ar.toLowerCase().includes(q) ||
        concept.label_en.toLowerCase().includes(q);
      const matchesCategory = active.size === 0 || active.has(concept.category);
      return matchesQuery && matchesCategory;
    });
  }
}
