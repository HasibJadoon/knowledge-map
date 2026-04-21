// ─── Event schemas & types ───────────────────────────────────────────────

export interface WvPropheticEpisode {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  prophet_id: string | null;
  moral_axis_id: string | null;
  episode_type: string;
  narrative_text: string | null;
  moral_lesson: string | null;
  qr_scope_ref: string | null;
  corpus_unit_id: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvPropheticEpisodeLink {
  id: string;
  episode_id: string;
  target_type: string;
  target_id: string;
  link_role: string | null;
  note: string | null;
  created_at: string;
}

export interface WvEvent {
  id: string;
  slug: string;
  title: string;
  event_type_id: string | null;
  tradition_id: string | null;
  period_id: string | null;
  location_id: string | null;
  start_year: number | null;
  end_year: number | null;
  is_approximate: number;
  description_md: string | null;
  moral_significance: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvEventType {
  id: string;
  slug: string;
  title: string;
  created_at: string;
}

export interface WvEventParticipant {
  id: string;
  event_id: string;
  entity_type: string;
  entity_id: string;
  role: string | null;
  note: string | null;
  created_at: string;
}

export interface WvEventLocation {
  id: string;
  event_id: string;
  location_id: string;
  role: string | null;
  note: string | null;
  created_at: string;
}

export interface WvPractice {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  practice_type: string;
  tradition_id: string | null;
  moral_axis_id: string | null;
  period_id: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvSocialPattern {
  id: string;
  slug: string;
  title: string;
  pattern_type: string;
  tradition_id: string | null;
  period_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvAnthropologyProfile {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  human_image_id: string | null;
  body_view: string | null;
  soul_view: string | null;
  desire_view: string | null;
  sin_view: string | null;
  vocation_view: string | null;
  conscience_view: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvInstitutionProfile {
  id: string;
  institution_id: string;
  moral_role: string | null;
  civilizational_role: string | null;
  key_functions: string | null;
  notable_periods: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvCivilizationalContribution {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  domain_id: string | null;
  contrib_type: string;
  period_id: string | null;
  location_id: string | null;
  description_md: string | null;
  significance_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvContributionEvidenceLink {
  id: string;
  contrib_id: string;
  evidence_id: string;
  link_role: string;
  note: string | null;
  created_at: string;
}

export interface WvExemplarCase {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  moral_axis_id: string | null;
  case_type: string;
  narrative_text: string | null;
  moral_lesson: string | null;
  qr_scope_ref: string | null;
  period_id: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvCaseScopeLink {
  id: string;
  case_id: string;
  scope_type: string;
  scope_id: string;
  note: string | null;
  created_at: string;
}

export interface WvMoralCasePattern {
  id: string;
  slug: string;
  title: string;
  pattern_type: string;
  description_md: string | null;
  traditions_using: string | null;
  created_at: string;
}

export interface WvHouseholdModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  period_id: string | null;
  authority_structure: string | null;
  formation_methods: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvCharityInfrastructure {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  infra_type: string;
  period_id: string | null;
  location_id: string | null;
  institution_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvMemoryTradition {
  id: string;
  case_id: string | null;
  tradition_id: string | null;
  memory_type: string;
  description_md: string | null;
  vehicle: string | null;
  created_at: string;
}

export type PropheticEpisodeCreate = Omit<WvPropheticEpisode, 'id' | 'created_at' | 'updated_at'>;

export type PropheticEpisodeLinkCreate = Omit<WvPropheticEpisodeLink, 'id' | 'created_at'>;

export type EventCreate = Omit<WvEvent, 'id' | 'created_at' | 'updated_at'>;

export type EventTypeCreate = Omit<WvEventType, 'id' | 'created_at'>;

export type EventParticipantCreate = Omit<WvEventParticipant, 'id' | 'created_at'>;

export type EventLocationCreate = Omit<WvEventLocation, 'id' | 'created_at'>;

export type PracticeCreate = Omit<WvPractice, 'id' | 'created_at'>;

export type SocialPatternCreate = Omit<WvSocialPattern, 'id' | 'created_at'>;

export type AnthropologyProfileCreate = Omit<WvAnthropologyProfile, 'id' | 'created_at'>;

export type InstitutionProfileCreate = Omit<WvInstitutionProfile, 'id' | 'created_at'>;

export type CivilizationalContributionCreate = Omit<WvCivilizationalContribution, 'id' | 'created_at' | 'updated_at'>;

export type ContributionEvidenceLinkCreate = Omit<WvContributionEvidenceLink, 'id' | 'created_at'>;

export type ExemplarCaseCreate = Omit<WvExemplarCase, 'id' | 'created_at'>;

export type CaseScopeLinkCreate = Omit<WvCaseScopeLink, 'id' | 'created_at'>;

export type MoralCasePatternCreate = Omit<WvMoralCasePattern, 'id' | 'created_at'>;

export type HouseholdModelCreate = Omit<WvHouseholdModel, 'id' | 'created_at'>;

export type CharityInfrastructureCreate = Omit<WvCharityInfrastructure, 'id' | 'created_at'>;

export type MemoryTraditionCreate = Omit<WvMemoryTradition, 'id' | 'created_at'>;

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validatePropheticEpisodeCreate(body: unknown): SchemaValidationResult<PropheticEpisodeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PropheticEpisodeCreate };
}

export function validatePropheticEpisodeLinkCreate(body: unknown): SchemaValidationResult<PropheticEpisodeLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PropheticEpisodeLinkCreate };
}

export function validateEventCreate(body: unknown): SchemaValidationResult<EventCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as EventCreate };
}

export function validateEventTypeCreate(body: unknown): SchemaValidationResult<EventTypeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as EventTypeCreate };
}

export function validateEventParticipantCreate(body: unknown): SchemaValidationResult<EventParticipantCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as EventParticipantCreate };
}

export function validateEventLocationCreate(body: unknown): SchemaValidationResult<EventLocationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as EventLocationCreate };
}

export function validatePracticeCreate(body: unknown): SchemaValidationResult<PracticeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PracticeCreate };
}

export function validateSocialPatternCreate(body: unknown): SchemaValidationResult<SocialPatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as SocialPatternCreate };
}

export function validateAnthropologyProfileCreate(body: unknown): SchemaValidationResult<AnthropologyProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as AnthropologyProfileCreate };
}

export function validateInstitutionProfileCreate(body: unknown): SchemaValidationResult<InstitutionProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as InstitutionProfileCreate };
}

export function validateCivilizationalContributionCreate(body: unknown): SchemaValidationResult<CivilizationalContributionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CivilizationalContributionCreate };
}

export function validateContributionEvidenceLinkCreate(body: unknown): SchemaValidationResult<ContributionEvidenceLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ContributionEvidenceLinkCreate };
}

export function validateExemplarCaseCreate(body: unknown): SchemaValidationResult<ExemplarCaseCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ExemplarCaseCreate };
}

export function validateCaseScopeLinkCreate(body: unknown): SchemaValidationResult<CaseScopeLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CaseScopeLinkCreate };
}

export function validateMoralCasePatternCreate(body: unknown): SchemaValidationResult<MoralCasePatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MoralCasePatternCreate };
}

export function validateHouseholdModelCreate(body: unknown): SchemaValidationResult<HouseholdModelCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as HouseholdModelCreate };
}

export function validateCharityInfrastructureCreate(body: unknown): SchemaValidationResult<CharityInfrastructureCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CharityInfrastructureCreate };
}

export function validateMemoryTraditionCreate(body: unknown): SchemaValidationResult<MemoryTraditionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MemoryTraditionCreate };
}
