import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { discourseRelations } from '../discourse-mock';

@Component({
  selector: 'app-discourse-relation-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './discourse-relation-detail.page.html',
  styleUrls: ['./discourse-relation-detail.page.scss'],
})
export class DiscourseRelationDetailPage {
  private readonly route = inject(ActivatedRoute);
  relation = this.loadRelation();

  private loadRelation() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    return discourseRelations[id];
  }

  relationLabel(status: 'align' | 'partial' | 'contradicts' | 'unknown') {
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
}
