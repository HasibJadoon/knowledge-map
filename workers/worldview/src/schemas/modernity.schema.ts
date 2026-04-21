// ─── Modernity schemas & types ───────────────────────────────────────────────

export interface WvModernityStream {
  id: string;
  slug: string;
  title: string;
  stream_type: string;
  origin_period_id: string | null;
  description_md: string | null;
  key_values: string | null;
  key_tensions: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvEnlightenmentCurrent {
  id: string;
  slug: string;
  title: string;
  stream_id: string | null;
  key_thinkers: string | null;
  key_texts: string | null;
  period_range: string | null;
  origin_region: string | null;
  description_md: string | null;
  successor_of: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvEpistemicRegime {
  id: string;
  slug: string;
  title: string;
  regime_type: string;
  tradition_id: string | null;
  period_id: string | null;
  description_md: string | null;
  key_claims: string | null;
  created_at: string;
}

export interface WvAuthorityModel {
  id: string;
  slug: string;
  title: string;
  authority_type: string;
  tradition_id: string | null;
  stream_id: string | null;
  description_md: string | null;
  legitimacy_claim: string | null;
  created_at: string;
}

export interface WvHumanImageProfile {
  id: string;
  slug: string;
  title: string;
  image_type: string;
  tradition_id: string | null;
  stream_id: string | null;
  description_md: string | null;
  key_attributes: string | null;
  moral_implications: string | null;
  created_at: string;
}

export interface WvPsychologySchool {
  id: string;
  slug: string;
  title: string;
  founder_name: string | null;
  period_range: string | null;
  origin_region: string | null;
  human_image_id: string | null;
  key_concepts: string | null;
  civilizational_role: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvIdentityRegime {
  id: string;
  slug: string;
  title: string;
  regime_type: string;
  stream_id: string | null;
  period_id: string | null;
  description_md: string | null;
  key_mechanisms: string | null;
  created_at: string;
}

export interface WvIdeologyProfile {
  id: string;
  slug: string;
  title: string;
  ideology_type: string;
  stream_id: string | null;
  key_claims: string | null;
  key_virtues: string | null;
  key_taboos: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvSecularMorality {
  id: string;
  slug: string;
  title: string;
  moral_type: string;
  stream_id: string | null;
  key_values: string | null;
  legitimacy_claim: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvCivilizationalCrisis {
  id: string;
  slug: string;
  title: string;
  crisis_type: string;
  stream_id: string | null;
  period_range: string | null;
  description_md: string | null;
  diagnostic_claims: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvColonialProject {
  id: string;
  slug: string;
  title: string;
  colonizer: string | null;
  colonized: string | null;
  period_id: string | null;
  region_id: string | null;
  project_type: string;
  key_institutions: string | null;
  moral_narrative: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvColonialMethod {
  id: string;
  slug: string;
  title: string;
  method_type: string;
  description_md: string | null;
  created_at: string;
}

export interface WvOrientalistFrame {
  id: string;
  slug: string;
  title: string;
  target_tradition: string | null;
  target_region: string | null;
  period_range: string | null;
  key_stereotypes: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvImageRegime {
  id: string;
  slug: string;
  title: string;
  regime_type: string;
  colonial_project_id: string | null;
  orientalist_frame_id: string | null;
  description_md: string | null;
  key_mechanisms: string | null;
  created_at: string;
}

export interface WvPropagandaSystem {
  id: string;
  slug: string;
  title: string;
  system_type: string;
  period_id: string | null;
  region_id: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvMediaRegime {
  id: string;
  slug: string;
  title: string;
  regime_type: string;
  period_id: string | null;
  description_md: string | null;
  key_characteristics: string | null;
  created_at: string;
}

export interface WvNarrativeScript {
  id: string;
  slug: string;
  title: string;
  script_type: string;
  propaganda_system_id: string | null;
  media_regime_id: string | null;
  description_md: string | null;
  key_moves: string | null;
  created_at: string;
}

export interface WvMemoryRewrite {
  id: string;
  title: string;
  rewrite_type: string;
  target_tradition: string | null;
  target_event_id: string | null;
  agent: string | null;
  period_range: string | null;
  description_md: string | null;
  evidence_refs: string | null;
  created_at: string;
}

export interface WvSpiritualAgent {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string;
  agent_type: string;
  description_md: string | null;
  scriptural_basis: string | null;
  created_at: string;
}

export interface WvAdversarialPattern {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  pattern_type: string;
  description_md: string | null;
  scriptural_refs: string | null;
  created_at: string;
}

export interface WvTemptationMode {
  id: string;
  slug: string;
  title: string;
  mode_type: string;
  tradition_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvMoralInversionPattern {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  inverted_virtue: string | null;
  replacement_virtue: string | null;
  mechanism: string | null;
  adversarial_pattern_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvDeceptionSignature {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  signature_type: string;
  description_md: string | null;
  warning_signs: string | null;
  created_at: string;
}

export interface WvFalseTranscendenceProfile {
  id: string;
  slug: string;
  title: string;
  profile_type: string;
  stream_id: string | null;
  description_md: string | null;
  how_it_mimics: string | null;
  created_at: string;
}

export interface WvCounterfeitRedemptionClaim {
  id: string;
  title: string;
  claim_text: string;
  stream_id: string | null;
  project_type: string;
  redemption_promise: string | null;
  displacement_mechanism: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvDiscernmentRule {
  id: string;
  slug: string;
  title: string;
  tradition_id: string;
  rule_type: string;
  rule_text: string;
  scriptural_basis: string | null;
  warning_indicators: string | null;
  created_at: string;
}

export type ModernityStreamCreate = Omit<WvModernityStream, 'id' | 'created_at'>;

export type EnlightenmentCurrentCreate = Omit<WvEnlightenmentCurrent, 'id' | 'created_at'>;

export type EpistemicRegimeCreate = Omit<WvEpistemicRegime, 'id' | 'created_at'>;

export type AuthorityModelCreate = Omit<WvAuthorityModel, 'id' | 'created_at'>;

export type HumanImageProfileCreate = Omit<WvHumanImageProfile, 'id' | 'created_at'>;

export type PsychologySchoolCreate = Omit<WvPsychologySchool, 'id' | 'created_at'>;

export type IdentityRegimeCreate = Omit<WvIdentityRegime, 'id' | 'created_at'>;

export type IdeologyProfileCreate = Omit<WvIdeologyProfile, 'id' | 'created_at'>;

export type SecularMoralityCreate = Omit<WvSecularMorality, 'id' | 'created_at'>;

export type CivilizationalCrisisCreate = Omit<WvCivilizationalCrisis, 'id' | 'created_at'>;

export type ColonialProjectCreate = Omit<WvColonialProject, 'id' | 'created_at'>;

export type ColonialMethodCreate = Omit<WvColonialMethod, 'id' | 'created_at'>;

export type OrientalistFrameCreate = Omit<WvOrientalistFrame, 'id' | 'created_at'>;

export type ImageRegimeCreate = Omit<WvImageRegime, 'id' | 'created_at'>;

export type PropagandaSystemCreate = Omit<WvPropagandaSystem, 'id' | 'created_at'>;

export type MediaRegimeCreate = Omit<WvMediaRegime, 'id' | 'created_at'>;

export type NarrativeScriptCreate = Omit<WvNarrativeScript, 'id' | 'created_at'>;

export type MemoryRewriteCreate = Omit<WvMemoryRewrite, 'id' | 'created_at'>;

export type SpiritualAgentCreate = Omit<WvSpiritualAgent, 'id' | 'created_at'>;

export type AdversarialPatternCreate = Omit<WvAdversarialPattern, 'id' | 'created_at'>;

export type TemptationModeCreate = Omit<WvTemptationMode, 'id' | 'created_at'>;

export type MoralInversionPatternCreate = Omit<WvMoralInversionPattern, 'id' | 'created_at'>;

export type DeceptionSignatureCreate = Omit<WvDeceptionSignature, 'id' | 'created_at'>;

export type FalseTranscendenceProfileCreate = Omit<WvFalseTranscendenceProfile, 'id' | 'created_at'>;

export type CounterfeitRedemptionClaimCreate = Omit<WvCounterfeitRedemptionClaim, 'id' | 'created_at'>;

export type DiscernmentRuleCreate = Omit<WvDiscernmentRule, 'id' | 'created_at'>;

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateModernityStreamCreate(body: unknown): SchemaValidationResult<ModernityStreamCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ModernityStreamCreate };
}

export function validateEnlightenmentCurrentCreate(body: unknown): SchemaValidationResult<EnlightenmentCurrentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as EnlightenmentCurrentCreate };
}

export function validateEpistemicRegimeCreate(body: unknown): SchemaValidationResult<EpistemicRegimeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as EpistemicRegimeCreate };
}

export function validateAuthorityModelCreate(body: unknown): SchemaValidationResult<AuthorityModelCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as AuthorityModelCreate };
}

export function validateHumanImageProfileCreate(body: unknown): SchemaValidationResult<HumanImageProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as HumanImageProfileCreate };
}

export function validatePsychologySchoolCreate(body: unknown): SchemaValidationResult<PsychologySchoolCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PsychologySchoolCreate };
}

