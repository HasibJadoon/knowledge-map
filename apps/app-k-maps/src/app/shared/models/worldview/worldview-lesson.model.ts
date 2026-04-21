export interface WorldviewLesson {
  entity_type: string;
  id: string;
  lesson_type: string;
  subtype: string;
  title: string;
  status: string;
  difficulty: number;
  reference: {
  source_ref_ids: unknown[];
  primary_source_ref_id: string;
  date: string;
};
  text: {
  mode: string;
  content_blocks: {
  block_id: string;
  type: string;
  lang: string;
  text: string;
  source_ref_id: string;
  citation: string;
}[];
};
  claims: {
  claim_id: string;
  claim_type: string;
  text: string;
  stance: string;
  confidence: number;
  evidence_ref_blocks: unknown[];
  notes: string;
}[];
  wv_concepts: {
  concept_ref_id: string;
  role: string;
}[];
  comparison: {
  quran_relation: string;
  summary: string;
  quran_refs: unknown[];
  notes: string;
};
  mcqs: {
  mcq_id: string;
  type: string;
  difficulty: number;
  question: string;
  options: {
  id: string;
  text: string;
  is_correct: boolean;
}[];
  explanation: string;
  tags: unknown[];
}[];
  links: {
  library_refs: unknown[];
  cross_refs: unknown[];
  publishable_content_refs: unknown[];
};
  tags: unknown[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export class WorldviewLessonModel {
  constructor(public data: WorldviewLesson) {}
}
