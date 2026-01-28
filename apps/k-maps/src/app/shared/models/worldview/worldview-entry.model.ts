export type WorldviewStatus = 'raw' | 'processed' | 'linked';

export interface WorldviewSource {
  kind: string;
  title: string;
  creator: string;
  publisher?: string;
  platform?: string;
  url?: string;
  date?: string;
  language?: string;
  extra?: Record<string, string>;
}

export interface WorldviewIntake {
  why_logged: string;
  status: WorldviewStatus;
  my_confidence: number;
}

export interface WorldviewSummary {
  one_line: string;
  short: string;
  tags: string[];
}

export interface WorldviewEvidence {
  kind: string;
  ref: string;
  snippet: string;
}

export interface WorldviewUnit {
  id: string;
  type: string;
  text: string;
  stance: string;
  evidence: WorldviewEvidence[];
  notes: string;
  concept_refs: string[];
}

export interface WorldviewFlowEdge {
  from: string;
  to: string;
  relation: string;
  note: string;
}

export interface WorldviewQuestion {
  q: string;
  type?: string;
  next_action?: string;
}

export interface WorldviewLinks {
  related_entries: number[];
  related_quran_lessons: number[];
  related_library_ids: number[];
}

export interface WorldviewEntry {
  id: number;
  mode: 'worldview_entry';
  source: WorldviewSource;
  intake: WorldviewIntake;
  summary: WorldviewSummary;
  units: WorldviewUnit[];
  flow: {
    argument_edges: WorldviewFlowEdge[];
  };
  questions: {
    key_questions: WorldviewQuestion[];
    my_questions: WorldviewQuestion[];
  };
  links?: Partial<WorldviewLinks>;
}

export type WorldviewEntrySummary = Pick<
  WorldviewEntry,
  'id' | 'source' | 'summary' | 'intake'
>;

export type WorldviewMode = 'view' | 'edit' | 'capture';
