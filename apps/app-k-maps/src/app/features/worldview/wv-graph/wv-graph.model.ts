// ─────────────────────────────────────────────────────────────────────────────
//  WvGraph — shared data model, color tokens, and mock seed data
// ─────────────────────────────────────────────────────────────────────────────

export type WvNodeType =
  | 'claim'
  | 'principle'
  | 'framework'
  | 'cause'
  | 'evidence'
  | 'insight';

export type WvEdgeRelation =
  | 'supports'
  | 'part_of'
  | 'contrasts_with'
  | 'leads_to'
  | 'questions'
  | 'related_to';

export type WvGraphMode = 'force' | 'focus' | 'cluster';

// ── Node ──────────────────────────────────────────────────────────────────────
export interface WvGraphNode {
  id: string;
  label: string;
  canonicalLabel?: string;
  displayLabelShort?: string | null;
  displayLabelMedium?: string | null;
  type: WvNodeType;
  summary?: string;
  chapterRole?: string;
  /** computed by D3 — how many edges touch this node */
  degree?: number;
  /** base radius — scaled by degree */
  size?: number;
  /** D3 simulation positions (mutable) */
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// ── Edge ─────────────────────────────────────────────────────────────────────
export interface WvGraphEdge {
  id: string;
  source: string | WvGraphNode;
  target: string | WvGraphNode;
  relation: WvEdgeRelation;
  /** 0–1, controls link distance in simulation */
  strength?: number;
}

// ── Graph data bundle ─────────────────────────────────────────────────────────
export interface WvGraphData {
  nodes: WvGraphNode[];
  edges: WvGraphEdge[];
}

// ── Color tokens per node type ────────────────────────────────────────────────
export const WV_NODE_COLORS: Record<WvNodeType, { stroke: string; fill: string; glow: string }> = {
  claim:     { stroke: '#c9a84c', fill: 'rgba(201,168,76,0.12)',  glow: 'rgba(201,168,76,0.35)' },
  principle: { stroke: '#d4b87a', fill: 'rgba(212,184,122,0.1)', glow: 'rgba(212,184,122,0.28)' },
  framework: { stroke: '#5490c8', fill: 'rgba(84,144,200,0.12)', glow: 'rgba(84,144,200,0.3)' },
  cause:     { stroke: '#c45a3a', fill: 'rgba(196,90,58,0.12)',  glow: 'rgba(196,90,58,0.28)' },
  evidence:  { stroke: '#4e8c61', fill: 'rgba(78,140,97,0.12)',  glow: 'rgba(78,140,97,0.28)' },
  insight:   { stroke: '#8c5cc8', fill: 'rgba(140,92,200,0.12)', glow: 'rgba(140,92,200,0.3)' },
};

export const WV_EDGE_COLORS: Record<WvEdgeRelation, string> = {
  supports:       'rgba(201,168,76,0.45)',
  part_of:        'rgba(255,255,255,0.18)',
  contrasts_with: 'rgba(196,90,58,0.45)',
  leads_to:       'rgba(84,144,200,0.45)',
  questions:      'rgba(140,92,200,0.4)',
  related_to:     'rgba(255,255,255,0.1)',
};

export const WV_EDGE_DASH: Partial<Record<WvEdgeRelation, string>> = {
  part_of:        '4 3',
  contrasts_with: '2 4',
  questions:      '6 3',
};

export const WV_NODE_LABELS: Record<WvNodeType, string> = {
  claim:     'Claim',
  principle: 'Principle',
  framework: 'Framework',
  cause:     'Cause',
  evidence:  'Evidence',
  insight:   'Insight',
};

// ── Base node radius ──────────────────────────────────────────────────────────
export const NODE_BASE_RADIUS = 9;
export const NODE_MAX_RADIUS  = 20;

export function nodeRadius(node: WvGraphNode): number {
  const deg = node.degree ?? 1;
  return Math.min(NODE_MAX_RADIUS, NODE_BASE_RADIUS + Math.sqrt(deg) * 2.2);
}

// ── Mock seed graph — Hallaq, The Impossible State, Chapter 1 ─────────────────
export const MOCK_WV_GRAPH: WvGraphData = {
  nodes: [
    { id: 'n1',  label: 'Modern Islamic State', type: 'claim',     summary: 'The modern Islamic state is a structural impossibility — not merely a political failure but a conceptual one rooted in category error.', chapterRole: 'thesis' },
    { id: 'n2',  label: 'Sharia as Moral Paradigm', type: 'principle', summary: 'Pre-modern sharia was not a legal code but a comprehensive moral order embedded in lived practice and social fabric.', chapterRole: 'retrieval' },
    { id: 'n3',  label: 'Sovereignty Contradiction', type: 'framework', summary: 'Modern sovereignty vests ultimate authority in the nation-state, which is structurally incompatible with divine sovereignty in Islamic thought.', chapterRole: 'modernity_critique' },
    { id: 'n4',  label: 'Colonial Legacy', type: 'cause',     summary: 'Two centuries of colonial rule dismantled pre-modern governance structures and replaced them with imported European institutions.', chapterRole: 'causes' },
    { id: 'n5',  label: 'Doctrine of Progress', type: 'framework', summary: 'Modernity imposes a linear, secular teleology of progress that is fundamentally at odds with Islamic ontology.', chapterRole: 'modernity_critique' },
    { id: 'n6',  label: 'Nationalist Elites', type: 'cause',     summary: 'Post-colonial nationalist elites preserved inherited colonial state structures and ideological frameworks, hollowing out Islamic governance.', chapterRole: 'causes' },
    { id: 'n7',  label: 'Paradigmatic Case', type: 'evidence',  summary: 'Agamben\'s paradigmatic case suspends group belonging to reveal the structure of the whole — applied here to the modern Islamic state as a case for Islamic legal thought.', chapterRole: 'evidence' },
    { id: 'n8',  label: 'Pre-modern Sharia State', type: 'evidence',  summary: 'Historical Islamic governance functioned through diffuse, jurist-led moral authority rather than centralized legislative sovereignty.', chapterRole: 'evidence' },
    { id: 'n9',  label: 'Muslim Governance Gap', type: 'insight',   summary: 'The absence of a viable Islamic political model forces Muslims into a disorienting historical gap between pre-modern precedent and modern institutional reality.', chapterRole: 'response' },
    { id: 'n10', label: 'Will to Power (Nietzsche)', type: 'framework', summary: 'The will to power and the European Enlightenment project underlie the universalist claims of modernity that Islam is measured against.', chapterRole: 'modernity_critique' },
    { id: 'n11', label: 'Institutional Continuity', type: 'cause',     summary: 'Colonial institutions persisted through independence, making genuine Islamic governance structurally impossible within the modern state form.', chapterRole: 'causes' },
    { id: 'n12', label: 'Islamic Legal Retrieval', type: 'insight',   summary: 'Recovering the pre-modern moral paradigm is not nostalgia but a principled re-engagement with Islamic intellectual heritage as critique of modernity.', chapterRole: 'retrieval' },
  ],
  edges: [
    { id: 'e1',  source: 'n3', target: 'n1', relation: 'supports',       strength: 0.9 },
    { id: 'e2',  source: 'n4', target: 'n1', relation: 'leads_to',        strength: 0.8 },
    { id: 'e3',  source: 'n6', target: 'n1', relation: 'leads_to',        strength: 0.7 },
    { id: 'e4',  source: 'n5', target: 'n3', relation: 'supports',        strength: 0.75 },
    { id: 'e5',  source: 'n2', target: 'n3', relation: 'contrasts_with',  strength: 0.8 },
    { id: 'e6',  source: 'n7', target: 'n1', relation: 'evidence',        strength: 0.6 } as unknown as WvGraphEdge,
    { id: 'e7',  source: 'n8', target: 'n2', relation: 'supports',        strength: 0.85 },
    { id: 'e8',  source: 'n4', target: 'n6', relation: 'leads_to',        strength: 0.7 },
    { id: 'e9',  source: 'n11',target: 'n6', relation: 'part_of',         strength: 0.6 },
    { id: 'e10', source: 'n4', target: 'n11',relation: 'leads_to',        strength: 0.65 },
    { id: 'e11', source: 'n10',target: 'n5', relation: 'part_of',         strength: 0.5 },
    { id: 'e12', source: 'n1', target: 'n9', relation: 'leads_to',        strength: 0.8 },
    { id: 'e13', source: 'n2', target: 'n12',relation: 'leads_to',        strength: 0.9 },
    { id: 'e14', source: 'n12',target: 'n9', relation: 'related_to',      strength: 0.5 },
    { id: 'e15', source: 'n5', target: 'n2', relation: 'questions',       strength: 0.7 },
    { id: 'e16', source: 'n8', target: 'n1', relation: 'questions',       strength: 0.6 },
  ],
};
