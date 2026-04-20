type DisplayLabelFields = {
  display_label_short?: string | null;
  display_label_medium?: string | null;
};

type WorldviewRow = Record<string, unknown>;

const HALLAQ_CH1_NODE_LABELS: Record<string, DisplayLabelFields> = {
  'wvn-hallaq-ch1-001': { display_label_short: 'State Impossible' },
  'wvn-hallaq-ch1-002': { display_label_short: 'Colonial Continuity' },
  'wvn-hallaq-ch1-003': { display_label_short: 'Iran Case' },
  'wvn-hallaq-ch1-004': { display_label_short: 'State Sharia' },
  'wvn-hallaq-ch1-005': { display_label_short: 'Not Proto-State' },
  'wvn-hallaq-ch1-006': { display_label_short: 'Moral Dissonance' },
  'wvn-hallaq-ch1-007': { display_label_short: 'Modernity Crisis' },
  'wvn-hallaq-ch1-008': { display_label_short: 'Moral Severance' },
  'wvn-hallaq-ch1-009': { display_label_short: 'Two Paradigms' },
  'wvn-hallaq-ch1-010': { display_label_short: 'Central Domain' },
  'wvn-hallaq-ch1-011': { display_label_short: 'Progress Moral' },
  'wvn-hallaq-ch1-012': { display_label_short: 'Sharia Core' },
  'wvn-hallaq-ch1-013': { display_label_short: 'Law -> Moral' },
  'wvn-hallaq-ch1-014': { display_label_short: 'Moral Jihad' },
  'wvn-hallaq-ch1-015': { display_label_short: 'Islamism Signal' },
  'wvn-hallaq-ch1-016': { display_label_short: 'Self-Grounding Progress' },
  'wvn-hallaq-ch1-017': { display_label_short: 'Eurocentric Progress' },
  'wvn-hallaq-ch1-018': { display_label_short: 'Moral Retrieval' },
  'wvn-hallaq-ch1-019': { display_label_short: 'Moral Continuity' },
};

const HALLAQ_CH1_EDGE_LABELS: Record<string, DisplayLabelFields> = {
  'wve-hallaq-ch1-001': { display_label_short: 'supports' },
  'wve-hallaq-ch1-002': { display_label_short: 'supports' },
  'wve-hallaq-ch1-003': { display_label_short: 'supports' },
  'wve-hallaq-ch1-004': { display_label_short: 'supports' },
  'wve-hallaq-ch1-005': { display_label_short: 'supports' },
  'wve-hallaq-ch1-006': { display_label_short: 'part of' },
  'wve-hallaq-ch1-007': { display_label_short: 'part of' },
  'wve-hallaq-ch1-008': { display_label_short: 'part of' },
  'wve-hallaq-ch1-009': { display_label_short: 'part of' },
  'wve-hallaq-ch1-010': { display_label_short: 'part of' },
  'wve-hallaq-ch1-011': { display_label_short: 'supports' },
  'wve-hallaq-ch1-012': { display_label_short: 'supports' },
  'wve-hallaq-ch1-013': { display_label_short: 'supports' },
  'wve-hallaq-ch1-014': { display_label_short: 'leads to' },
  'wve-hallaq-ch1-015': { display_label_short: 'leads to' },
  'wve-hallaq-ch1-016': { display_label_short: 'leads to' },
  'wve-hallaq-ch1-017': { display_label_short: 'supports' },
  'wve-hallaq-ch1-018': { display_label_short: 'supports' },
  'wve-hallaq-ch1-019': { display_label_short: 'supports' },
  'wve-hallaq-ch1-020': { display_label_short: 'supports' },
  'wve-hallaq-ch1-021': { display_label_short: 'supports' },
  'wve-hallaq-ch1-022': { display_label_short: 'contrasts' },
  'wve-hallaq-ch1-023': { display_label_short: 'supports' },
  'wve-hallaq-ch1-024': { display_label_short: 'supports' },
};

