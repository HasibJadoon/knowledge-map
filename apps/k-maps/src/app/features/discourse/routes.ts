import { Routes } from '@angular/router';
import { DiscoursePlaceholderComponent } from './discourse-placeholder/discourse-placeholder.component';
import { DiscourseConceptsPageComponent } from './discourse-concepts-page/discourse-concepts-page.component';
import { DiscourseConceptDetailComponent } from './discourse-concept-detail/discourse-concept-detail.component';
import { DiscourseRelationDetailComponent } from './discourse-relation-detail/discourse-relation-detail.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'quranic',
  },
  {
    path: 'quranic',
    component: DiscoursePlaceholderComponent,
    data: { title: "Qur'anic Discourse", subtitle: 'Coming soon.' },
  },
  {
    path: 'wv_concepts',
    component: DiscourseConceptsPageComponent,
  },
  {
    path: 'wv_concepts/:slug',
    component: DiscourseConceptDetailComponent,
  },
  {
    path: 'relations/:id',
    component: DiscourseRelationDetailComponent,
  },
  {
    path: 'flows',
    component: DiscoursePlaceholderComponent,
    data: { title: 'Flows', subtitle: 'Coming soon.' },
  },
];
