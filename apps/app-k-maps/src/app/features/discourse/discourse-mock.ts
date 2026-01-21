import discourseData from '../../../assets/mockups/discourse.json';

export type DiscourseEvidence = {
  ref: string;
  snippet: string;
  note: string;
};

export type DiscourseRelation = {
  id: string;
  concept: { slug: string; label_ar: string; label_en: string };
  source: string;
  status: 'align' | 'partial' | 'contradicts' | 'unknown';
  summary: string;
  evidence: DiscourseEvidence[];
  reasoning: string;
};

export type DiscourseConcept = {
  slug: string;
  label_ar: string;
  label_en: string;
  category: string;
  anchors: number;
  definition: string;
  quranEvidence: DiscourseEvidence[];
  flow: string[];
  otherDiscourses: Array<{ name: string; bullets: string[] }>;
  relations: DiscourseRelation[];
  crossRefs: string[];
};

const typedDiscourse = discourseData as { concepts: DiscourseConcept[] };

export const discourseConcepts = typedDiscourse.concepts;

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