const HALLAQ_CH1_EVIDENCE_LABELS: Record<string, DisplayLabelFields> = {
  'wel-hallaq-ch1-001': { display_label_short: 'text support' },
  'wel-hallaq-ch1-002': { display_label_short: 'note support' },
  'wel-hallaq-ch1-003': { display_label_short: 'text support' },
  'wel-hallaq-ch1-004': { display_label_short: 'note support' },
  'wel-hallaq-ch1-005': { display_label_short: 'text support' },
  'wel-hallaq-ch1-006': { display_label_short: 'note support' },
  'wel-hallaq-ch1-007': { display_label_short: 'text support' },
  'wel-hallaq-ch1-008': { display_label_short: 'note support' },
  'wel-hallaq-ch1-009': { display_label_short: 'text support' },
  'wel-hallaq-ch1-010': { display_label_short: 'note support' },
  'wel-hallaq-ch1-011': { display_label_short: 'text support' },
  'wel-hallaq-ch1-012': { display_label_short: 'note support' },
  'wel-hallaq-ch1-013': { display_label_short: 'text support' },
  'wel-hallaq-ch1-014': { display_label_short: 'note support' },
  'wel-hallaq-ch1-015': { display_label_short: 'text support' },
  'wel-hallaq-ch1-016': { display_label_short: 'note support' },
  'wel-hallaq-ch1-017': { display_label_short: 'text support' },
  'wel-hallaq-ch1-018': { display_label_short: 'note support' },
  'wel-hallaq-ch1-019': { display_label_short: 'text support' },
  'wel-hallaq-ch1-020': { display_label_short: 'note support' },
  'wel-hallaq-ch1-021': { display_label_short: 'text support' },
  'wel-hallaq-ch1-022': { display_label_short: 'note support' },
  'wel-hallaq-ch1-023': { display_label_short: 'text support' },
  'wel-hallaq-ch1-024': { display_label_short: 'note support' },
  'wel-hallaq-ch1-025': { display_label_short: 'text support' },
  'wel-hallaq-ch1-026': { display_label_short: 'note support' },
  'wel-hallaq-ch1-027': { display_label_short: 'text support' },
  'wel-hallaq-ch1-028': { display_label_short: 'note support' },
  'wel-hallaq-ch1-029': { display_label_short: 'text support' },
  'wel-hallaq-ch1-030': { display_label_short: 'note support' },
  'wel-hallaq-ch1-031': { display_label_short: 'text support' },
  'wel-hallaq-ch1-032': { display_label_short: 'note support' },
  'wel-hallaq-ch1-033': { display_label_short: 'text support' },
  'wel-hallaq-ch1-034': { display_label_short: 'note support' },
  'wel-hallaq-ch1-035': { display_label_short: 'text support' },
  'wel-hallaq-ch1-036': { display_label_short: 'note support' },
  'wel-hallaq-ch1-037': { display_label_short: 'text support' },
  'wel-hallaq-ch1-038': { display_label_short: 'note support' },
  'wel-hallaq-ch1-039': { display_label_short: 'text support' },
  'wel-hallaq-ch1-040': { display_label_short: 'note support' },
};

export function enrichWorldviewNodeRows(rows: WorldviewRow[]): WorldviewRow[] {
  return rows.map((row) => applyDisplayLabels(row, HALLAQ_CH1_NODE_LABELS));
}

export function enrichWorldviewNodeEdgeRows(rows: WorldviewRow[]): WorldviewRow[] {
  return rows.map((row) => applyDisplayLabels(row, HALLAQ_CH1_EDGE_LABELS));
}

export function enrichWorldviewEvidenceLinkRows(rows: WorldviewRow[]): WorldviewRow[] {
  return rows.map((row) => applyDisplayLabels(row, HALLAQ_CH1_EVIDENCE_LABELS));
}

function applyDisplayLabels(
  row: WorldviewRow,
  overrides: Record<string, DisplayLabelFields>,
): WorldviewRow {
  const id = readOptionalString(row['id']);
  const override = id ? overrides[id] : undefined;
  const currentShort = readOptionalString(row['display_label_short']);
  const currentMedium = readOptionalString(row['display_label_medium']);
  const nextShort = override?.display_label_short ?? currentShort ?? null;
  const nextMedium = override?.display_label_medium ?? currentMedium ?? null;

  if (nextShort === currentShort && nextMedium === currentMedium) {
    return row;
  }

  return {
    ...row,
    display_label_short: nextShort,
    display_label_medium: nextMedium,
  };
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
