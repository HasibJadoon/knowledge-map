// ─── EventRepo — L5 + L5B tables ──────────────────────────────────────────────
// L5:  wv_prophetic_episodes, wv_prophetic_episode_links, wv_events,
//      wv_event_types, wv_event_participants, wv_event_locations,
//      wv_practices, wv_social_patterns, wv_anthropology_profiles,
//      wv_institution_profiles, wv_civilizational_contributions,
//      wv_contribution_evidence_links
// L5B: wv_exemplar_cases, wv_case_scope_links, wv_moral_case_patterns,
//      wv_household_models, wv_charity_infrastructures, wv_memory_traditions

import { query, queryOne, execute, paginate, buildPatch } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── L5 interfaces ─────────────────────────────────────────────────────────────

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

// ─── L5B interfaces ────────────────────────────────────────────────────────────

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

// ─── Create input types ────────────────────────────────────────────────────────

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

// ─── Column lists ──────────────────────────────────────────────────────────────

const PE_COLS   = `id, slug, title, title_ar, tradition_id, prophet_id, moral_axis_id, episode_type, narrative_text, moral_lesson, qr_scope_ref, corpus_unit_id, meta_json, created_at, updated_at`;
const PEL_COLS  = `id, episode_id, target_type, target_id, link_role, note, created_at`;
const EV_COLS   = `id, slug, title, event_type_id, tradition_id, period_id, location_id, start_year, end_year, is_approximate, description_md, moral_significance, meta_json, created_at, updated_at`;
const ET_COLS   = `id, slug, title, created_at`;
const EP_COLS   = `id, event_id, entity_type, entity_id, role, note, created_at`;
const EL_COLS   = `id, event_id, location_id, role, note, created_at`;
const PR_COLS   = `id, slug, title, title_ar, practice_type, tradition_id, moral_axis_id, period_id, description_md, meta_json, created_at`;
const SP_COLS   = `id, slug, title, pattern_type, tradition_id, period_id, description_md, created_at`;
const AP_COLS   = `id, slug, title, tradition_id, human_image_id, body_view, soul_view, desire_view, sin_view, vocation_view, conscience_view, description_md, created_at`;
const IP_COLS   = `id, institution_id, moral_role, civilizational_role, key_functions, notable_periods, description_md, created_at`;
const CC_COLS   = `id, slug, title, tradition_id, domain_id, contrib_type, period_id, location_id, description_md, significance_md, meta_json, created_at, updated_at`;
const CEL_COLS  = `id, contrib_id, evidence_id, link_role, note, created_at`;

const EC_COLS   = `id, slug, title, tradition_id, moral_axis_id, case_type, narrative_text, moral_lesson, qr_scope_ref, period_id, meta_json, created_at`;
const CSL_COLS  = `id, case_id, scope_type, scope_id, note, created_at`;
const MCP_COLS  = `id, slug, title, pattern_type, description_md, traditions_using, created_at`;
const HM_COLS   = `id, slug, title, tradition_id, period_id, authority_structure, formation_methods, description_md, created_at`;
const CI_COLS   = `id, slug, title, tradition_id, infra_type, period_id, location_id, institution_id, description_md, created_at`;
const MT_COLS   = `id, case_id, tradition_id, memory_type, description_md, vehicle, created_at`;

