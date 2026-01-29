import {
  DiscourseConcept,
  DiscourseEvidence,
  DiscourseRelation,
} from '../../shared/models/discourse/discourse-concept.model';

import discourseData from '../../../assets/mockups/discourse.json';

const typedDiscourse = discourseData as { wv_concepts: DiscourseConcept[] };

export const discourseConcepts: DiscourseConcept[] = typedDiscourse.wv_concepts;

const allRelations = discourseConcepts.reduce<DiscourseRelation[]>(
  (acc, concept) => acc.concat(concept.relations),
  []
);

export const discourseRelations = allRelations.reduce<Record<string, DiscourseRelation>>(
  (acc, rel) => {
    acc[rel.id] = rel;
    return acc;
  },
  {}
);

export type { DiscourseConcept, DiscourseEvidence, DiscourseRelation };
