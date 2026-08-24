// ─── ModernityRepo — L4C + L4D + L4E tables ───────────────────────────────────
// Covers:
//   L4C: wv_modernity_streams, wv_enlightenment_currents, wv_epistemic_regimes,
//        wv_authority_models, wv_human_image_profiles, wv_psychology_schools,
//        wv_identity_regimes, wv_ideology_profiles, wv_secular_moralities,
//        wv_civilizational_crises
//   L4D: wv_colonial_projects, wv_colonial_methods, wv_orientalist_frames,
//        wv_image_regimes, wv_propaganda_systems, wv_media_regimes,
//        wv_narrative_scripts, wv_memory_rewrites
//   L4E: wv_spiritual_agents, wv_adversarial_patterns, wv_temptation_modes,
//        wv_moral_inversion_patterns, wv_deception_signatures,
//        wv_false_transcendence_profiles, wv_counterfeit_redemption_claims,
//        wv_discernment_rules

import { query, queryOne, execute, paginate, buildPatch } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── L4C interfaces ────────────────────────────────────────────────────────────

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

// ─── L4D interfaces ────────────────────────────────────────────────────────────

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

// ─── L4E interfaces ────────────────────────────────────────────────────────────

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

// ─── Create input interfaces ───────────────────────────────────────────────────

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

// ─── Column lists ──────────────────────────────────────────────────────────────

const MS_COLS   = `id, slug, title, stream_type, origin_period_id, description_md, key_values, key_tensions, meta_json, created_at`;
const EC_COLS   = `id, slug, title, stream_id, key_thinkers, key_texts, period_range, origin_region, description_md, successor_of, meta_json, created_at`;
const ER_COLS   = `id, slug, title, regime_type, tradition_id, period_id, description_md, key_claims, created_at`;
const AM_COLS   = `id, slug, title, authority_type, tradition_id, stream_id, description_md, legitimacy_claim, created_at`;
const HIP_COLS  = `id, slug, title, image_type, tradition_id, stream_id, description_md, key_attributes, moral_implications, created_at`;
const PS_COLS   = `id, slug, title, founder_name, period_range, origin_region, human_image_id, key_concepts, civilizational_role, description_md, meta_json, created_at`;
const IR_COLS   = `id, slug, title, regime_type, stream_id, period_id, description_md, key_mechanisms, created_at`;
const IP_COLS   = `id, slug, title, ideology_type, stream_id, key_claims, key_virtues, key_taboos, description_md, meta_json, created_at`;
const SM_COLS   = `id, slug, title, moral_type, stream_id, key_values, legitimacy_claim, description_md, created_at`;
const CC_COLS   = `id, slug, title, crisis_type, stream_id, period_range, description_md, diagnostic_claims, meta_json, created_at`;

const CP_COLS   = `id, slug, title, colonizer, colonized, period_id, region_id, project_type, key_institutions, moral_narrative, description_md, meta_json, created_at`;
const CM_COLS   = `id, slug, title, method_type, description_md, created_at`;
const OF_COLS   = `id, slug, title, target_tradition, target_region, period_range, key_stereotypes, description_md, meta_json, created_at`;
const IREG_COLS = `id, slug, title, regime_type, colonial_project_id, orientalist_frame_id, description_md, key_mechanisms, created_at`;
const PSYS_COLS = `id, slug, title, system_type, period_id, region_id, description_md, meta_json, created_at`;
const MR_COLS   = `id, slug, title, regime_type, period_id, description_md, key_characteristics, created_at`;
const NS_COLS   = `id, slug, title, script_type, propaganda_system_id, media_regime_id, description_md, key_moves, created_at`;
const MW_COLS   = `id, title, rewrite_type, target_tradition, target_event_id, agent, period_range, description_md, evidence_refs, created_at`;

const SA_COLS   = `id, slug, title, title_ar, tradition_id, agent_type, description_md, scriptural_basis, created_at`;
const AP_COLS   = `id, slug, title, title_ar, tradition_id, pattern_type, description_md, scriptural_refs, created_at`;
const TM_COLS   = `id, slug, title, mode_type, tradition_id, description_md, created_at`;
const MIP_COLS  = `id, slug, title, tradition_id, inverted_virtue, replacement_virtue, mechanism, adversarial_pattern_id, description_md, created_at`;
const DS_COLS   = `id, slug, title, tradition_id, signature_type, description_md, warning_signs, created_at`;
const FTP_COLS  = `id, slug, title, profile_type, stream_id, description_md, how_it_mimics, created_at`;
const CRC_COLS  = `id, title, claim_text, stream_id, project_type, redemption_promise, displacement_mechanism, description_md, created_at`;
const DR_COLS   = `id, slug, title, tradition_id, rule_type, rule_text, scriptural_basis, warning_indicators, created_at`;

