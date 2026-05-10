export type LaneStatus = 'clean' | 'needs_review' | 'raw' | 'broken';

export interface LaneDisplayEntry {
  id: string;
  headingAr: string;
  pageLabel: string | null;
  pageNo: number | null;

  definitionRaw: string;
  definitionDisplay: string;
  definitionPreview: string;

  forms: string[];
  sourceRefs: string[];

  status: LaneStatus;
  statusLabelAr: string;
  warnings: string[];

  blockCount: number;
  rawLabel: string | null;

  // raw JSON for the debug drawer
  cleanerJson: string | null;
  uiJson: string | null;
}