export function validateIdentityRegimeCreate(body: unknown): SchemaValidationResult<IdentityRegimeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as IdentityRegimeCreate };
}

export function validateIdeologyProfileCreate(body: unknown): SchemaValidationResult<IdeologyProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as IdeologyProfileCreate };
}

export function validateSecularMoralityCreate(body: unknown): SchemaValidationResult<SecularMoralityCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as SecularMoralityCreate };
}

export function validateCivilizationalCrisisCreate(body: unknown): SchemaValidationResult<CivilizationalCrisisCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CivilizationalCrisisCreate };
}

export function validateColonialProjectCreate(body: unknown): SchemaValidationResult<ColonialProjectCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ColonialProjectCreate };
}

export function validateColonialMethodCreate(body: unknown): SchemaValidationResult<ColonialMethodCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ColonialMethodCreate };
}

export function validateOrientalistFrameCreate(body: unknown): SchemaValidationResult<OrientalistFrameCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as OrientalistFrameCreate };
}

export function validateImageRegimeCreate(body: unknown): SchemaValidationResult<ImageRegimeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ImageRegimeCreate };
}

export function validatePropagandaSystemCreate(body: unknown): SchemaValidationResult<PropagandaSystemCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as PropagandaSystemCreate };
}

export function validateMediaRegimeCreate(body: unknown): SchemaValidationResult<MediaRegimeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MediaRegimeCreate };
}

