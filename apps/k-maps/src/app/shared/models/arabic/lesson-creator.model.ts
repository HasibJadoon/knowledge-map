export type LessonNodeKey = 'reference' | 'text' | 'sentences' | 'passage_layers' | 'comprehension';
export type LessonTab = LessonNodeKey | 'json';
export type LessonReference = Record<string, unknown> & {
  ref_label?: string;
};
export type LessonJson = {
  entity_type: string;
  id: string;
  lesson_type: string;
  subtype: string;
  title: string;
  title_ar: string;
  status: string;
  difficulty: number;
  reference: LessonReference;
  text: {
    arabic_full: Array<Record<string, unknown>>;
    mode: string;
  };
  sentences: Array<Record<string, unknown>>;
  passage_layers: Array<Record<string, unknown>>;
  comprehension: {
    reflective: unknown[];
    analytical: unknown[];
    mcqs: unknown;
  };
};
export type LessonMeta = {
  title: string;
  title_ar: string;
  lesson_type: string;
  status: string;
  subtype: string;
  difficulty: number;
  referenceLabel: string;
};

export type LessonNodeTextMap = {
  reference: string;
  text: string;
  sentences: string;
  passage_layers: string;
  comprehension: string;
};

export type LessonNodeErrorMap = LessonNodeTextMap;
