export interface DiscourseEvidence {
  ref: string;
  snippet: string;
  note: string;
}

export type DiscourseRelationStatus = 'align' | 'partial' | 'contradicts' | 'unknown';

export interface DiscourseRelation {
  id: string;
  concept: { slug: string; label_ar: string; label_en: string };
  source: string;
  status: DiscourseRelationStatus;
  summary: string;
  evidence: DiscourseEvidence[];
  reasoning: string;
}

export interface DiscourseConcept {
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
}
