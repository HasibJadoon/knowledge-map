// ─── DiagramRepo — L8 + L9 + L9B tables ──────────────────────────────────────
// L8:  wv_comparison_templates, wv_moral_arc_views,
//      wv_civilizational_matrices, wv_prophetic_exemplars
// L9:  wv_timeline_views, wv_diagram_specs, wv_diagram_instances,
//      wv_output_artifacts, wv_renderer_presets, wv_storyline_specs
// L9B: wv_abrahamic_morality_matrices, wv_replacement_bedrock_views,
//      wv_moral_civilization_maps, wv_propaganda_flow_maps,
//      wv_orientalism_image_chains, wv_exemplar_case_timelines,
//      wv_discernment_diagram_views

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── L8 interfaces ─────────────────────────────────────────────────────────────

export interface WvComparisonTemplate {
  id: string;
  slug: string;
  title: string;
  axes_json: string;
  row_types: string;
  description_md: string | null;
  created_at: string;
}

export interface WvMoralArcView {
  id: string;
  slug: string;
  title: string;
  moral_axis_id: string | null;
  tradition_id: string | null;
  century_from: number | null;
  century_to: number | null;
  arc_steps_json: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvCivilizationalMatrix {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  streams_json: string | null;
  axes_json: string | null;
  cells_json: string | null;
  created_at: string;
}

export interface WvPropheticExemplar {
  id: string;
  person_id: string;
  tradition_id: string | null;
  prophetic_model_id: string | null;
  virtues_embodied: string | null;
  key_episodes: string | null;
  description_md: string | null;
  created_at: string;
}

// ─── L9 interfaces ─────────────────────────────────────────────────────────────

export interface WvTimelineView {
  id: string;
  slug: string;
  title: string;
  timeline_theme: string;
  tradition_id: string | null;
  century_from: number | null;
  century_to: number | null;
  filter_json: string | null;
  event_ids_json: string | null;
  renderer_hint: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvDiagramSpec {
  id: string;
  slug: string;
  title: string;
  diagram_type: string;
  scope_rule: string | null;
  selection_json: string | null;
  layout_rule: string | null;
  renderer_hint: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvDiagramInstance {
  id: string;
  spec_id: string;
  title: string;
  render_data: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface WvOutputArtifact {
  id: string;
  artifact_type: string;
  title: string;
  source_spec: string | null;
  cm_doc_ref: string | null;
  content_json: string | null;
  status: string;
  core_user_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvRendererPreset {
  id: string;
  slug: string;
  title: string;
  renderer_type: string;
  config_json: string;
  description: string | null;
  created_at: string;
}

export interface WvStorylineSpec {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  topic_id: string | null;
  steps_json: string;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

// ─── L9B interfaces ────────────────────────────────────────────────────────────

export interface WvAbrahamicMoralityMatrix {
  id: string;
  slug: string;
  title: string;
  axes_json: string;
  traditions_json: string;
  cells_json: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvReplacementBedrockView {
  id: string;
  slug: string;
  title: string;
  abrahamic_foundation: string;
  stream_id: string | null;
  replacement_mechanism: string | null;
  diagram_spec_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvMoralCivilizationMap {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  period_id: string | null;
  institution_types: string | null;
  map_layer_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvPropagandaFlowMap {
  id: string;
  slug: string;
  title: string;
  propaganda_system_id: string | null;
  media_regime_id: string | null;
  flow_steps_json: string | null;
  diagram_spec_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvOrientalismImageChain {
  id: string;
  slug: string;
  title: string;
  orientalist_frame_id: string | null;
  chain_steps_json: string | null;
  diagram_spec_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvExemplarCaseTimeline {
  id: string;
  slug: string;
  title: string;
  case_ids_json: string;
  tradition_ids: string | null;
  timeline_view_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvDiscernmentDiagramView {
  id: string;
  slug: string;
  title: string;
  tradition_id: string;
  adversarial_pattern_ids: string | null;
  moral_inversion_ids: string | null;
  counterfeit_ids: string | null;
  diagram_spec_id: string | null;
  description_md: string | null;
  created_at: string;
}

// ─── Create input types ────────────────────────────────────────────────────────

export type ComparisonTemplateCreate = Omit<WvComparisonTemplate, 'id' | 'created_at'>;
export type MoralArcViewCreate = Omit<WvMoralArcView, 'id' | 'created_at'>;
export type CivilizationalMatrixCreate = Omit<WvCivilizationalMatrix, 'id' | 'created_at'>;
export type PropheticExemplarCreate = Omit<WvPropheticExemplar, 'id' | 'created_at'>;
export type TimelineViewCreate = Omit<WvTimelineView, 'id' | 'created_at'>;
export type DiagramSpecCreate = Omit<WvDiagramSpec, 'id' | 'created_at'>;
export type DiagramInstanceCreate = Omit<WvDiagramInstance, 'id' | 'created_at'>;
export type OutputArtifactCreate = Omit<WvOutputArtifact, 'id' | 'created_at' | 'updated_at'>;
export type RendererPresetCreate = Omit<WvRendererPreset, 'id' | 'created_at'>;
export type StorylineSpecCreate = Omit<WvStorylineSpec, 'id' | 'created_at'>;
export type AbrahamicMoralityMatrixCreate = Omit<WvAbrahamicMoralityMatrix, 'id' | 'created_at'>;
export type ReplacementBedrockViewCreate = Omit<WvReplacementBedrockView, 'id' | 'created_at'>;
export type MoralCivilizationMapCreate = Omit<WvMoralCivilizationMap, 'id' | 'created_at'>;
export type PropagandaFlowMapCreate = Omit<WvPropagandaFlowMap, 'id' | 'created_at'>;
export type OrientalismImageChainCreate = Omit<WvOrientalismImageChain, 'id' | 'created_at'>;
export type ExemplarCaseTimelineCreate = Omit<WvExemplarCaseTimeline, 'id' | 'created_at'>;
export type DiscernmentDiagramViewCreate = Omit<WvDiscernmentDiagramView, 'id' | 'created_at'>;

// ─── Column lists ──────────────────────────────────────────────────────────────

const CT_COLS  = `id, slug, title, axes_json, row_types, description_md, created_at`;
const MAV_COLS = `id, slug, title, moral_axis_id, tradition_id, century_from, century_to, arc_steps_json, description_md, meta_json, created_at`;
const CIV_COLS = `id, slug, title, description_md, streams_json, axes_json, cells_json, created_at`;
const PEX_COLS = `id, person_id, tradition_id, prophetic_model_id, virtues_embodied, key_episodes, description_md, created_at`;

const TV_COLS  = `id, slug, title, timeline_theme, tradition_id, century_from, century_to, filter_json, event_ids_json, renderer_hint, meta_json, created_at`;
const DS_COLS  = `id, slug, title, diagram_type, scope_rule, selection_json, layout_rule, renderer_hint, description_md, meta_json, created_at`;
const DI_COLS  = `id, spec_id, title, render_data, thumbnail_url, created_at`;
const OA_COLS  = `id, artifact_type, title, source_spec, cm_doc_ref, content_json, status, core_user_ref, meta_json, created_at, updated_at`;
const RP_COLS  = `id, slug, title, renderer_type, config_json, description, created_at`;
const SS_COLS  = `id, slug, title, tradition_id, topic_id, steps_json, description_md, meta_json, created_at`;

const AMM_COLS = `id, slug, title, axes_json, traditions_json, cells_json, description_md, created_at`;
const RBV_COLS = `id, slug, title, abrahamic_foundation, stream_id, replacement_mechanism, diagram_spec_id, description_md, created_at`;
const MCM_COLS = `id, slug, title, tradition_id, period_id, institution_types, map_layer_id, description_md, created_at`;
const PFM_COLS = `id, slug, title, propaganda_system_id, media_regime_id, flow_steps_json, diagram_spec_id, description_md, created_at`;
const OIC_COLS = `id, slug, title, orientalist_frame_id, chain_steps_json, diagram_spec_id, description_md, created_at`;
const ECT_COLS = `id, slug, title, case_ids_json, tradition_ids, timeline_view_id, description_md, created_at`;
const DDV_COLS = `id, slug, title, tradition_id, adversarial_pattern_ids, moral_inversion_ids, counterfeit_ids, diagram_spec_id, description_md, created_at`;

// ─── Patch helper ──────────────────────────────────────────────────────────────

function buildPatch(patch: Record<string, unknown>): { setClauses: string; values: unknown[] } {
  const keys = Object.keys(patch).filter(k => patch[k] !== undefined);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k] ?? null);
  return { setClauses, values };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DiagramRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class DiagramRepo {
  constructor(private db: D1Database) {}

  // ── L8: Comparison Templates ───────────────────────────────────────────────

  comparisonTemplates(opts: PaginateOptions = {}) {
    return paginate<WvComparisonTemplate>(
      this.db,
      `SELECT ${CT_COLS} FROM wv_comparison_templates ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_comparison_templates`,
      [], opts,
    );
  }

  findTemplateById(id: string): Promise<WvComparisonTemplate | null> {
    return queryOne<WvComparisonTemplate>(
      this.db, `SELECT ${CT_COLS} FROM wv_comparison_templates WHERE id = ?`, [id],
    );
  }

  async createTemplate(input: ComparisonTemplateCreate): Promise<WvComparisonTemplate> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_comparison_templates
         (id, slug, title, axes_json, row_types, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.axes_json, input.row_types,
       input.description_md ?? null, now],
    );
    return (await this.findTemplateById(id))!;
  }

  async patchTemplate(id: string, patch: Partial<ComparisonTemplateCreate>): Promise<WvComparisonTemplate | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findTemplateById(id);
    await execute(this.db, `UPDATE wv_comparison_templates SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findTemplateById(id);
  }

  // ── L8: Moral Arc Views ────────────────────────────────────────────────────

  moralArcViews(moralAxisId: string | null, traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (moralAxisId)  { conds.push('moral_axis_id = ?');  params.push(moralAxisId); }
    if (traditionId)  { conds.push('tradition_id = ?');   params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMoralArcView>(
      this.db,
      `SELECT ${MAV_COLS} FROM wv_moral_arc_views ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_moral_arc_views ${where}`,
      params, opts,
    );
  }

  findMoralArcViewById(id: string): Promise<WvMoralArcView | null> {
    return queryOne<WvMoralArcView>(
      this.db, `SELECT ${MAV_COLS} FROM wv_moral_arc_views WHERE id = ?`, [id],
    );
  }

  async createMoralArcView(input: MoralArcViewCreate): Promise<WvMoralArcView> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_moral_arc_views
         (id, slug, title, moral_axis_id, tradition_id, century_from, century_to,
          arc_steps_json, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.moral_axis_id ?? null,
       input.tradition_id ?? null, input.century_from ?? null,
       input.century_to ?? null, input.arc_steps_json ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findMoralArcViewById(id))!;
  }

  async patchMoralArcView(id: string, patch: Partial<MoralArcViewCreate>): Promise<WvMoralArcView | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findMoralArcViewById(id);
    await execute(this.db, `UPDATE wv_moral_arc_views SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findMoralArcViewById(id);
  }

  // ── L8: Civilizational Matrices ────────────────────────────────────────────

  civilizationalMatrices(opts: PaginateOptions = {}) {
    return paginate<WvCivilizationalMatrix>(
      this.db,
      `SELECT ${CIV_COLS} FROM wv_civilizational_matrices ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_civilizational_matrices`,
      [], opts,
    );
  }

  findCivilizationalMatrixById(id: string): Promise<WvCivilizationalMatrix | null> {
    return queryOne<WvCivilizationalMatrix>(
      this.db, `SELECT ${CIV_COLS} FROM wv_civilizational_matrices WHERE id = ?`, [id],
    );
  }

  async createCivilizationalMatrix(input: CivilizationalMatrixCreate): Promise<WvCivilizationalMatrix> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_civilizational_matrices
         (id, slug, title, description_md, streams_json, axes_json, cells_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.description_md ?? null,
       input.streams_json ?? null, input.axes_json ?? null,
       input.cells_json ?? null, now],
    );
    return (await this.findCivilizationalMatrixById(id))!;
  }

  async patchCivilizationalMatrix(id: string, patch: Partial<CivilizationalMatrixCreate>): Promise<WvCivilizationalMatrix | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findCivilizationalMatrixById(id);
    await execute(this.db, `UPDATE wv_civilizational_matrices SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findCivilizationalMatrixById(id);
  }

  // ── L8: Prophetic Exemplars ────────────────────────────────────────────────

  propheticExemplars(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPropheticExemplar>(
      this.db,
      `SELECT ${PEX_COLS} FROM wv_prophetic_exemplars ${where} ORDER BY person_id`,
      `SELECT COUNT(*) AS count FROM wv_prophetic_exemplars ${where}`,
      params, opts,
    );
  }

  findPropheticExemplarById(id: string): Promise<WvPropheticExemplar | null> {
    return queryOne<WvPropheticExemplar>(
      this.db, `SELECT ${PEX_COLS} FROM wv_prophetic_exemplars WHERE id = ?`, [id],
    );
  }

  async createPropheticExemplar(input: PropheticExemplarCreate): Promise<WvPropheticExemplar> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_prophetic_exemplars
         (id, person_id, tradition_id, prophetic_model_id, virtues_embodied, key_episodes, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.person_id, input.tradition_id ?? null,
       input.prophetic_model_id ?? null, input.virtues_embodied ?? null,
       input.key_episodes ?? null, input.description_md ?? null, now],
    );
    return (await this.findPropheticExemplarById(id))!;
  }

  async patchPropheticExemplar(id: string, patch: Partial<PropheticExemplarCreate>): Promise<WvPropheticExemplar | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findPropheticExemplarById(id);
    await execute(this.db, `UPDATE wv_prophetic_exemplars SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findPropheticExemplarById(id);
  }

  // ── L9: Timeline Views ─────────────────────────────────────────────────────

  timelineViews(traditionId: string | null, theme: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?');    params.push(traditionId); }
    if (theme)       { conds.push('timeline_theme = ?');  params.push(theme); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvTimelineView>(
      this.db,
      `SELECT ${TV_COLS} FROM wv_timeline_views ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_timeline_views ${where}`,
      params, opts,
    );
  }

  findTimelineViewById(id: string): Promise<WvTimelineView | null> {
    return queryOne<WvTimelineView>(
      this.db, `SELECT ${TV_COLS} FROM wv_timeline_views WHERE id = ?`, [id],
    );
  }

  async createTimelineView(input: TimelineViewCreate): Promise<WvTimelineView> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_timeline_views
         (id, slug, title, timeline_theme, tradition_id, century_from, century_to,
          filter_json, event_ids_json, renderer_hint, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.timeline_theme,
       input.tradition_id ?? null, input.century_from ?? null,
       input.century_to ?? null, input.filter_json ?? null,
       input.event_ids_json ?? null, input.renderer_hint ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findTimelineViewById(id))!;
  }

  async patchTimelineView(id: string, patch: Partial<TimelineViewCreate>): Promise<WvTimelineView | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findTimelineViewById(id);
    await execute(this.db, `UPDATE wv_timeline_views SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findTimelineViewById(id);
  }

  // ── L9: Diagram Specs ──────────────────────────────────────────────────────

  diagramSpecs(diagramType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (diagramType) { conds.push('diagram_type = ?'); params.push(diagramType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvDiagramSpec>(
      this.db,
      `SELECT ${DS_COLS} FROM wv_diagram_specs ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_diagram_specs ${where}`,
      params, opts,
    );
  }

  findSpecById(id: string): Promise<WvDiagramSpec | null> {
    return queryOne<WvDiagramSpec>(
      this.db, `SELECT ${DS_COLS} FROM wv_diagram_specs WHERE id = ?`, [id],
    );
  }

  async createSpec(input: DiagramSpecCreate): Promise<WvDiagramSpec> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_diagram_specs
         (id, slug, title, diagram_type, scope_rule, selection_json,
          layout_rule, renderer_hint, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.diagram_type,
       input.scope_rule ?? null, input.selection_json ?? null,
       input.layout_rule ?? null, input.renderer_hint ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findSpecById(id))!;
  }

  async patchSpec(id: string, patch: Partial<DiagramSpecCreate>): Promise<WvDiagramSpec | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findSpecById(id);
    await execute(this.db, `UPDATE wv_diagram_specs SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findSpecById(id);
  }

  // ── L9: Diagram Instances ──────────────────────────────────────────────────

  instances(specId: string, opts: PaginateOptions = {}) {
    return paginate<WvDiagramInstance>(
      this.db,
      `SELECT ${DI_COLS} FROM wv_diagram_instances WHERE spec_id = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_diagram_instances WHERE spec_id = ?`,
      [specId, specId], opts,
    );
  }

  findInstanceById(id: string): Promise<WvDiagramInstance | null> {
    return queryOne<WvDiagramInstance>(
      this.db, `SELECT ${DI_COLS} FROM wv_diagram_instances WHERE id = ?`, [id],
    );
  }

  async createInstance(input: DiagramInstanceCreate): Promise<WvDiagramInstance> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_diagram_instances (id, spec_id, title, render_data, thumbnail_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.spec_id, input.title, input.render_data ?? null,
       input.thumbnail_url ?? null, now],
    );
    return (await this.findInstanceById(id))!;
  }

  // ── L9: Output Artifacts ───────────────────────────────────────────────────

  artifacts(status: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (status) { conds.push('status = ?'); params.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvOutputArtifact>(
      this.db,
      `SELECT ${OA_COLS} FROM wv_output_artifacts ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_output_artifacts ${where}`,
      params, opts,
    );
  }

  findArtifactById(id: string): Promise<WvOutputArtifact | null> {
    return queryOne<WvOutputArtifact>(
      this.db, `SELECT ${OA_COLS} FROM wv_output_artifacts WHERE id = ?`, [id],
    );
  }

  async createArtifact(input: OutputArtifactCreate): Promise<WvOutputArtifact> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_output_artifacts
         (id, artifact_type, title, source_spec, cm_doc_ref, content_json,
          status, core_user_ref, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.artifact_type, input.title, input.source_spec ?? null,
       input.cm_doc_ref ?? null, input.content_json ?? null,
       input.status ?? 'draft', input.core_user_ref ?? null,
       input.meta_json ?? null, now, now],
    );
    return (await this.findArtifactById(id))!;
  }

  async patchArtifact(id: string, patch: Partial<OutputArtifactCreate>): Promise<WvOutputArtifact | null> {
    const { setClauses, values } = buildPatch({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>);
    if (!setClauses) return this.findArtifactById(id);
    await execute(this.db, `UPDATE wv_output_artifacts SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findArtifactById(id);
  }

  // ── L9: Renderer Presets ───────────────────────────────────────────────────

  rendererPresets(rendererType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (rendererType) { conds.push('renderer_type = ?'); params.push(rendererType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvRendererPreset>(
      this.db,
      `SELECT ${RP_COLS} FROM wv_renderer_presets ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_renderer_presets ${where}`,
      params, opts,
    );
  }

  findRendererPresetById(id: string): Promise<WvRendererPreset | null> {
    return queryOne<WvRendererPreset>(
      this.db, `SELECT ${RP_COLS} FROM wv_renderer_presets WHERE id = ?`, [id],
    );
  }

  async createRendererPreset(input: RendererPresetCreate): Promise<WvRendererPreset> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_renderer_presets
         (id, slug, title, renderer_type, config_json, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.renderer_type, input.config_json,
       input.description ?? null, now],
    );
    return (await this.findRendererPresetById(id))!;
  }

  // ── L9: Storyline Specs ────────────────────────────────────────────────────

  storylineSpecs(traditionId: string | null, topicId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    if (topicId)     { conds.push('topic_id = ?');     params.push(topicId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvStorylineSpec>(
      this.db,
      `SELECT ${SS_COLS} FROM wv_storyline_specs ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_storyline_specs ${where}`,
      params, opts,
    );
  }

  findStorylineSpecById(id: string): Promise<WvStorylineSpec | null> {
    return queryOne<WvStorylineSpec>(
      this.db, `SELECT ${SS_COLS} FROM wv_storyline_specs WHERE id = ?`, [id],
    );
  }

  async createStorylineSpec(input: StorylineSpecCreate): Promise<WvStorylineSpec> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_storyline_specs
         (id, slug, title, tradition_id, topic_id, steps_json, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.topic_id ?? null, input.steps_json,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findStorylineSpecById(id))!;
  }

  async patchStorylineSpec(id: string, patch: Partial<StorylineSpecCreate>): Promise<WvStorylineSpec | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findStorylineSpecById(id);
    await execute(this.db, `UPDATE wv_storyline_specs SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findStorylineSpecById(id);
  }

  // ── L9B: Abrahamic Morality Matrices ──────────────────────────────────────

  abrahamicMoralityMatrices(opts: PaginateOptions = {}) {
    return paginate<WvAbrahamicMoralityMatrix>(
      this.db,
      `SELECT ${AMM_COLS} FROM wv_abrahamic_morality_matrices ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_abrahamic_morality_matrices`,
      [], opts,
    );
  }

  findAbrahamicMoralityMatrixById(id: string): Promise<WvAbrahamicMoralityMatrix | null> {
    return queryOne<WvAbrahamicMoralityMatrix>(
      this.db, `SELECT ${AMM_COLS} FROM wv_abrahamic_morality_matrices WHERE id = ?`, [id],
    );
  }

  async createAbrahamicMoralityMatrix(input: AbrahamicMoralityMatrixCreate): Promise<WvAbrahamicMoralityMatrix> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_abrahamic_morality_matrices
         (id, slug, title, axes_json, traditions_json, cells_json, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.axes_json, input.traditions_json,
       input.cells_json ?? null, input.description_md ?? null, now],
    );
    return (await this.findAbrahamicMoralityMatrixById(id))!;
  }

  async patchAbrahamicMoralityMatrix(id: string, patch: Partial<AbrahamicMoralityMatrixCreate>): Promise<WvAbrahamicMoralityMatrix | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findAbrahamicMoralityMatrixById(id);
    await execute(this.db, `UPDATE wv_abrahamic_morality_matrices SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findAbrahamicMoralityMatrixById(id);
  }

  // ── L9B: Replacement Bedrock Views ────────────────────────────────────────

  replacementBedrockViews(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvReplacementBedrockView>(
      this.db,
      `SELECT ${RBV_COLS} FROM wv_replacement_bedrock_views ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_replacement_bedrock_views ${where}`,
      params, opts,
    );
  }

  findReplacementBedrockViewById(id: string): Promise<WvReplacementBedrockView | null> {
    return queryOne<WvReplacementBedrockView>(
      this.db, `SELECT ${RBV_COLS} FROM wv_replacement_bedrock_views WHERE id = ?`, [id],
    );
  }

  async createReplacementBedrockView(input: ReplacementBedrockViewCreate): Promise<WvReplacementBedrockView> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_replacement_bedrock_views
         (id, slug, title, abrahamic_foundation, stream_id, replacement_mechanism, diagram_spec_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.abrahamic_foundation,
       input.stream_id ?? null, input.replacement_mechanism ?? null,
       input.diagram_spec_id ?? null, input.description_md ?? null, now],
    );
    return (await this.findReplacementBedrockViewById(id))!;
  }

  async patchReplacementBedrockView(id: string, patch: Partial<ReplacementBedrockViewCreate>): Promise<WvReplacementBedrockView | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findReplacementBedrockViewById(id);
    await execute(this.db, `UPDATE wv_replacement_bedrock_views SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findReplacementBedrockViewById(id);
  }

  // ── L9B: Moral Civilization Maps ──────────────────────────────────────────

  moralCivilizationMaps(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMoralCivilizationMap>(
      this.db,
      `SELECT ${MCM_COLS} FROM wv_moral_civilization_maps ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_moral_civilization_maps ${where}`,
      params, opts,
    );
  }

  findMoralCivilizationMapById(id: string): Promise<WvMoralCivilizationMap | null> {
    return queryOne<WvMoralCivilizationMap>(
      this.db, `SELECT ${MCM_COLS} FROM wv_moral_civilization_maps WHERE id = ?`, [id],
    );
  }

  async createMoralCivilizationMap(input: MoralCivilizationMapCreate): Promise<WvMoralCivilizationMap> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_moral_civilization_maps
         (id, slug, title, tradition_id, period_id, institution_types, map_layer_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.period_id ?? null, input.institution_types ?? null,
       input.map_layer_id ?? null, input.description_md ?? null, now],
    );
    return (await this.findMoralCivilizationMapById(id))!;
  }

  // ── L9B: Propaganda Flow Maps ──────────────────────────────────────────────

  propagandaFlowMaps(propagandaSystemId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (propagandaSystemId) { conds.push('propaganda_system_id = ?'); params.push(propagandaSystemId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPropagandaFlowMap>(
      this.db,
      `SELECT ${PFM_COLS} FROM wv_propaganda_flow_maps ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_propaganda_flow_maps ${where}`,
      params, opts,
    );
  }

  findPropagandaFlowMapById(id: string): Promise<WvPropagandaFlowMap | null> {
    return queryOne<WvPropagandaFlowMap>(
      this.db, `SELECT ${PFM_COLS} FROM wv_propaganda_flow_maps WHERE id = ?`, [id],
    );
  }

  async createPropagandaFlowMap(input: PropagandaFlowMapCreate): Promise<WvPropagandaFlowMap> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_propaganda_flow_maps
         (id, slug, title, propaganda_system_id, media_regime_id, flow_steps_json, diagram_spec_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.propaganda_system_id ?? null,
       input.media_regime_id ?? null, input.flow_steps_json ?? null,
       input.diagram_spec_id ?? null, input.description_md ?? null, now],
    );
    return (await this.findPropagandaFlowMapById(id))!;
  }

  // ── L9B: Orientalism Image Chains ─────────────────────────────────────────

  orientalismImageChains(orientalistFrameId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (orientalistFrameId) { conds.push('orientalist_frame_id = ?'); params.push(orientalistFrameId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvOrientalismImageChain>(
      this.db,
      `SELECT ${OIC_COLS} FROM wv_orientalism_image_chains ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_orientalism_image_chains ${where}`,
      params, opts,
    );
  }

  findOrientalismImageChainById(id: string): Promise<WvOrientalismImageChain | null> {
    return queryOne<WvOrientalismImageChain>(
      this.db, `SELECT ${OIC_COLS} FROM wv_orientalism_image_chains WHERE id = ?`, [id],
    );
  }

  async createOrientalismImageChain(input: OrientalismImageChainCreate): Promise<WvOrientalismImageChain> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_orientalism_image_chains
         (id, slug, title, orientalist_frame_id, chain_steps_json, diagram_spec_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.orientalist_frame_id ?? null,
       input.chain_steps_json ?? null, input.diagram_spec_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findOrientalismImageChainById(id))!;
  }

  // ── L9B: Exemplar Case Timelines ──────────────────────────────────────────

  exemplarCaseTimelines(opts: PaginateOptions = {}) {
    return paginate<WvExemplarCaseTimeline>(
      this.db,
      `SELECT ${ECT_COLS} FROM wv_exemplar_case_timelines ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_exemplar_case_timelines`,
      [], opts,
    );
  }

  findExemplarCaseTimelineById(id: string): Promise<WvExemplarCaseTimeline | null> {
    return queryOne<WvExemplarCaseTimeline>(
      this.db, `SELECT ${ECT_COLS} FROM wv_exemplar_case_timelines WHERE id = ?`, [id],
    );
  }

  async createExemplarCaseTimeline(input: ExemplarCaseTimelineCreate): Promise<WvExemplarCaseTimeline> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_exemplar_case_timelines
         (id, slug, title, case_ids_json, tradition_ids, timeline_view_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.case_ids_json,
       input.tradition_ids ?? null, input.timeline_view_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findExemplarCaseTimelineById(id))!;
  }

  // ── L9B: Discernment Diagram Views ────────────────────────────────────────

  discernmentDiagramViews(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvDiscernmentDiagramView>(
      this.db,
      `SELECT ${DDV_COLS} FROM wv_discernment_diagram_views ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_discernment_diagram_views ${where}`,
      params, opts,
    );
  }

  findDiscernmentDiagramViewById(id: string): Promise<WvDiscernmentDiagramView | null> {
    return queryOne<WvDiscernmentDiagramView>(
      this.db, `SELECT ${DDV_COLS} FROM wv_discernment_diagram_views WHERE id = ?`, [id],
    );
  }

  async createDiscernmentDiagramView(input: DiscernmentDiagramViewCreate): Promise<WvDiscernmentDiagramView> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_discernment_diagram_views
         (id, slug, title, tradition_id, adversarial_pattern_ids, moral_inversion_ids,
          counterfeit_ids, diagram_spec_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id,
       input.adversarial_pattern_ids ?? null, input.moral_inversion_ids ?? null,
       input.counterfeit_ids ?? null, input.diagram_spec_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findDiscernmentDiagramViewById(id))!;
  }

  async patchDiscernmentDiagramView(id: string, patch: Partial<DiscernmentDiagramViewCreate>): Promise<WvDiscernmentDiagramView | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findDiscernmentDiagramViewById(id);
    await execute(this.db, `UPDATE wv_discernment_diagram_views SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findDiscernmentDiagramViewById(id);
  }
}
