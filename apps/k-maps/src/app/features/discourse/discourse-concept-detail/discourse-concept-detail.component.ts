import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconDirective } from '@coreui/icons-angular';
import { discourseConcepts } from '../discourse-mock';
import { DiscourseConcept } from '../../../shared/models/discourse/discourse-concept.model';

type ConceptTab = 'definition' | 'evidence' | 'flow' | 'discourses' | 'relations' | 'crossrefs';

@Component({
  selector: 'app-discourse-concept-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, IconDirective],
  templateUrl: './discourse-concept-detail.component.html',
  styleUrls: ['./discourse-concept-detail.component.scss']
})
export class DiscourseConceptDetailComponent {
  concept: DiscourseConcept | undefined;
  activeTab: ConceptTab = 'definition';

  constructor(private readonly route: ActivatedRoute, private readonly router: Router) {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.concept = discourseConcepts.find((item) => item.slug === slug);
  }

  setTab(tab: ConceptTab) {
    this.activeTab = tab;
  }

  openRelation(id: string) {
    this.router.navigate(['/discourse/relations', id]);
  }

  relationLabel(status: DiscourseConcept['relations'][number]['status']) {
    switch (status) {
      case 'align':
        return 'Aligns';
      case 'partial':
        return 'Partial';
      case 'contradicts':
        return 'Contradicts';
      default:
        return 'Unknown';
    }
  }

  relationBadge(status: DiscourseConcept['relations'][number]['status']) {
    switch (status) {
      case 'align':
        return 'bg-success';
      case 'partial':
        return 'bg-warning text-dark';
      case 'contradicts':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }
}