// ─── Patch helper ──────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// EventRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class EventRepo {
  constructor(private db: D1Database) {}

  // ── L5: Prophetic Episodes ─────────────────────────────────────────────────

  episodes(prophetRef: string | null, traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (prophetRef)   { conds.push('prophet_id = ?');   params.push(prophetRef); }
    if (traditionId)  { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPropheticEpisode>(
      this.db,
      `SELECT ${PE_COLS} FROM wv_prophetic_episodes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_prophetic_episodes ${where}`,
      params, opts,
    );
  }

  findEpisodeById(id: string): Promise<WvPropheticEpisode | null> {
    return queryOne<WvPropheticEpisode>(
      this.db, `SELECT ${PE_COLS} FROM wv_prophetic_episodes WHERE id = ?`, [id],
    );
  }

  async createEpisode(input: PropheticEpisodeCreate): Promise<WvPropheticEpisode> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_prophetic_episodes
         (id, slug, title, title_ar, tradition_id, prophet_id, moral_axis_id,
          episode_type, narrative_text, moral_lesson, qr_scope_ref, corpus_unit_id,
          meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.title_ar ?? null,
       input.tradition_id ?? null, input.prophet_id ?? null,
       input.moral_axis_id ?? null, input.episode_type,
       input.narrative_text ?? null, input.moral_lesson ?? null,
       input.qr_scope_ref ?? null, input.corpus_unit_id ?? null,
       input.meta_json ?? null, now, now],
    );
    return (await this.findEpisodeById(id))!;
  }

  episodeLinks(episodeId: string): Promise<WvPropheticEpisodeLink[]> {
    return query<WvPropheticEpisodeLink>(
      this.db,
      `SELECT ${PEL_COLS} FROM wv_prophetic_episode_links WHERE episode_id = ? ORDER BY target_type`,
      [episodeId],
    );
  }

  async addEpisodeLink(input: PropheticEpisodeLinkCreate): Promise<WvPropheticEpisodeLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_prophetic_episode_links
         (id, episode_id, target_type, target_id, link_role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.episode_id, input.target_type, input.target_id,
       input.link_role ?? null, input.note ?? null, now],
    );
    return (await queryOne<WvPropheticEpisodeLink>(
      this.db, `SELECT ${PEL_COLS} FROM wv_prophetic_episode_links WHERE id = ?`, [id],
    ))!;
  }

  // ── L5: Events ─────────────────────────────────────────────────────────────

  events(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvEvent>(
      this.db,
      `SELECT ${EV_COLS} FROM wv_events ${where} ORDER BY start_year, title`,
      `SELECT COUNT(*) AS count FROM wv_events ${where}`,
      params, opts,
    );
  }

  findEventById(id: string): Promise<WvEvent | null> {
    return queryOne<WvEvent>(
      this.db, `SELECT ${EV_COLS} FROM wv_events WHERE id = ?`, [id],
    );
  }

  async createEvent(input: EventCreate): Promise<WvEvent> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_events
         (id, slug, title, event_type_id, tradition_id, period_id, location_id,
          start_year, end_year, is_approximate, description_md, moral_significance,
          meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.event_type_id ?? null,
       input.tradition_id ?? null, input.period_id ?? null,
       input.location_id ?? null, input.start_year ?? null,
       input.end_year ?? null, input.is_approximate ?? 0,
       input.description_md ?? null, input.moral_significance ?? null,
       input.meta_json ?? null, now, now],
    );
    return (await this.findEventById(id))!;
  }

  async patchEvent(id: string, patch: Partial<EventCreate>): Promise<WvEvent | null> {
    const { setClauses, values } = buildPatch({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>);
    if (!setClauses) return this.findEventById(id);
    await execute(this.db, `UPDATE wv_events SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findEventById(id);
  }

  // ── L5: Event Types ────────────────────────────────────────────────────────

  eventTypes(opts: PaginateOptions = {}) {
    return paginate<WvEventType>(
      this.db,
      `SELECT ${ET_COLS} FROM wv_event_types ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_event_types`,
      [], opts,
    );
  }

  async createEventType(input: EventTypeCreate): Promise<WvEventType> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_event_types (id, slug, title, created_at) VALUES (?, ?, ?, ?)`,
      [id, input.slug, input.title, now],
    );
    return (await queryOne<WvEventType>(
      this.db, `SELECT ${ET_COLS} FROM wv_event_types WHERE id = ?`, [id],
    ))!;
  }

  // ── L5: Event Participants ─────────────────────────────────────────────────

  participants(eventId: string): Promise<WvEventParticipant[]> {
    return query<WvEventParticipant>(
      this.db,
      `SELECT ${EP_COLS} FROM wv_event_participants WHERE event_id = ? ORDER BY entity_type`,
      [eventId],
    );
  }

  async addParticipant(input: EventParticipantCreate): Promise<WvEventParticipant> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_event_participants
         (id, event_id, entity_type, entity_id, role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.event_id, input.entity_type, input.entity_id,
       input.role ?? null, input.note ?? null, now],
    );
    return (await queryOne<WvEventParticipant>(
      this.db, `SELECT ${EP_COLS} FROM wv_event_participants WHERE id = ?`, [id],
    ))!;
  }

  async removeParticipant(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_event_participants WHERE id = ?`, [id]);
  }

  // ── L5: Event Locations ────────────────────────────────────────────────────

  eventLocations(eventId: string): Promise<WvEventLocation[]> {
    return query<WvEventLocation>(
      this.db,
      `SELECT ${EL_COLS} FROM wv_event_locations WHERE event_id = ?`,
      [eventId],
    );
  }

  async addEventLocation(input: EventLocationCreate): Promise<WvEventLocation> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_event_locations (id, event_id, location_id, role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.event_id, input.location_id, input.role ?? null,
       input.note ?? null, now],
    );
    return (await queryOne<WvEventLocation>(
      this.db, `SELECT ${EL_COLS} FROM wv_event_locations WHERE id = ?`, [id],
    ))!;
  }

  // ── L5: Practices ──────────────────────────────────────────────────────────

  practices(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvPractice>(
      this.db,
      `SELECT ${PR_COLS} FROM wv_practices ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_practices ${where}`,
      params, opts,
    );
  }

  findPracticeById(id: string): Promise<WvPractice | null> {
    return queryOne<WvPractice>(
      this.db, `SELECT ${PR_COLS} FROM wv_practices WHERE id = ?`, [id],
    );
  }

  async createPractice(input: PracticeCreate): Promise<WvPractice> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_practices
         (id, slug, title, title_ar, practice_type, tradition_id, moral_axis_id,
          period_id, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.title_ar ?? null,
       input.practice_type, input.tradition_id ?? null,
       input.moral_axis_id ?? null, input.period_id ?? null,
       input.description_md ?? null, input.meta_json ?? null, now],
    );
    return (await this.findPracticeById(id))!;
  }

  async patchPractice(id: string, patch: Partial<PracticeCreate>): Promise<WvPractice | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findPracticeById(id);
    await execute(this.db, `UPDATE wv_practices SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findPracticeById(id);
  }

  // ── L5: Social Patterns ────────────────────────────────────────────────────

  socialPatterns(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvSocialPattern>(
      this.db,
      `SELECT ${SP_COLS} FROM wv_social_patterns ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_social_patterns ${where}`,
      params, opts,
    );
  }

  findSocialPatternById(id: string): Promise<WvSocialPattern | null> {
    return queryOne<WvSocialPattern>(
      this.db, `SELECT ${SP_COLS} FROM wv_social_patterns WHERE id = ?`, [id],
    );
  }

  async createSocialPattern(input: SocialPatternCreate): Promise<WvSocialPattern> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_social_patterns
         (id, slug, title, pattern_type, tradition_id, period_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.pattern_type,
       input.tradition_id ?? null, input.period_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findSocialPatternById(id))!;
  }

  async patchSocialPattern(id: string, patch: Partial<SocialPatternCreate>): Promise<WvSocialPattern | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findSocialPatternById(id);
    await execute(this.db, `UPDATE wv_social_patterns SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findSocialPatternById(id);
  }

  // ── L5: Anthropology Profiles ──────────────────────────────────────────────

  anthropologyProfiles(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvAnthropologyProfile>(
      this.db,
      `SELECT ${AP_COLS} FROM wv_anthropology_profiles ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_anthropology_profiles ${where}`,
      params, opts,
    );
  }

  findAnthropologyProfileById(id: string): Promise<WvAnthropologyProfile | null> {
    return queryOne<WvAnthropologyProfile>(
      this.db, `SELECT ${AP_COLS} FROM wv_anthropology_profiles WHERE id = ?`, [id],
    );
  }

  async createAnthropologyProfile(input: AnthropologyProfileCreate): Promise<WvAnthropologyProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_anthropology_profiles
         (id, slug, title, tradition_id, human_image_id, body_view, soul_view,
          desire_view, sin_view, vocation_view, conscience_view, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.human_image_id ?? null, input.body_view ?? null,
       input.soul_view ?? null, input.desire_view ?? null,
       input.sin_view ?? null, input.vocation_view ?? null,
       input.conscience_view ?? null, input.description_md ?? null, now],
    );
    return (await this.findAnthropologyProfileById(id))!;
  }

  async patchAnthropologyProfile(id: string, patch: Partial<AnthropologyProfileCreate>): Promise<WvAnthropologyProfile | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findAnthropologyProfileById(id);
    await execute(this.db, `UPDATE wv_anthropology_profiles SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findAnthropologyProfileById(id);
  }

  // ── L5: Institution Profiles ───────────────────────────────────────────────

  institutionProfiles(traditionId: string | null, opts: PaginateOptions = {}) {
    // Join to wv_institutions to filter by tradition
    const conds: string[] = [];
    const params: unknown[] = [];
    let from = `wv_institution_profiles ip`;
    if (traditionId) {
      from += ` JOIN wv_institutions i ON i.id = ip.institution_id`;
      conds.push('i.tradition_id = ?');
      params.push(traditionId);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvInstitutionProfile>(
      this.db,
      `SELECT ip.${IP_COLS.split(', ').join(', ip.')} FROM ${from} ${where} ORDER BY ip.id`,
      `SELECT COUNT(*) AS count FROM ${from} ${where}`,
      params, opts,
    );
  }

  findInstitutionProfileById(id: string): Promise<WvInstitutionProfile | null> {
    return queryOne<WvInstitutionProfile>(
      this.db, `SELECT ${IP_COLS} FROM wv_institution_profiles WHERE id = ?`, [id],
    );
  }

  async createInstitutionProfile(input: InstitutionProfileCreate): Promise<WvInstitutionProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_institution_profiles
         (id, institution_id, moral_role, civilizational_role, key_functions, notable_periods, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.institution_id, input.moral_role ?? null,
       input.civilizational_role ?? null, input.key_functions ?? null,
       input.notable_periods ?? null, input.description_md ?? null, now],
    );
    return (await this.findInstitutionProfileById(id))!;
  }

  async patchInstitutionProfile(id: string, patch: Partial<InstitutionProfileCreate>): Promise<WvInstitutionProfile | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findInstitutionProfileById(id);
    await execute(this.db, `UPDATE wv_institution_profiles SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findInstitutionProfileById(id);
  }

  // ── L5: Civilizational Contributions ──────────────────────────────────────

  contributions(traditionId: string | null, contribType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    if (contribType) { conds.push('contrib_type = ?'); params.push(contribType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvCivilizationalContribution>(
      this.db,
      `SELECT ${CC_COLS} FROM wv_civilizational_contributions ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_civilizational_contributions ${where}`,
      params, opts,
    );
  }

  findContributionById(id: string): Promise<WvCivilizationalContribution | null> {
    return queryOne<WvCivilizationalContribution>(
      this.db, `SELECT ${CC_COLS} FROM wv_civilizational_contributions WHERE id = ?`, [id],
    );
  }

  async createContribution(input: CivilizationalContributionCreate): Promise<WvCivilizationalContribution> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_civilizational_contributions
         (id, slug, title, tradition_id, domain_id, contrib_type, period_id,
          location_id, description_md, significance_md, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.domain_id ?? null, input.contrib_type,
       input.period_id ?? null, input.location_id ?? null,
       input.description_md ?? null, input.significance_md ?? null,
       input.meta_json ?? null, now, now],
    );
    return (await this.findContributionById(id))!;
  }

  async patchContribution(id: string, patch: Partial<CivilizationalContributionCreate>): Promise<WvCivilizationalContribution | null> {
    const { setClauses, values } = buildPatch({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>);
    if (!setClauses) return this.findContributionById(id);
    await execute(this.db, `UPDATE wv_civilizational_contributions SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findContributionById(id);
  }

  contributionEvidenceLinks(contribId: string): Promise<WvContributionEvidenceLink[]> {
    return query<WvContributionEvidenceLink>(
      this.db,
      `SELECT ${CEL_COLS} FROM wv_contribution_evidence_links WHERE contrib_id = ?`,
      [contribId],
    );
  }

  async addContributionEvidenceLink(input: ContributionEvidenceLinkCreate): Promise<WvContributionEvidenceLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_contribution_evidence_links
         (id, contrib_id, evidence_id, link_role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.contrib_id, input.evidence_id, input.link_role,
       input.note ?? null, now],
    );
    return (await queryOne<WvContributionEvidenceLink>(
      this.db, `SELECT ${CEL_COLS} FROM wv_contribution_evidence_links WHERE id = ?`, [id],
    ))!;
  }

  // ── L5B: Exemplar Cases ────────────────────────────────────────────────────

  exemplarCases(traditionId: string | null, caseType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    if (caseType)    { conds.push('case_type = ?');    params.push(caseType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvExemplarCase>(
      this.db,
      `SELECT ${EC_COLS} FROM wv_exemplar_cases ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_exemplar_cases ${where}`,
      params, opts,
    );
  }

  findExemplarCaseById(id: string): Promise<WvExemplarCase | null> {
    return queryOne<WvExemplarCase>(
      this.db, `SELECT ${EC_COLS} FROM wv_exemplar_cases WHERE id = ?`, [id],
    );
  }

  async createExemplarCase(input: ExemplarCaseCreate): Promise<WvExemplarCase> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_exemplar_cases
         (id, slug, title, tradition_id, moral_axis_id, case_type, narrative_text,
          moral_lesson, qr_scope_ref, period_id, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.moral_axis_id ?? null, input.case_type,
       input.narrative_text ?? null, input.moral_lesson ?? null,
       input.qr_scope_ref ?? null, input.period_id ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findExemplarCaseById(id))!;
  }

  async patchExemplarCase(id: string, patch: Partial<ExemplarCaseCreate>): Promise<WvExemplarCase | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findExemplarCaseById(id);
    await execute(this.db, `UPDATE wv_exemplar_cases SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findExemplarCaseById(id);
  }

  caseScopeLinks(caseId: string): Promise<WvCaseScopeLink[]> {
    return query<WvCaseScopeLink>(
      this.db,
      `SELECT ${CSL_COLS} FROM wv_case_scope_links WHERE case_id = ? ORDER BY scope_type`,
      [caseId],
    );
  }

  async addCaseScopeLink(input: CaseScopeLinkCreate): Promise<WvCaseScopeLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_case_scope_links (id, case_id, scope_type, scope_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.case_id, input.scope_type, input.scope_id, input.note ?? null, now],
    );
    return (await queryOne<WvCaseScopeLink>(
      this.db, `SELECT ${CSL_COLS} FROM wv_case_scope_links WHERE id = ?`, [id],
    ))!;
  }

  // ── L5B: Moral Case Patterns ───────────────────────────────────────────────

  moralCasePatterns(opts: PaginateOptions = {}) {
    return paginate<WvMoralCasePattern>(
      this.db,
      `SELECT ${MCP_COLS} FROM wv_moral_case_patterns ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_moral_case_patterns`,
      [], opts,
    );
  }

  findMoralCasePatternById(id: string): Promise<WvMoralCasePattern | null> {
    return queryOne<WvMoralCasePattern>(
      this.db, `SELECT ${MCP_COLS} FROM wv_moral_case_patterns WHERE id = ?`, [id],
    );
  }

  async createMoralCasePattern(input: MoralCasePatternCreate): Promise<WvMoralCasePattern> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_moral_case_patterns
         (id, slug, title, pattern_type, description_md, traditions_using, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.pattern_type,
       input.description_md ?? null, input.traditions_using ?? null, now],
    );
    return (await this.findMoralCasePatternById(id))!;
  }

  async patchMoralCasePattern(id: string, patch: Partial<MoralCasePatternCreate>): Promise<WvMoralCasePattern | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findMoralCasePatternById(id);
    await execute(this.db, `UPDATE wv_moral_case_patterns SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findMoralCasePatternById(id);
  }

  // ── L5B: Household Models ──────────────────────────────────────────────────

  householdModels(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvHouseholdModel>(
      this.db,
      `SELECT ${HM_COLS} FROM wv_household_models ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_household_models ${where}`,
      params, opts,
    );
  }

  findHouseholdModelById(id: string): Promise<WvHouseholdModel | null> {
    return queryOne<WvHouseholdModel>(
      this.db, `SELECT ${HM_COLS} FROM wv_household_models WHERE id = ?`, [id],
    );
  }

  async createHouseholdModel(input: HouseholdModelCreate): Promise<WvHouseholdModel> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_household_models
         (id, slug, title, tradition_id, period_id, authority_structure, formation_methods, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.period_id ?? null, input.authority_structure ?? null,
       input.formation_methods ?? null, input.description_md ?? null, now],
    );
    return (await this.findHouseholdModelById(id))!;
  }

  async patchHouseholdModel(id: string, patch: Partial<HouseholdModelCreate>): Promise<WvHouseholdModel | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findHouseholdModelById(id);
    await execute(this.db, `UPDATE wv_household_models SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findHouseholdModelById(id);
  }

  // ── L5B: Charity Infrastructures ──────────────────────────────────────────

  charityInfrastructures(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvCharityInfrastructure>(
      this.db,
      `SELECT ${CI_COLS} FROM wv_charity_infrastructures ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_charity_infrastructures ${where}`,
      params, opts,
    );
  }

  findCharityInfrastructureById(id: string): Promise<WvCharityInfrastructure | null> {
    return queryOne<WvCharityInfrastructure>(
      this.db, `SELECT ${CI_COLS} FROM wv_charity_infrastructures WHERE id = ?`, [id],
    );
  }

  async createCharityInfrastructure(input: CharityInfrastructureCreate): Promise<WvCharityInfrastructure> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_charity_infrastructures
         (id, slug, title, tradition_id, infra_type, period_id, location_id, institution_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.tradition_id ?? null,
       input.infra_type, input.period_id ?? null,
       input.location_id ?? null, input.institution_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findCharityInfrastructureById(id))!;
  }

  async patchCharityInfrastructure(id: string, patch: Partial<CharityInfrastructureCreate>): Promise<WvCharityInfrastructure | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findCharityInfrastructureById(id);
    await execute(this.db, `UPDATE wv_charity_infrastructures SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findCharityInfrastructureById(id);
  }

  // ── L5B: Memory Traditions ─────────────────────────────────────────────────

  memoryTraditions(caseId: string | null, traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (caseId)      { conds.push('case_id = ?');      params.push(caseId); }
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMemoryTradition>(
      this.db,
      `SELECT ${MT_COLS} FROM wv_memory_traditions ${where} ORDER BY memory_type`,
      `SELECT COUNT(*) AS count FROM wv_memory_traditions ${where}`,
      params, opts,
    );
  }

  findMemoryTraditionById(id: string): Promise<WvMemoryTradition | null> {
    return queryOne<WvMemoryTradition>(
      this.db, `SELECT ${MT_COLS} FROM wv_memory_traditions WHERE id = ?`, [id],
    );
  }

  async createMemoryTradition(input: MemoryTraditionCreate): Promise<WvMemoryTradition> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_memory_traditions
         (id, case_id, tradition_id, memory_type, description_md, vehicle, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.case_id ?? null, input.tradition_id ?? null,
       input.memory_type, input.description_md ?? null,
       input.vehicle ?? null, now],
    );
    return (await this.findMemoryTraditionById(id))!;
  }

  async patchMemoryTradition(id: string, patch: Partial<MemoryTraditionCreate>): Promise<WvMemoryTradition | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findMemoryTraditionById(id);
    await execute(this.db, `UPDATE wv_memory_traditions SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findMemoryTraditionById(id);
  }
}
