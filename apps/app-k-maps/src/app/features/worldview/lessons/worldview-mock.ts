import worldviewData from '../../../../assets/mockups/worldview.json';

export type WorldviewEntry = {
  id: number;
  mode: 'worldview_entry';
  source: {
    kind: string;
    title: string;
    creator: string;
    publisher?: string;
    platform?: string;
    url?: string;
    date?: string;
    language?: string;
    extra?: Record<string, string>;
  };
  intake: {
    why_logged: string;
    status: 'raw' | 'processed' | 'linked';
    my_confidence: number;
  };
  summary: {
    one_line: string;
    short: string;
    tags: string[];
  };
  units: Array<{
    id: string;
    type: string;
    text: string;
    stance: string;
    evidence: Array<{ kind: string; ref: string; snippet: string }>;
    notes: string;
    concept_refs: string[];
  }>;
  flow: {
    argument_edges: Array<{ from: string; to: string; relation: string; note: string }>;
  };
  questions: {
    key_questions: Array<{ q: string; type: string }>;
    my_questions: Array<{ q: string; next_action: string }>;
  };
  links?: {
    related_entries: number[];
    related_quran_lessons: number[];
    related_library_ids: number[];
  };
};

const sampleLesson = worldviewData.worldview_lesson_sample_data;
const sampleBlocks = sampleLesson?.text?.content_blocks ?? [];

const entry: WorldviewEntry = {
  id: 1,
  mode: 'worldview_entry',
  source: {
    kind: sampleLesson?.subtype ?? 'entry',
    title: sampleLesson?.title ?? 'Worldview Sample',
    creator: sampleLesson?.reference?.primary_source_ref_id ?? 'Unknown',
    publisher: sampleLesson?.reference?.source_ref_ids?.[0],
    platform: 'book',
    url: '',
    date: sampleLesson?.reference?.date,
  },
  intake: {
    why_logged: sampleLesson?.notes ?? '',
    status: 'processed',
    my_confidence: typeof sampleLesson?.difficulty === 'number' ? sampleLesson.difficulty : 3,
  },
  summary: {
    one_line: sampleBlocks[0]?.text ?? sampleLesson?.title ?? '',
    short: sampleBlocks.map((block) => block.text ?? '').join(' '),
    tags: sampleLesson?.tags ?? [],
  },
  units: sampleBlocks.map((block, index) => ({
    id: block.block_id ?? `unit-${index}`,
    type: block.type ?? 'paragraph',
    text: block.text ?? '',
    stance: block.lang ?? 'en',
    evidence: [
      {
        kind: block.type ?? 'text',
        ref: block.source_ref_id ?? sampleLesson?.reference?.primary_source_ref_id ?? '',
        snippet: block.citation ?? block.text ?? '',
      },
    ],
    notes: block.citation ?? '',
    concept_refs: sampleLesson?.wv_concepts?.map((concept) => concept.concept_ref_id) ?? [],
  })),
  flow: {
    argument_edges: [],
  },
  questions: {
    key_questions: [],
    my_questions: [],
  },
  links: {
    related_entries: [],
    related_quran_lessons: [],
    related_library_ids: [],
  },
};

export const worldviewEntries: WorldviewEntry[] = [entry];
export const worldviewKinds = Array.from(new Set(worldviewEntries.map((item) => item.source.kind)));