export function validateNarrativeScriptCreate(body: unknown): SchemaValidationResult<NarrativeScriptCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as NarrativeScriptCreate };
}

export function validateMemoryRewriteCreate(body: unknown): SchemaValidationResult<MemoryRewriteCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MemoryRewriteCreate };
}

export function validateSpiritualAgentCreate(body: unknown): SchemaValidationResult<SpiritualAgentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as SpiritualAgentCreate };
}

export function validateAdversarialPatternCreate(body: unknown): SchemaValidationResult<AdversarialPatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as AdversarialPatternCreate };
}

export function validateTemptationModeCreate(body: unknown): SchemaValidationResult<TemptationModeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as TemptationModeCreate };
}

export function validateMoralInversionPatternCreate(body: unknown): SchemaValidationResult<MoralInversionPatternCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MoralInversionPatternCreate };
}

export function validateDeceptionSignatureCreate(body: unknown): SchemaValidationResult<DeceptionSignatureCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as DeceptionSignatureCreate };
}

export function validateFalseTranscendenceProfileCreate(body: unknown): SchemaValidationResult<FalseTranscendenceProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as FalseTranscendenceProfileCreate };
}

export function validateCounterfeitRedemptionClaimCreate(body: unknown): SchemaValidationResult<CounterfeitRedemptionClaimCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CounterfeitRedemptionClaimCreate };
}

export function validateDiscernmentRuleCreate(body: unknown): SchemaValidationResult<DiscernmentRuleCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as DiscernmentRuleCreate };
}