// ─── Patch helpers ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// ModernityRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class ModernityRepo {
  constructor(private db: D1Database) {}

  // ── L4C: Modernity Streams ─────────────────────────────────────────────────

  streams(streamType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamType) { conds.push('stream_type = ?'); params.push(streamType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvModernityStream>(
      this.db,
      `SELECT ${MS_COLS} FROM wv_modernity_streams ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_modernity_streams ${where}`,
      params, opts,
    );
  }

  findStreamById(id: string): Promise<WvModernityStream | null> {
    return queryOne<WvModernityStream>(
      this.db, `SELECT ${MS_COLS} FROM wv_modernity_streams WHERE id = ?`, [id],
    );
  }

  async createStream(input: ModernityStreamCreate): Promise<WvModernityStream> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_modernity_streams
         (id, slug, title, stream_type, origin_period_id, description_md,
          key_values, key_tensions, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.stream_type,
       input.origin_period_id ?? null, input.description_md ?? null,
       input.key_values ?? null, input.key_tensions ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findStreamById(id))!;
  }

  async patchStream(id: string, patch: Partial<ModernityStreamCreate>): Promise<WvModernityStream | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findStreamById(id);
    await execute(this.db, `UPDATE wv_modernity_streams SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findStreamById(id);
  }

  // ── L4C: Enlightenment Currents ────────────────────────────────────────────

  enlightenmentCurrents(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvEnlightenmentCurrent>(
      this.db,
      `SELECT ${EC_COLS} FROM wv_enlightenment_currents ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_enlightenment_currents ${where}`,
      params, opts,
    );
  }

  findEnlightenmentCurrentById(id: string): Promise<WvEnlightenmentCurrent | null> {
    return queryOne<WvEnlightenmentCurrent>(
      this.db, `SELECT ${EC_COLS} FROM wv_enlightenment_currents WHERE id = ?`, [id],
    );
  }

  async createEnlightenmentCurrent(input: EnlightenmentCurrentCreate): Promise<WvEnlightenmentCurrent> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_enlightenment_currents
         (id, slug, title, stream_id, key_thinkers, key_texts, period_range,
          origin_region, description_md, successor_of, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.stream_id ?? null,
       input.key_thinkers ?? null, input.key_texts ?? null,
       input.period_range ?? null, input.origin_region ?? null,
       input.description_md ?? null, input.successor_of ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findEnlightenmentCurrentById(id))!;
  }

  async patchEnlightenmentCurrent(id: string, patch: Partial<EnlightenmentCurrentCreate>): Promise<WvEnlightenmentCurrent | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findEnlightenmentCurrentById(id);
    await execute(this.db, `UPDATE wv_enlightenment_currents SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findEnlightenmentCurrentById(id);
  }

  // ── L4C: Epistemic Regimes ─────────────────────────────────────────────────

  epistemicRegimes(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvEpistemicRegime>(
      this.db,
      `SELECT ${ER_COLS} FROM wv_epistemic_regimes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_epistemic_regimes ${where}`,
      params, opts,
    );
  }

  findEpistemicRegimeById(id: string): Promise<WvEpistemicRegime | null> {
    return queryOne<WvEpistemicRegime>(
      this.db, `SELECT ${ER_COLS} FROM wv_epistemic_regimes WHERE id = ?`, [id],
    );
  }

  async createEpistemicRegime(input: EpistemicRegimeCreate): Promise<WvEpistemicRegime> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_epistemic_regimes
         (id, slug, title, regime_type, tradition_id, period_id, description_md, key_claims, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.regime_type,
       input.tradition_id ?? null, input.period_id ?? null,
       input.description_md ?? null, input.key_claims ?? null, now],
    );
    return (await this.findEpistemicRegimeById(id))!;
  }

  async patchEpistemicRegime(id: string, patch: Partial<EpistemicRegimeCreate>): Promise<WvEpistemicRegime | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findEpistemicRegimeById(id);
    await execute(this.db, `UPDATE wv_epistemic_regimes SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findEpistemicRegimeById(id);
  }

  // ── L4C: Authority Models ──────────────────────────────────────────────────

  authorityModels(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvAuthorityModel>(
      this.db,
      `SELECT ${AM_COLS} FROM wv_authority_models ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_authority_models ${where}`,
      params, opts,
    );
  }

  findAuthorityModelById(id: string): Promise<WvAuthorityModel | null> {
    return queryOne<WvAuthorityModel>(
      this.db, `SELECT ${AM_COLS} FROM wv_authority_models WHERE id = ?`, [id],
    );
  }

  async createAuthorityModel(input: AuthorityModelCreate): Promise<WvAuthorityModel> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_authority_models
         (id, slug, title, authority_type, tradition_id, stream_id, description_md, legitimacy_claim, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.authority_type,
       input.tradition_id ?? null, input.stream_id ?? null,
       input.description_md ?? null, input.legitimacy_claim ?? null, now],
    );
    return (await this.findAuthorityModelById(id))!;
  }

  async patchAuthorityModel(id: string, patch: Partial<AuthorityModelCreate>): Promise<WvAuthorityModel | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findAuthorityModelById(id);
    await execute(this.db, `UPDATE wv_authority_models SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findAuthorityModelById(id);
  }

  // ── L4C: Human Image Profiles ──────────────────────────────────────────────

  humanImageProfiles(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvHumanImageProfile>(
      this.db,
      `SELECT ${HIP_COLS} FROM wv_human_image_profiles ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_human_image_profiles ${where}`,
      params, opts,
    );
  }

  findHumanImageProfileById(id: string): Promise<WvHumanImageProfile | null> {
    return queryOne<WvHumanImageProfile>(
      this.db, `SELECT ${HIP_COLS} FROM wv_human_image_profiles WHERE id = ?`, [id],
    );
  }

  async createHumanImageProfile(input: HumanImageProfileCreate): Promise<WvHumanImageProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_human_image_profiles
         (id, slug, title, image_type, tradition_id, stream_id,
          description_md, key_attributes, moral_implications, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.image_type,
       input.tradition_id ?? null, input.stream_id ?? null,
       input.description_md ?? null, input.key_attributes ?? null,
       input.moral_implications ?? null, now],
    );
    return (await this.findHumanImageProfileById(id))!;
  }

  async patchHumanImageProfile(id: string, patch: Partial<HumanImageProfileCreate>): Promise<WvHumanImageProfile | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findHumanImageProfileById(id);
    await execute(this.db, `UPDATE wv_human_image_profiles SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findHumanImageProfileById(id);
  }

  // ── L4C: Psychology Schools ────────────────────────────────────────────────

  psychologySchools(humanImageId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (humanImageId) { conds.push('human_image_id = ?'); params.push(humanImageId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPsychologySchool>(
      this.db,
      `SELECT ${PS_COLS} FROM wv_psychology_schools ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_psychology_schools ${where}`,
      params, opts,
    );
  }

  findPsychologySchoolById(id: string): Promise<WvPsychologySchool | null> {
    return queryOne<WvPsychologySchool>(
      this.db, `SELECT ${PS_COLS} FROM wv_psychology_schools WHERE id = ?`, [id],
    );
  }

  async createPsychologySchool(input: PsychologySchoolCreate): Promise<WvPsychologySchool> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_psychology_schools
         (id, slug, title, founder_name, period_range, origin_region,
          human_image_id, key_concepts, civilizational_role, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.founder_name ?? null,
       input.period_range ?? null, input.origin_region ?? null,
       input.human_image_id ?? null, input.key_concepts ?? null,
       input.civilizational_role ?? null, input.description_md ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findPsychologySchoolById(id))!;
  }

  async patchPsychologySchool(id: string, patch: Partial<PsychologySchoolCreate>): Promise<WvPsychologySchool | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findPsychologySchoolById(id);
    await execute(this.db, `UPDATE wv_psychology_schools SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findPsychologySchoolById(id);
  }

  // ── L4C: Identity Regimes ──────────────────────────────────────────────────

  identityRegimes(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvIdentityRegime>(
      this.db,
      `SELECT ${IR_COLS} FROM wv_identity_regimes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_identity_regimes ${where}`,
      params, opts,
    );
  }

  findIdentityRegimeById(id: string): Promise<WvIdentityRegime | null> {
    return queryOne<WvIdentityRegime>(
      this.db, `SELECT ${IR_COLS} FROM wv_identity_regimes WHERE id = ?`, [id],
    );
  }

  async createIdentityRegime(input: IdentityRegimeCreate): Promise<WvIdentityRegime> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_identity_regimes
         (id, slug, title, regime_type, stream_id, period_id, description_md, key_mechanisms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.regime_type,
       input.stream_id ?? null, input.period_id ?? null,
       input.description_md ?? null, input.key_mechanisms ?? null, now],
    );
    return (await this.findIdentityRegimeById(id))!;
  }

  async patchIdentityRegime(id: string, patch: Partial<IdentityRegimeCreate>): Promise<WvIdentityRegime | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findIdentityRegimeById(id);
    await execute(this.db, `UPDATE wv_identity_regimes SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findIdentityRegimeById(id);
  }

  // ── L4C: Ideology Profiles ─────────────────────────────────────────────────

  ideologyProfiles(ideologyType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (ideologyType) { conds.push('ideology_type = ?'); params.push(ideologyType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvIdeologyProfile>(
      this.db,
      `SELECT ${IP_COLS} FROM wv_ideology_profiles ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_ideology_profiles ${where}`,
      params, opts,
    );
  }

  findIdeologyProfileById(id: string): Promise<WvIdeologyProfile | null> {
    return queryOne<WvIdeologyProfile>(
      this.db, `SELECT ${IP_COLS} FROM wv_ideology_profiles WHERE id = ?`, [id],
    );
  }

  async createIdeologyProfile(input: IdeologyProfileCreate): Promise<WvIdeologyProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_ideology_profiles
         (id, slug, title, ideology_type, stream_id, key_claims, key_virtues,
          key_taboos, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.ideology_type,
       input.stream_id ?? null, input.key_claims ?? null,
       input.key_virtues ?? null, input.key_taboos ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findIdeologyProfileById(id))!;
  }

  async patchIdeologyProfile(id: string, patch: Partial<IdeologyProfileCreate>): Promise<WvIdeologyProfile | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findIdeologyProfileById(id);
    await execute(this.db, `UPDATE wv_ideology_profiles SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findIdeologyProfileById(id);
  }

  // ── L4C: Secular Moralities ────────────────────────────────────────────────

  secularMoralities(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvSecularMorality>(
      this.db,
      `SELECT ${SM_COLS} FROM wv_secular_moralities ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_secular_moralities ${where}`,
      params, opts,
    );
  }

  findSecularMoralityById(id: string): Promise<WvSecularMorality | null> {
    return queryOne<WvSecularMorality>(
      this.db, `SELECT ${SM_COLS} FROM wv_secular_moralities WHERE id = ?`, [id],
    );
  }

  async createSecularMorality(input: SecularMoralityCreate): Promise<WvSecularMorality> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_secular_moralities
         (id, slug, title, moral_type, stream_id, key_values, legitimacy_claim, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.moral_type,
       input.stream_id ?? null, input.key_values ?? null,
       input.legitimacy_claim ?? null, input.description_md ?? null, now],
    );
    return (await this.findSecularMoralityById(id))!;
  }

  async patchSecularMorality(id: string, patch: Partial<SecularMoralityCreate>): Promise<WvSecularMorality | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findSecularMoralityById(id);
    await execute(this.db, `UPDATE wv_secular_moralities SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findSecularMoralityById(id);
  }

  // ── L4C: Civilizational Crises ─────────────────────────────────────────────

  civilizationalCrises(crisisType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (crisisType) { conds.push('crisis_type = ?'); params.push(crisisType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvCivilizationalCrisis>(
      this.db,
      `SELECT ${CC_COLS} FROM wv_civilizational_crises ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_civilizational_crises ${where}`,
      params, opts,
    );
  }

  findCivilizationalCrisisById(id: string): Promise<WvCivilizationalCrisis | null> {
    return queryOne<WvCivilizationalCrisis>(
      this.db, `SELECT ${CC_COLS} FROM wv_civilizational_crises WHERE id = ?`, [id],
    );
  }

  async createCivilizationalCrisis(input: CivilizationalCrisisCreate): Promise<WvCivilizationalCrisis> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_civilizational_crises
         (id, slug, title, crisis_type, stream_id, period_range, description_md, diagnostic_claims, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.crisis_type,
       input.stream_id ?? null, input.period_range ?? null,
       input.description_md ?? null, input.diagnostic_claims ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findCivilizationalCrisisById(id))!;
  }

  async patchCivilizationalCrisis(id: string, patch: Partial<CivilizationalCrisisCreate>): Promise<WvCivilizationalCrisis | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findCivilizationalCrisisById(id);
    await execute(this.db, `UPDATE wv_civilizational_crises SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findCivilizationalCrisisById(id);
  }

  // ── L4D: Colonial Projects ─────────────────────────────────────────────────

  colonialProjects(projectType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (projectType) { conds.push('project_type = ?'); params.push(projectType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvColonialProject>(
      this.db,
      `SELECT ${CP_COLS} FROM wv_colonial_projects ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_colonial_projects ${where}`,
      params, opts,
    );
  }

  findColonialProjectById(id: string): Promise<WvColonialProject | null> {
    return queryOne<WvColonialProject>(
      this.db, `SELECT ${CP_COLS} FROM wv_colonial_projects WHERE id = ?`, [id],
    );
  }

  async createColonialProject(input: ColonialProjectCreate): Promise<WvColonialProject> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_colonial_projects
         (id, slug, title, colonizer, colonized, period_id, region_id,
          project_type, key_institutions, moral_narrative, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.colonizer ?? null,
       input.colonized ?? null, input.period_id ?? null,
       input.region_id ?? null, input.project_type,
       input.key_institutions ?? null, input.moral_narrative ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findColonialProjectById(id))!;
  }

  async patchColonialProject(id: string, patch: Partial<ColonialProjectCreate>): Promise<WvColonialProject | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findColonialProjectById(id);
    await execute(this.db, `UPDATE wv_colonial_projects SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findColonialProjectById(id);
  }

  // ── L4D: Colonial Methods ──────────────────────────────────────────────────

  colonialMethods(opts: PaginateOptions = {}) {
    return paginate<WvColonialMethod>(
      this.db,
      `SELECT ${CM_COLS} FROM wv_colonial_methods ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_colonial_methods`,
      [], opts,
    );
  }

  findColonialMethodById(id: string): Promise<WvColonialMethod | null> {
    return queryOne<WvColonialMethod>(
      this.db, `SELECT ${CM_COLS} FROM wv_colonial_methods WHERE id = ?`, [id],
    );
  }

  async createColonialMethod(input: ColonialMethodCreate): Promise<WvColonialMethod> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_colonial_methods (id, slug, title, method_type, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.method_type, input.description_md ?? null, now],
    );
    return (await this.findColonialMethodById(id))!;
  }

  async patchColonialMethod(id: string, patch: Partial<ColonialMethodCreate>): Promise<WvColonialMethod | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findColonialMethodById(id);
    await execute(this.db, `UPDATE wv_colonial_methods SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findColonialMethodById(id);
  }

  // ── L4D: Orientalist Frames ────────────────────────────────────────────────

  orientalistFrames(opts: PaginateOptions = {}) {
    return paginate<WvOrientalistFrame>(
      this.db,
      `SELECT ${OF_COLS} FROM wv_orientalist_frames ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_orientalist_frames`,
      [], opts,
    );
  }

  findOrientalistFrameById(id: string): Promise<WvOrientalistFrame | null> {
    return queryOne<WvOrientalistFrame>(
      this.db, `SELECT ${OF_COLS} FROM wv_orientalist_frames WHERE id = ?`, [id],
    );
  }

  async createOrientalistFrame(input: OrientalistFrameCreate): Promise<WvOrientalistFrame> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_orientalist_frames
         (id, slug, title, target_tradition, target_region, period_range,
          key_stereotypes, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.target_tradition ?? null,
       input.target_region ?? null, input.period_range ?? null,
       input.key_stereotypes ?? null, input.description_md ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findOrientalistFrameById(id))!;
  }

  async patchOrientalistFrame(id: string, patch: Partial<OrientalistFrameCreate>): Promise<WvOrientalistFrame | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findOrientalistFrameById(id);
    await execute(this.db, `UPDATE wv_orientalist_frames SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findOrientalistFrameById(id);
  }

  // ── L4D: Image Regimes ─────────────────────────────────────────────────────

  imageRegimes(regimeType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (regimeType) { conds.push('regime_type = ?'); params.push(regimeType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvImageRegime>(
      this.db,
      `SELECT ${IREG_COLS} FROM wv_image_regimes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_image_regimes ${where}`,
      params, opts,
    );
  }

  findImageRegimeById(id: string): Promise<WvImageRegime | null> {
    return queryOne<WvImageRegime>(
      this.db, `SELECT ${IREG_COLS} FROM wv_image_regimes WHERE id = ?`, [id],
    );
  }

  async createImageRegime(input: ImageRegimeCreate): Promise<WvImageRegime> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_image_regimes
         (id, slug, title, regime_type, colonial_project_id, orientalist_frame_id,
          description_md, key_mechanisms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.regime_type,
       input.colonial_project_id ?? null, input.orientalist_frame_id ?? null,
       input.description_md ?? null, input.key_mechanisms ?? null, now],
    );
    return (await this.findImageRegimeById(id))!;
  }

  async patchImageRegime(id: string, patch: Partial<ImageRegimeCreate>): Promise<WvImageRegime | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findImageRegimeById(id);
    await execute(this.db, `UPDATE wv_image_regimes SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findImageRegimeById(id);
  }

  // ── L4D: Propaganda Systems ────────────────────────────────────────────────

  propagandaSystems(systemType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (systemType) { conds.push('system_type = ?'); params.push(systemType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPropagandaSystem>(
      this.db,
      `SELECT ${PSYS_COLS} FROM wv_propaganda_systems ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_propaganda_systems ${where}`,
      params, opts,
    );
  }

  findPropagandaSystemById(id: string): Promise<WvPropagandaSystem | null> {
    return queryOne<WvPropagandaSystem>(
      this.db, `SELECT ${PSYS_COLS} FROM wv_propaganda_systems WHERE id = ?`, [id],
    );
  }

  async createPropagandaSystem(input: PropagandaSystemCreate): Promise<WvPropagandaSystem> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_propaganda_systems
         (id, slug, title, system_type, period_id, region_id, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.system_type,
       input.period_id ?? null, input.region_id ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findPropagandaSystemById(id))!;
  }

  async patchPropagandaSystem(id: string, patch: Partial<PropagandaSystemCreate>): Promise<WvPropagandaSystem | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findPropagandaSystemById(id);
    await execute(this.db, `UPDATE wv_propaganda_systems SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findPropagandaSystemById(id);
  }

  // ── L4D: Media Regimes ─────────────────────────────────────────────────────

  mediaRegimes(regimeType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (regimeType) { conds.push('regime_type = ?'); params.push(regimeType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMediaRegime>(
      this.db,
      `SELECT ${MR_COLS} FROM wv_media_regimes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_media_regimes ${where}`,
      params, opts,
    );
  }

  findMediaRegimeById(id: string): Promise<WvMediaRegime | null> {
    return queryOne<WvMediaRegime>(
      this.db, `SELECT ${MR_COLS} FROM wv_media_regimes WHERE id = ?`, [id],
    );
  }

  async createMediaRegime(input: MediaRegimeCreate): Promise<WvMediaRegime> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_media_regimes
         (id, slug, title, regime_type, period_id, description_md, key_characteristics, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.regime_type,
       input.period_id ?? null, input.description_md ?? null,
       input.key_characteristics ?? null, now],
    );
    return (await this.findMediaRegimeById(id))!;
  }

  async patchMediaRegime(id: string, patch: Partial<MediaRegimeCreate>): Promise<WvMediaRegime | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findMediaRegimeById(id);
    await execute(this.db, `UPDATE wv_media_regimes SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findMediaRegimeById(id);
  }

  // ── L4D: Narrative Scripts ─────────────────────────────────────────────────

  narrativeScripts(propagandaSystemId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (propagandaSystemId) { conds.push('propaganda_system_id = ?'); params.push(propagandaSystemId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvNarrativeScript>(
      this.db,
      `SELECT ${NS_COLS} FROM wv_narrative_scripts ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_narrative_scripts ${where}`,
      params, opts,
    );
  }

  findNarrativeScriptById(id: string): Promise<WvNarrativeScript | null> {
    return queryOne<WvNarrativeScript>(
      this.db, `SELECT ${NS_COLS} FROM wv_narrative_scripts WHERE id = ?`, [id],
    );
  }

  async createNarrativeScript(input: NarrativeScriptCreate): Promise<WvNarrativeScript> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_narrative_scripts
         (id, slug, title, script_type, propaganda_system_id, media_regime_id,
          description_md, key_moves, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.script_type,
       input.propaganda_system_id ?? null, input.media_regime_id ?? null,
       input.description_md ?? null, input.key_moves ?? null, now],
    );
    return (await this.findNarrativeScriptById(id))!;
  }

  async patchNarrativeScript(id: string, patch: Partial<NarrativeScriptCreate>): Promise<WvNarrativeScript | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findNarrativeScriptById(id);
    await execute(this.db, `UPDATE wv_narrative_scripts SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findNarrativeScriptById(id);
  }

  // ── L4D: Memory Rewrites ───────────────────────────────────────────────────

  memoryRewrites(rewriteType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (rewriteType) { conds.push('rewrite_type = ?'); params.push(rewriteType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMemoryRewrite>(
      this.db,
      `SELECT ${MW_COLS} FROM wv_memory_rewrites ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_memory_rewrites ${where}`,
      params, opts,
    );
  }

  findMemoryRewriteById(id: string): Promise<WvMemoryRewrite | null> {
    return queryOne<WvMemoryRewrite>(
      this.db, `SELECT ${MW_COLS} FROM wv_memory_rewrites WHERE id = ?`, [id],
    );
  }

  async createMemoryRewrite(input: MemoryRewriteCreate): Promise<WvMemoryRewrite> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_memory_rewrites
         (id, title, rewrite_type, target_tradition, target_event_id, agent,
          period_range, description_md, evidence_refs, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.rewrite_type, input.target_tradition ?? null,
       input.target_event_id ?? null, input.agent ?? null,
       input.period_range ?? null, input.description_md ?? null,
       input.evidence_refs ?? null, now],
    );
    return (await this.findMemoryRewriteById(id))!;
  }

  async patchMemoryRewrite(id: string, patch: Partial<MemoryRewriteCreate>): Promise<WvMemoryRewrite | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findMemoryRewriteById(id);
    await execute(this.db, `UPDATE wv_memory_rewrites SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findMemoryRewriteById(id);
  }

  // ── L4E: Spiritual Agents ──────────────────────────────────────────────────

  spiritualAgents(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvSpiritualAgent>(
      this.db,
      `SELECT ${SA_COLS} FROM wv_spiritual_agents ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_spiritual_agents ${where}`,
      params, opts,
    );
  }

  findSpiritualAgentById(id: string): Promise<WvSpiritualAgent | null> {
    return queryOne<WvSpiritualAgent>(
      this.db, `SELECT ${SA_COLS} FROM wv_spiritual_agents WHERE id = ?`, [id],
    );
  }

  async createSpiritualAgent(input: SpiritualAgentCreate): Promise<WvSpiritualAgent> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_spiritual_agents
         (id, slug, title, title_ar, tradition_id, agent_type, description_md, scriptural_basis, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.title_ar ?? null,
       input.tradition_id, input.agent_type,
       input.description_md ?? null, input.scriptural_basis ?? null, now],
    );
    return (await this.findSpiritualAgentById(id))!;
  }

  async patchSpiritualAgent(id: string, patch: Partial<SpiritualAgentCreate>): Promise<WvSpiritualAgent | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findSpiritualAgentById(id);
    await execute(this.db, `UPDATE wv_spiritual_agents SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findSpiritualAgentById(id);
  }

  // ── L4E: Adversarial Patterns ──────────────────────────────────────────────

  adversarialPatterns(traditionId: string | null, patternType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    if (patternType) { conds.push('pattern_type = ?'); params.push(patternType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvAdversarialPattern>(
      this.db,
      `SELECT ${AP_COLS} FROM wv_adversarial_patterns ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_adversarial_patterns ${where}`,
      params, opts,
    );
  }

  findAdversarialPatternById(id: string): Promise<WvAdversarialPattern | null> {
    return queryOne<WvAdversarialPattern>(
      this.db, `SELECT ${AP_COLS} FROM wv_adversarial_patterns WHERE id = ?`, [id],
    );
  }

  async createAdversarialPattern(input: AdversarialPatternCreate): Promise<WvAdversarialPattern> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_adversarial_patterns
         (id, slug, title, title_ar, tradition_id, pattern_type, description_md, scriptural_refs, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.title_ar ?? null,
       input.tradition_id ?? null, input.pattern_type,
       input.description_md ?? null, input.scriptural_refs ?? null, now],
    );
    return (await this.findAdversarialPatternById(id))!;
  }

  async patchAdversarialPattern(id: string, patch: Partial<AdversarialPatternCreate>): Promise<WvAdversarialPattern | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findAdversarialPatternById(id);
    await execute(this.db, `UPDATE wv_adversarial_patterns SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findAdversarialPatternById(id);
  }

  // ── L4E: Temptation Modes ──────────────────────────────────────────────────

  temptationModes(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvTemptationMode>(
      this.db,
      `SELECT ${TM_COLS} FROM wv_temptation_modes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_temptation_modes ${where}`,
      params, opts,
    );
  }

  findTemptationModeById(id: string): Promise<WvTemptationMode | null> {
    return queryOne<WvTemptationMode>(
      this.db, `SELECT ${TM_COLS} FROM wv_temptation_modes WHERE id = ?`, [id],
    );
  }

  async createTemptationMode(input: TemptationModeCreate): Promise<WvTemptationMode> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_temptation_modes
         (id, slug, title, mode_type, tradition_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.mode_type,
       input.tradition_id ?? null, input.description_md ?? null, now],
    );
    return (await this.findTemptationModeById(id))!;
  }

  async patchTemptationMode(id: string, patch: Partial<TemptationModeCreate>): Promise<WvTemptationMode | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findTemptationModeById(id);
    await execute(this.db, `UPDATE wv_temptation_modes SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findTemptationModeById(id);
  }

  // ── L4E: Moral Inversion Patterns ─────────────────────────────────────────

  moralInversionPatterns(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMoralInversionPattern>(
      this.db,
      `SELECT ${MIP_COLS} FROM wv_moral_inversion_patterns ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_moral_inversion_patterns ${where}`,
      params, opts,
    );
  }

  findMoralInversionPatternById(id: string): Promise<WvMoralInversionPattern | null> {
    return queryOne<WvMoralInversionPattern>(
      this.db, `SELECT ${MIP_COLS} FROM wv_moral_inversion_patterns WHERE id = ?`, [id],
    );
  }

  async createMoralInversionPattern(input: MoralInversionPatternCreate): Promise<WvMoralInversionPattern> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_moral_inversion_patterns
         (id, slug, title, tradition_id, inverted_virtue, replacement_virtue,
          mechanism, adversarial_pattern_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.inverted_virtue ?? null, input.replacement_virtue ?? null,
       input.mechanism ?? null, input.adversarial_pattern_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findMoralInversionPatternById(id))!;
  }

  async patchMoralInversionPattern(id: string, patch: Partial<MoralInversionPatternCreate>): Promise<WvMoralInversionPattern | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findMoralInversionPatternById(id);
    await execute(this.db, `UPDATE wv_moral_inversion_patterns SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findMoralInversionPatternById(id);
  }

  // ── L4E: Deception Signatures ──────────────────────────────────────────────

  deceptionSignatures(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvDeceptionSignature>(
      this.db,
      `SELECT ${DS_COLS} FROM wv_deception_signatures ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_deception_signatures ${where}`,
      params, opts,
    );
  }

  findDeceptionSignatureById(id: string): Promise<WvDeceptionSignature | null> {
    return queryOne<WvDeceptionSignature>(
      this.db, `SELECT ${DS_COLS} FROM wv_deception_signatures WHERE id = ?`, [id],
    );
  }

  async createDeceptionSignature(input: DeceptionSignatureCreate): Promise<WvDeceptionSignature> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_deception_signatures
         (id, slug, title, tradition_id, signature_type, description_md, warning_signs, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.signature_type, input.description_md ?? null,
       input.warning_signs ?? null, now],
    );
    return (await this.findDeceptionSignatureById(id))!;
  }

  async patchDeceptionSignature(id: string, patch: Partial<DeceptionSignatureCreate>): Promise<WvDeceptionSignature | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findDeceptionSignatureById(id);
    await execute(this.db, `UPDATE wv_deception_signatures SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findDeceptionSignatureById(id);
  }

  // ── L4E: False Transcendence Profiles ─────────────────────────────────────

  falseTranscendenceProfiles(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvFalseTranscendenceProfile>(
      this.db,
      `SELECT ${FTP_COLS} FROM wv_false_transcendence_profiles ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_false_transcendence_profiles ${where}`,
      params, opts,
    );
  }

  findFalseTranscendenceProfileById(id: string): Promise<WvFalseTranscendenceProfile | null> {
    return queryOne<WvFalseTranscendenceProfile>(
      this.db, `SELECT ${FTP_COLS} FROM wv_false_transcendence_profiles WHERE id = ?`, [id],
    );
  }

  async createFalseTranscendenceProfile(input: FalseTranscendenceProfileCreate): Promise<WvFalseTranscendenceProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_false_transcendence_profiles
         (id, slug, title, profile_type, stream_id, description_md, how_it_mimics, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.profile_type,
       input.stream_id ?? null, input.description_md ?? null,
       input.how_it_mimics ?? null, now],
    );
    return (await this.findFalseTranscendenceProfileById(id))!;
  }

  async patchFalseTranscendenceProfile(id: string, patch: Partial<FalseTranscendenceProfileCreate>): Promise<WvFalseTranscendenceProfile | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findFalseTranscendenceProfileById(id);
    await execute(this.db, `UPDATE wv_false_transcendence_profiles SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findFalseTranscendenceProfileById(id);
  }

  // ── L4E: Counterfeit Redemption Claims ────────────────────────────────────

  counterfeitRedemptionClaims(streamId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (streamId) { conds.push('stream_id = ?'); params.push(streamId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvCounterfeitRedemptionClaim>(
      this.db,
      `SELECT ${CRC_COLS} FROM wv_counterfeit_redemption_claims ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_counterfeit_redemption_claims ${where}`,
      params, opts,
    );
  }

  findCounterfeitRedemptionClaimById(id: string): Promise<WvCounterfeitRedemptionClaim | null> {
    return queryOne<WvCounterfeitRedemptionClaim>(
      this.db, `SELECT ${CRC_COLS} FROM wv_counterfeit_redemption_claims WHERE id = ?`, [id],
    );
  }

  async createCounterfeitRedemptionClaim(input: CounterfeitRedemptionClaimCreate): Promise<WvCounterfeitRedemptionClaim> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_counterfeit_redemption_claims
         (id, title, claim_text, stream_id, project_type, redemption_promise,
          displacement_mechanism, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.claim_text, input.stream_id ?? null,
       input.project_type, input.redemption_promise ?? null,
       input.displacement_mechanism ?? null, input.description_md ?? null, now],
    );
    return (await this.findCounterfeitRedemptionClaimById(id))!;
  }

  async patchCounterfeitRedemptionClaim(id: string, patch: Partial<CounterfeitRedemptionClaimCreate>): Promise<WvCounterfeitRedemptionClaim | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findCounterfeitRedemptionClaimById(id);
    await execute(this.db, `UPDATE wv_counterfeit_redemption_claims SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findCounterfeitRedemptionClaimById(id);
  }

  // ── L4E: Discernment Rules ─────────────────────────────────────────────────

  discernmentRules(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvDiscernmentRule>(
      this.db,
      `SELECT ${DR_COLS} FROM wv_discernment_rules ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_discernment_rules ${where}`,
      params, opts,
    );
  }

  findDiscernmentRuleById(id: string): Promise<WvDiscernmentRule | null> {
    return queryOne<WvDiscernmentRule>(
      this.db, `SELECT ${DR_COLS} FROM wv_discernment_rules WHERE id = ?`, [id],
    );
  }

  async createDiscernmentRule(input: DiscernmentRuleCreate): Promise<WvDiscernmentRule> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_discernment_rules
         (id, slug, title, tradition_id, rule_type, rule_text,
          scriptural_basis, warning_indicators, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id, input.rule_type,
       input.rule_text, input.scriptural_basis ?? null,
       input.warning_indicators ?? null, now],
    );
    return (await this.findDiscernmentRuleById(id))!;
  }

  async patchDiscernmentRule(id: string, patch: Partial<DiscernmentRuleCreate>): Promise<WvDiscernmentRule | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findDiscernmentRuleById(id);
    await execute(this.db, `UPDATE wv_discernment_rules SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findDiscernmentRuleById(id);
  }
}
