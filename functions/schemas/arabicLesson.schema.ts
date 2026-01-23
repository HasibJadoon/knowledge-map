const lessonAyahUnitDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["unit_id", "unit_type", "arabic", "translation", "surah", "ayah", "notes"],
  properties: {
    unit_id: { type: "string", minLength: 1 },
    unit_type: { const: "ayah" },
    arabic: {
      type: "string",
      minLength: 1,
      description: "Keep exactly as stored (e.g., non-diacritic with ayah marker if you use it).",
    },
    translation: { anyOf: [{ type: "string" }, { type: "null" }] },
    surah: { type: "integer", minimum: 1, maximum: 114 },
    ayah: { type: "integer", minimum: 1 },
    notes: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
};

const lessonTokenDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["token_id", "surface_ar", "lemma_ar", "root", "root_id", "pos"],
  properties: {
    token_id: { type: "string", minLength: 1 },
    surface_ar: {
      type: "string",
      minLength: 1,
      description: "Surface token. MUST split harf (و/ف/ب/ك/ل/س) as its own token.",
    },
    lemma_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
    root: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Triliteral root without spaces when present (e.g., جبي).",
    },
    root_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
    pos: {
      type: "string",
      enum: ["verb", "noun", "adj", "particle", "phrase", "other"],
    },
    morph_ref: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["root_id", "lexicon_entry_id"],
      properties: {
        root_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
        lexicon_entry_id: { anyOf: [{ type: "integer" }, { type: "null" }] },
      },
    },
    features: { type: ["object", "null"], additionalProperties: true },
  },
};

const lessonSentenceDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "sentence_id",
    "unit_id",
    "arabic",
    "translation",
    "notes",
    "tokens",
    "roots",
    "root_ids",
    "grammar_concept_refs",
  ],
  properties: {
    sentence_id: { type: "string", minLength: 1 },
    unit_id: {
      type: "string",
      minLength: 1,
      description: "Points to a unit_id in text.arabic_full",
    },
    arabic: { type: "string", minLength: 1 },
    translation: { anyOf: [{ type: "string" }, { type: "null" }] },
    notes: { anyOf: [{ type: "string" }, { type: "null" }] },
    roots: {
      type: ["array", "null"],
      items: { type: "string", minLength: 1 },
    },
    root_ids: {
      type: ["array", "null"],
      items: { type: "integer" },
    },
    tokens: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/LessonToken" },
    },
    grammar_concept_refs: {
      type: ["array", "null"],
      items: {
        type: "string",
        minLength: 1,
        description: "References grammar_concepts table IDs (e.g., GRAM_NAHW_001).",
      },
    },
  },
};

const passageLayerDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "layer_id",
    "layer_type",
    "label",
    "label_ar",
    "linked_unit_ids",
    "linked_sentence_ids",
    "linked_token_ids",
    "notes",
    "data",
  ],
  properties: {
    layer_id: { type: "string", minLength: 1 },
    layer_type: {
      type: "string",
      enum: [
        "discourse",
        "rhetoric",
        "reasoning",
        "idiom",
        "argument",
        "narrative_move",
        "conclusion",
        "other",
      ],
    },
    label: { type: "string", minLength: 1 },
    label_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
    linked_unit_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    linked_sentence_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    linked_token_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    notes: { anyOf: [{ type: "string" }, { type: "null" }] },
    data: { type: ["object", "null"], additionalProperties: true },
  },
};

const mcqOptionDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["option", "is_correct"],
  properties: {
    option: { type: "string", minLength: 1 },
    is_correct: { type: "boolean" },
  },
};

const lessonMCQDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["mcq_id", "linked_unit_ids", "question", "question_ar", "options", "explanation", "tags"],
  properties: {
    mcq_id: { type: "string", minLength: 1 },
    linked_unit_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    question: { type: "string", minLength: 1 },
    question_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
    options: {
      type: "array",
      minItems: 2,
      items: mcqOptionDefinition,
    },
    explanation: { anyOf: [{ type: "string" }, { type: "null" }] },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
};

const lessonMCQGroupsDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["text", "vocabulary", "grammar"],
  properties: {
    text: {
      type: "array",
      items: lessonMCQDefinition,
    },
    vocabulary: {
      type: "array",
      items: lessonMCQDefinition,
    },
    grammar: {
      type: "array",
      items: lessonMCQDefinition,
    },
  },
};

const reflectiveQuestionDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "question_id",
    "linked_unit_ids",
    "question",
    "question_ar",
    "answer_hint",
    "tags",
    "quranic_ref",
  ],
  properties: {
    question_id: { type: "string", minLength: 1 },
    linked_unit_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    question: { type: "string", minLength: 1 },
    question_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
    answer_hint: { anyOf: [{ type: "string" }, { type: "null" }] },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    quranic_ref: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
};

const analyticalQuestionDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "question_id",
    "linked_unit_ids",
    "question",
    "question_ar",
    "answer_hint",
    "tags",
    "quranic_ref",
  ],
  properties: {
    question_id: { type: "string", minLength: 1 },
    linked_unit_ids: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    question: { type: "string", minLength: 1 },
    question_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
    answer_hint: { anyOf: [{ type: "string" }, { type: "null" }] },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    quranic_ref: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
};

const lessonComprehensionDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["reflective", "analytical", "mcqs"],
  properties: {
    reflective: {
      type: "array",
      items: reflectiveQuestionDefinition,
    },
    analytical: {
      type: "array",
      items: analyticalQuestionDefinition,
    },
    mcqs: lessonMCQGroupsDefinition,
  },
};

