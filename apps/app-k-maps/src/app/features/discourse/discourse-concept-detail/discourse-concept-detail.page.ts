import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { discourseConcepts, DiscourseConcept } from '../discourse-mock';

@Component({
  selector: 'app-discourse-concept-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './discourse-concept-detail.page.html',
  styleUrls: ['./discourse-concept-detail.page.scss'],
})
export class DiscourseConceptDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  concept: DiscourseConcept | undefined = discourseConcepts.find(
    (item) => item.slug === this.route.snapshot.paramMap.get('slug')
  );

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

  relationColor(status: DiscourseConcept['relations'][number]['status']) {
    switch (status) {
      case 'align':
        return 'success';
      case 'partial':
        return 'warning';
      case 'contradicts':
        return 'danger';
      default:
        return 'medium';
    }
  }
}
