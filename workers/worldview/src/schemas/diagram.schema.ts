// ─── Diagram schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateComparisonTemplateCreate(body: unknown): SchemaValidationResult<ComparisonTemplateCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ComparisonTemplateCreate };
}

export function validateMoralArcViewCreate(body: unknown): SchemaValidationResult<MoralArcViewCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MoralArcViewCreate };
}

export function validateCivilizationalMatrixCreate(body: unknown): SchemaValidationResult<CivilizationalMatrixCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CivilizationalMatrixCreate };
}

export function validatePropheticExemplarCreate(body: unknown): SchemaValidationResult<PropheticExemplarCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PropheticExemplarCreate };
}

export function validateTimelineViewCreate(body: unknown): SchemaValidationResult<TimelineViewCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as TimelineViewCreate };
}

export function validateDiagramSpecCreate(body: unknown): SchemaValidationResult<DiagramSpecCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as DiagramSpecCreate };
}

export function validateDiagramInstanceCreate(body: unknown): SchemaValidationResult<DiagramInstanceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as DiagramInstanceCreate };
}

export function validateOutputArtifactCreate(body: unknown): SchemaValidationResult<OutputArtifactCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as OutputArtifactCreate };
}

export function validateRendererPresetCreate(body: unknown): SchemaValidationResult<RendererPresetCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as RendererPresetCreate };
}

export function validateStorylineSpecCreate(body: unknown): SchemaValidationResult<StorylineSpecCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as StorylineSpecCreate };
}

export function validateAbrahamicMoralityMatrixCreate(body: unknown): SchemaValidationResult<AbrahamicMoralityMatrixCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as AbrahamicMoralityMatrixCreate };
}

export function validateReplacementBedrockViewCreate(body: unknown): SchemaValidationResult<ReplacementBedrockViewCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ReplacementBedrockViewCreate };
}

export function validateMoralCivilizationMapCreate(body: unknown): SchemaValidationResult<MoralCivilizationMapCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MoralCivilizationMapCreate };
}

export function validatePropagandaFlowMapCreate(body: unknown): SchemaValidationResult<PropagandaFlowMapCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PropagandaFlowMapCreate };
}

export function validateOrientalismImageChainCreate(body: unknown): SchemaValidationResult<OrientalismImageChainCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as OrientalismImageChainCreate };
}

export function validateExemplarCaseTimelineCreate(body: unknown): SchemaValidationResult<ExemplarCaseTimelineCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ExemplarCaseTimelineCreate };
}

export function validateDiscernmentDiagramViewCreate(body: unknown): SchemaValidationResult<DiscernmentDiagramViewCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as DiscernmentDiagramViewCreate };
}