const defs = {
  LessonAyahUnit: lessonAyahUnitDefinition,
  LessonToken: lessonTokenDefinition,
  LessonSentence: lessonSentenceDefinition,
  PassageLayer: passageLayerDefinition,
  MCQOption: mcqOptionDefinition,
  LessonMCQ: lessonMCQDefinition,
  LessonMCQGroups: lessonMCQGroupsDefinition,
  ReflectiveQuestion: reflectiveQuestionDefinition,
  AnalyticalQuestion: analyticalQuestionDefinition,
  LessonComprehension: lessonComprehensionDefinition,
};

const referenceDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["source_type", "source_ref_id", "surah", "ayah_from", "ayah_to", "ref_label", "citation"],
  properties: {
    source_type: {
      type: "string",
      enum: ["quran", "classical_text", "hadith", "poetry", "grammar_example", "modern_arabic"],
    },
    source_ref_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    surah: { type: ["integer", "null"], minimum: 1, maximum: 114 },
    ayah_from: { type: ["integer", "null"], minimum: 1 },
    ayah_to: { type: ["integer", "null"], minimum: 1 },
    ref_label: { anyOf: [{ type: "string" }, { type: "null" }] },
    citation: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
};

const textDefinition = {
  type: "object",
  additionalProperties: false,
  required: ["arabic_full", "mode"],
  properties: {
    arabic_full: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/LessonAyahUnit" },
    },
    mode: {
      type: "string",
      enum: ["original", "edited", "mixed"],
    },
  },
};

const metaProperties = {
  entity_type: { const: "ar_lesson" },
  id: { type: "string", minLength: 1 },
  lesson_type: {
    type: "string",
    enum: ["quran", "classical_text", "hadith", "poetry", "grammar_example", "modern_arabic"],
  },
  subtype: {
    anyOf: [
      { type: "string" },
      { type: "null" },
    ],
    enum: ["discourse", "narrative", "legal", "theology", "rhetoric", "grammar", "vocabulary", "reflection", null],
  },
  title: { type: "string", minLength: 1 },
  title_ar: { anyOf: [{ type: "string" }, { type: "null" }] },
  status: {
    type: "string",
    enum: ["draft", "reviewed", "active", "archived"],
  },
  difficulty: {
    type: "integer",
    enum: [1, 2, 3, 4, 5],
  },
  reference: referenceDefinition,
  text: textDefinition,
  created_at: { type: "string", minLength: 1 },
  updated_at: { anyOf: [{ type: "string" }, { type: "null" }] },
};

const createSchema = (options: {
  requiredFields: string[];
  additionalProperties?: boolean;
  comprehensionFragment?: object | null;
}) => ({
  type: "object",
  additionalProperties: options.additionalProperties ?? false,
  $defs: defs,
  required: [...new Set([...Object.keys(metaProperties), ...options.requiredFields])],
  properties: {
    ...metaProperties,
    ...(options.requiredFields.includes("sentences")
      ? {
          sentences: {
            type: "array",
            minItems: 3,
            items: { $ref: "#/$defs/LessonSentence" },
          },
        }
      : {}),
    ...(options.requiredFields.includes("passage_layers")
      ? {
          passage_layers: {
            type: "array",
            minItems: 3,
            items: { $ref: "#/$defs/PassageLayer" },
          },
        }
      : {}),
    ...(options.comprehensionFragment
      ? {
          comprehension: options.comprehensionFragment,
        }
      : {}),
  },
});

const reflectiveAnalyticalFragment = {
  type: "object",
  additionalProperties: false,
  required: ["reflective", "analytical"],
  properties: {
    reflective: {
      type: "array",
      minItems: 3,
      items: { $ref: "#/$defs/ReflectiveQuestion" },
    },
    analytical: {
      type: "array",
      minItems: 3,
      items: { $ref: "#/$defs/AnalyticalQuestion" },
    },
  },
};

const mcqFragment = {
  type: "object",
  additionalProperties: false,
  required: ["mcqs", "methodology_summary"],
  properties: {
    mcqs: {
      type: "object",
      additionalProperties: false,
      required: ["text", "vocabulary", "grammar"],
      properties: {
        text: {
          type: "array",
          minItems: 3,
          items: { $ref: "#/$defs/LessonMCQ" },
        },
        vocabulary: {
          type: "array",
          minItems: 3,
          items: { $ref: "#/$defs/LessonMCQ" },
        },
        grammar: {
          type: "array",
          minItems: 3,
          items: { $ref: "#/$defs/LessonMCQ" },
        },
      },
    },
    methodology_summary: { type: ["string", "null"] },
  },
};

export const ArabicLessonMetadataSchema = createSchema({ requiredFields: [] });
export const ArabicLessonSentencesSchema = createSchema({ requiredFields: ["sentences"] });
export const ArabicLessonPassageLayerSchema = createSchema({ requiredFields: ["passage_layers"] });
export const ArabicLessonReflectiveAnalyticalSchema = createSchema({
  requiredFields: [],
  comprehensionFragment: reflectiveAnalyticalFragment,
});
export const ArabicLessonMCQSchema = createSchema({
  requiredFields: [],
  comprehensionFragment: mcqFragment,
});
export const ArabicLessonSchema = createSchema({
  requiredFields: ["sentences", "passage_layers"],
  comprehensionFragment: lessonComprehensionDefinition,
});
