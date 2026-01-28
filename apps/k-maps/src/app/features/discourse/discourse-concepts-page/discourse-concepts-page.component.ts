import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { discourseConcepts } from '../discourse-mock';
import { DiscourseConcept } from '../../../shared/models/discourse/discourse-concept.model';

@Component({
  selector: 'app-discourse-concepts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discourse-concepts-page.component.html',
  styleUrls: ['./discourse-concepts-page.component.scss']
})
export class DiscourseConceptsPageComponent {
  query = '';
  activeFilters = new Set<string>();

  concepts = discourseConcepts;
  filtered: DiscourseConcept[] = discourseConcepts;

  constructor(private readonly router: Router, private readonly route: ActivatedRoute) {
    this.route.queryParamMap.subscribe((params) => {
      this.query = params.get('q') ?? '';
      const categories = params.get('categories') ?? '';
      this.activeFilters = new Set(
        categories ? categories.split(',').map((c) => c.trim()).filter(Boolean) : []
      );
      this.applyFilters();
    });
  }

  applyFilters() {
    const q = this.query.trim().toLowerCase();
    const active = this.activeFilters;
    this.filtered = this.concepts.filter((concept) => {
      const matchesQuery =
        !q ||
        concept.label_ar.toLowerCase().includes(q) ||
        concept.label_en.toLowerCase().includes(q);
      const matchesCategory = active.size === 0 || active.has(concept.category);
      return matchesQuery && matchesCategory;
    });
  }

  openConcept(slug: string) {
    this.router.navigate(['/discourse/concepts', slug]);
  }
}
