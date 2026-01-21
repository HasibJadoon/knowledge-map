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

const typedWorldview = worldviewData as { kinds: string[]; entries: WorldviewEntry[] };

export const worldviewKinds = typedWorldview.kinds;

export const worldviewEntries = typedWorldview.entries;
