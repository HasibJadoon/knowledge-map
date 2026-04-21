// ─── MapRepo — L6 + L6C tables ────────────────────────────────────────────────
// L6:  wv_map_layers, wv_map_features, wv_route_segments,
//      wv_location_role_links, wv_geo_timeline_links
// L6C: wv_century_profiles, wv_transition_sequences, wv_thinker_period_links,
//      wv_geocultural_zones, wv_route_layers, wv_route_features,
//      wv_expansion_maps, wv_timeline_events

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ─── L6 interfaces ─────────────────────────────────────────────────────────────

export interface WvMapLayer {
  id: string;
  slug: string;
  title: string;
  layer_type: string;
  tradition_id: string | null;
  period_id: string | null;
  description_md: string | null;
  renderer_hint: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvMapFeature {
  id: string;
  map_layer_id: string;
  feature_type: string;
  title: string | null;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  geometry_json: string | null;
  linked_entity: string | null;
  period_label: string | null;
  label: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvRouteSegment {
  id: string;
  map_layer_id: string | null;
  title: string | null;
  route_type: string;
  from_location_id: string | null;
  to_location_id: string | null;
  waypoints_json: string | null;
  period_label: string | null;
  tradition_id: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvLocationRoleLink {
  id: string;
  location_id: string;
  role: string;
  tradition_id: string | null;
  period_id: string | null;
  institution_id: string | null;
  note: string | null;
  created_at: string;
}

export interface WvGeoTimelineLink {
  id: string;
  location_id: string;
  entity_type: string;
  entity_id: string;
  role: string | null;
  note: string | null;
  created_at: string;
}

// ─── L6C interfaces ────────────────────────────────────────────────────────────

export interface WvCenturyProfile {
  id: string;
  century: number;
  label: string;
  dominant_transitions: string | null;
  dominant_crises: string | null;
  key_regions: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvTransitionSequence {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  from_regime: string | null;
  to_regime: string | null;
  century_from: number | null;
  century_to: number | null;
  steps_json: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvThinkerPeriodLink {
  id: string;
  person_id: string;
  century_profile_id: string | null;
  period_id: string | null;
  transition_id: string | null;
  role: string | null;
  note: string | null;
  created_at: string;
}

export interface WvGeoculturalZone {
  id: string;
  slug: string;
  title: string;
  zone_type: string;
  parent_region_id: string | null;
  period_range: string | null;
  description_md: string | null;
  bounding_json: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvRouteLayer {
  id: string;
  slug: string;
  title: string;
  route_category: string;
  period_range: string | null;
  tradition_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvRouteFeature {
  id: string;
  route_layer_id: string;
  feature_type: string;
  title: string | null;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  sequence_order: number | null;
  note: string | null;
  created_at: string;
}

export interface WvExpansionMap {
  id: string;
  slug: string;
  title: string;
  map_type: string;
  tradition_id: string | null;
  colonial_project_id: string | null;
  period_range: string | null;
  description_md: string | null;
  map_features_json: string | null;
  created_at: string;
}

export interface WvTimelineEvent {
  id: string;
  title: string;
  event_type: string;
  year_exact: number | null;
  year_start: number | null;
  year_end: number | null;
  is_approximate: number;
  century: number | null;
  location_id: string | null;
  tradition_id: string | null;
  person_id: string | null;
  wv_event_id: string | null;
  description_md: string | null;
  significance: string | null;
  meta_json: string | null;
  created_at: string;
}

// ─── Create input types ────────────────────────────────────────────────────────

export type MapLayerCreate = Omit<WvMapLayer, 'id' | 'created_at'>;
export type MapFeatureCreate = Omit<WvMapFeature, 'id' | 'created_at'>;
export type RouteSegmentCreate = Omit<WvRouteSegment, 'id' | 'created_at'>;
export type LocationRoleLinkCreate = Omit<WvLocationRoleLink, 'id' | 'created_at'>;
export type GeoTimelineLinkCreate = Omit<WvGeoTimelineLink, 'id' | 'created_at'>;
export type CenturyProfileCreate = Omit<WvCenturyProfile, 'id' | 'created_at'>;
export type TransitionSequenceCreate = Omit<WvTransitionSequence, 'id' | 'created_at'>;
export type ThinkerPeriodLinkCreate = Omit<WvThinkerPeriodLink, 'id' | 'created_at'>;
export type GeoculturalZoneCreate = Omit<WvGeoculturalZone, 'id' | 'created_at'>;
export type RouteLayerCreate = Omit<WvRouteLayer, 'id' | 'created_at'>;
export type RouteFeatureCreate = Omit<WvRouteFeature, 'id' | 'created_at'>;
export type ExpansionMapCreate = Omit<WvExpansionMap, 'id' | 'created_at'>;
export type TimelineEventCreate = Omit<WvTimelineEvent, 'id' | 'created_at'>;

// ─── Column lists ──────────────────────────────────────────────────────────────

const ML_COLS  = `id, slug, title, layer_type, tradition_id, period_id, description_md, renderer_hint, meta_json, created_at`;
const MF_COLS  = `id, map_layer_id, feature_type, title, location_id, latitude, longitude, geometry_json, linked_entity, period_label, label, meta_json, created_at`;
const RS_COLS  = `id, map_layer_id, title, route_type, from_location_id, to_location_id, waypoints_json, period_label, tradition_id, description_md, meta_json, created_at`;
const LRL_COLS = `id, location_id, role, tradition_id, period_id, institution_id, note, created_at`;
const GTL_COLS = `id, location_id, entity_type, entity_id, role, note, created_at`;

const CP_COLS  = `id, century, label, dominant_transitions, dominant_crises, key_regions, description_md, created_at`;
const TS_COLS  = `id, slug, title, description_md, from_regime, to_regime, century_from, century_to, steps_json, meta_json, created_at`;
const TPL_COLS = `id, person_id, century_profile_id, period_id, transition_id, role, note, created_at`;
const GZ_COLS  = `id, slug, title, zone_type, parent_region_id, period_range, description_md, bounding_json, meta_json, created_at`;
const RL_COLS  = `id, slug, title, route_category, period_range, tradition_id, description_md, created_at`;
const RF_COLS  = `id, route_layer_id, feature_type, title, location_id, latitude, longitude, sequence_order, note, created_at`;
const EM_COLS  = `id, slug, title, map_type, tradition_id, colonial_project_id, period_range, description_md, map_features_json, created_at`;
const TE_COLS  = `id, title, event_type, year_exact, year_start, year_end, is_approximate, century, location_id, tradition_id, person_id, wv_event_id, description_md, significance, meta_json, created_at`;

// ─── Patch helper ──────────────────────────────────────────────────────────────

function buildPatch(patch: Record<string, unknown>): { setClauses: string; values: unknown[] } {
  const keys = Object.keys(patch).filter(k => patch[k] !== undefined);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k] ?? null);
  return { setClauses, values };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MapRepo
// ═══════════════════════════════════════════════════════════════════════════════

export class MapRepo {
  constructor(private db: D1Database) {}

  // ── L6: Map Layers ─────────────────────────────────────────────────────────

  layers(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvMapLayer>(
      this.db,
      `SELECT ${ML_COLS} FROM wv_map_layers ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_map_layers ${where}`,
      params, opts,
    );
  }

  findLayerById(id: string): Promise<WvMapLayer | null> {
    return queryOne<WvMapLayer>(
      this.db, `SELECT ${ML_COLS} FROM wv_map_layers WHERE id = ?`, [id],
    );
  }

  async createLayer(input: MapLayerCreate): Promise<WvMapLayer> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_map_layers
         (id, slug, title, layer_type, tradition_id, period_id,
          description_md, renderer_hint, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.layer_type,
       input.tradition_id ?? null, input.period_id ?? null,
       input.description_md ?? null, input.renderer_hint ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findLayerById(id))!;
  }

  async patchLayer(id: string, patch: Partial<MapLayerCreate>): Promise<WvMapLayer | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findLayerById(id);
    await execute(this.db, `UPDATE wv_map_layers SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findLayerById(id);
  }

  // ── L6: Map Features ───────────────────────────────────────────────────────

  features(layerId: string, opts: PaginateOptions = {}) {
    return paginate<WvMapFeature>(
      this.db,
      `SELECT ${MF_COLS} FROM wv_map_features WHERE map_layer_id = ? ORDER BY label`,
      `SELECT COUNT(*) AS count FROM wv_map_features WHERE map_layer_id = ?`,
      [layerId, layerId], opts,
    );
  }

  findFeatureById(id: string): Promise<WvMapFeature | null> {
    return queryOne<WvMapFeature>(
      this.db, `SELECT ${MF_COLS} FROM wv_map_features WHERE id = ?`, [id],
    );
  }

  async createFeature(input: MapFeatureCreate): Promise<WvMapFeature> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_map_features
         (id, map_layer_id, feature_type, title, location_id, latitude, longitude,
          geometry_json, linked_entity, period_label, label, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.map_layer_id, input.feature_type, input.title ?? null,
       input.location_id ?? null, input.latitude ?? null, input.longitude ?? null,
       input.geometry_json ?? null, input.linked_entity ?? null,
       input.period_label ?? null, input.label ?? null, input.meta_json ?? null, now],
    );
    return (await this.findFeatureById(id))!;
  }

  async patchFeature(id: string, patch: Partial<MapFeatureCreate>): Promise<WvMapFeature | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findFeatureById(id);
    await execute(this.db, `UPDATE wv_map_features SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findFeatureById(id);
  }

  // ── L6: Route Segments ─────────────────────────────────────────────────────

  routes(layerId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (layerId) { conds.push('map_layer_id = ?'); params.push(layerId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvRouteSegment>(
      this.db,
      `SELECT ${RS_COLS} FROM wv_route_segments ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_route_segments ${where}`,
      params, opts,
    );
  }

  findRouteById(id: string): Promise<WvRouteSegment | null> {
    return queryOne<WvRouteSegment>(
      this.db, `SELECT ${RS_COLS} FROM wv_route_segments WHERE id = ?`, [id],
    );
  }

  async createRoute(input: RouteSegmentCreate): Promise<WvRouteSegment> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_route_segments
         (id, map_layer_id, title, route_type, from_location_id, to_location_id,
          waypoints_json, period_label, tradition_id, description_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.map_layer_id ?? null, input.title ?? null, input.route_type,
       input.from_location_id ?? null, input.to_location_id ?? null,
       input.waypoints_json ?? null, input.period_label ?? null,
       input.tradition_id ?? null, input.description_md ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findRouteById(id))!;
  }

  async patchRoute(id: string, patch: Partial<RouteSegmentCreate>): Promise<WvRouteSegment | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findRouteById(id);
    await execute(this.db, `UPDATE wv_route_segments SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findRouteById(id);
  }

  // ── L6: Location Role Links ────────────────────────────────────────────────

  locationRoleLinks(locationId: string): Promise<WvLocationRoleLink[]> {
    return query<WvLocationRoleLink>(
      this.db,
      `SELECT ${LRL_COLS} FROM wv_location_role_links WHERE location_id = ? ORDER BY role`,
      [locationId],
    );
  }

  async addLocationRoleLink(input: LocationRoleLinkCreate): Promise<WvLocationRoleLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_location_role_links
         (id, location_id, role, tradition_id, period_id, institution_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.location_id, input.role, input.tradition_id ?? null,
       input.period_id ?? null, input.institution_id ?? null,
       input.note ?? null, now],
    );
    return (await queryOne<WvLocationRoleLink>(
      this.db, `SELECT ${LRL_COLS} FROM wv_location_role_links WHERE id = ?`, [id],
    ))!;
  }

  // ── L6: Geo Timeline Links ─────────────────────────────────────────────────

  geoTimelineLinks(locationId: string): Promise<WvGeoTimelineLink[]> {
    return query<WvGeoTimelineLink>(
      this.db,
      `SELECT ${GTL_COLS} FROM wv_geo_timeline_links WHERE location_id = ? ORDER BY entity_type`,
      [locationId],
    );
  }

  async addGeoTimelineLink(input: GeoTimelineLinkCreate): Promise<WvGeoTimelineLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_geo_timeline_links
         (id, location_id, entity_type, entity_id, role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.location_id, input.entity_type, input.entity_id,
       input.role ?? null, input.note ?? null, now],
    );
    return (await queryOne<WvGeoTimelineLink>(
      this.db, `SELECT ${GTL_COLS} FROM wv_geo_timeline_links WHERE id = ?`, [id],
    ))!;
  }

  // ── L6C: Century Profiles ──────────────────────────────────────────────────

  centuryProfiles(opts: PaginateOptions = {}) {
    return paginate<WvCenturyProfile>(
      this.db,
      `SELECT ${CP_COLS} FROM wv_century_profiles ORDER BY century`,
      `SELECT COUNT(*) AS count FROM wv_century_profiles`,
      [], opts,
    );
  }

  findCenturyProfileByCentury(century: number): Promise<WvCenturyProfile | null> {
    return queryOne<WvCenturyProfile>(
      this.db, `SELECT ${CP_COLS} FROM wv_century_profiles WHERE century = ?`, [century],
    );
  }

  findCenturyProfileById(id: string): Promise<WvCenturyProfile | null> {
    return queryOne<WvCenturyProfile>(
      this.db, `SELECT ${CP_COLS} FROM wv_century_profiles WHERE id = ?`, [id],
    );
  }

  async createCentury(input: CenturyProfileCreate): Promise<WvCenturyProfile> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_century_profiles
         (id, century, label, dominant_transitions, dominant_crises, key_regions, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.century, input.label, input.dominant_transitions ?? null,
       input.dominant_crises ?? null, input.key_regions ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findCenturyProfileById(id))!;
  }

  async patchCentury(id: string, patch: Partial<CenturyProfileCreate>): Promise<WvCenturyProfile | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findCenturyProfileById(id);
    await execute(this.db, `UPDATE wv_century_profiles SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findCenturyProfileById(id);
  }

  // ── L6C: Transition Sequences ──────────────────────────────────────────────

  transitionSequences(opts: PaginateOptions = {}) {
    return paginate<WvTransitionSequence>(
      this.db,
      `SELECT ${TS_COLS} FROM wv_transition_sequences ORDER BY century_from`,
      `SELECT COUNT(*) AS count FROM wv_transition_sequences`,
      [], opts,
    );
  }

  findTransitionSequenceById(id: string): Promise<WvTransitionSequence | null> {
    return queryOne<WvTransitionSequence>(
      this.db, `SELECT ${TS_COLS} FROM wv_transition_sequences WHERE id = ?`, [id],
    );
  }

  async createTransitionSequence(input: TransitionSequenceCreate): Promise<WvTransitionSequence> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_transition_sequences
         (id, slug, title, description_md, from_regime, to_regime,
          century_from, century_to, steps_json, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.description_md ?? null,
       input.from_regime ?? null, input.to_regime ?? null,
       input.century_from ?? null, input.century_to ?? null,
       input.steps_json ?? null, input.meta_json ?? null, now],
    );
    return (await this.findTransitionSequenceById(id))!;
  }

  async patchTransitionSequence(id: string, patch: Partial<TransitionSequenceCreate>): Promise<WvTransitionSequence | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findTransitionSequenceById(id);
    await execute(this.db, `UPDATE wv_transition_sequences SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findTransitionSequenceById(id);
  }

  // ── L6C: Thinker Period Links ──────────────────────────────────────────────

  thinkerPeriodLinks(personId: string): Promise<WvThinkerPeriodLink[]> {
    return query<WvThinkerPeriodLink>(
      this.db,
      `SELECT ${TPL_COLS} FROM wv_thinker_period_links WHERE person_id = ? ORDER BY century_profile_id`,
      [personId],
    );
  }

  async addThinkerPeriodLink(input: ThinkerPeriodLinkCreate): Promise<WvThinkerPeriodLink> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_thinker_period_links
         (id, person_id, century_profile_id, period_id, transition_id, role, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.person_id, input.century_profile_id ?? null,
       input.period_id ?? null, input.transition_id ?? null,
       input.role ?? null, input.note ?? null, now],
    );
    return (await queryOne<WvThinkerPeriodLink>(
      this.db, `SELECT ${TPL_COLS} FROM wv_thinker_period_links WHERE id = ?`, [id],
    ))!;
  }

  // ── L6C: Geocultural Zones ─────────────────────────────────────────────────

  geoculturalZones(zoneType: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (zoneType) { conds.push('zone_type = ?'); params.push(zoneType); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvGeoculturalZone>(
      this.db,
      `SELECT ${GZ_COLS} FROM wv_geocultural_zones ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_geocultural_zones ${where}`,
      params, opts,
    );
  }

  findGeoculturalZoneById(id: string): Promise<WvGeoculturalZone | null> {
    return queryOne<WvGeoculturalZone>(
      this.db, `SELECT ${GZ_COLS} FROM wv_geocultural_zones WHERE id = ?`, [id],
    );
  }

  async createZone(input: GeoculturalZoneCreate): Promise<WvGeoculturalZone> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_geocultural_zones
         (id, slug, title, zone_type, parent_region_id, period_range,
          description_md, bounding_json, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.zone_type,
       input.parent_region_id ?? null, input.period_range ?? null,
       input.description_md ?? null, input.bounding_json ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findGeoculturalZoneById(id))!;
  }

  async patchZone(id: string, patch: Partial<GeoculturalZoneCreate>): Promise<WvGeoculturalZone | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findGeoculturalZoneById(id);
    await execute(this.db, `UPDATE wv_geocultural_zones SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findGeoculturalZoneById(id);
  }

  // ── L6C: Route Layers ──────────────────────────────────────────────────────

  routeLayers(routeCategory: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (routeCategory) { conds.push('route_category = ?'); params.push(routeCategory); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvRouteLayer>(
      this.db,
      `SELECT ${RL_COLS} FROM wv_route_layers ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_route_layers ${where}`,
      params, opts,
    );
  }

  findRouteLayerById(id: string): Promise<WvRouteLayer | null> {
    return queryOne<WvRouteLayer>(
      this.db, `SELECT ${RL_COLS} FROM wv_route_layers WHERE id = ?`, [id],
    );
  }

  async createRouteLayer(input: RouteLayerCreate): Promise<WvRouteLayer> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_route_layers
         (id, slug, title, route_category, period_range, tradition_id, description_md, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.route_category,
       input.period_range ?? null, input.tradition_id ?? null,
       input.description_md ?? null, now],
    );
    return (await this.findRouteLayerById(id))!;
  }

  async patchRouteLayer(id: string, patch: Partial<RouteLayerCreate>): Promise<WvRouteLayer | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findRouteLayerById(id);
    await execute(this.db, `UPDATE wv_route_layers SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findRouteLayerById(id);
  }

  // ── L6C: Route Features ────────────────────────────────────────────────────

  routeFeatures(routeLayerId: string, opts: PaginateOptions = {}) {
    return paginate<WvRouteFeature>(
      this.db,
      `SELECT ${RF_COLS} FROM wv_route_features WHERE route_layer_id = ? ORDER BY sequence_order`,
      `SELECT COUNT(*) AS count FROM wv_route_features WHERE route_layer_id = ?`,
      [routeLayerId, routeLayerId], opts,
    );
  }

  findRouteFeatureById(id: string): Promise<WvRouteFeature | null> {
    return queryOne<WvRouteFeature>(
      this.db, `SELECT ${RF_COLS} FROM wv_route_features WHERE id = ?`, [id],
    );
  }

  async createRouteFeature(input: RouteFeatureCreate): Promise<WvRouteFeature> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_route_features
         (id, route_layer_id, feature_type, title, location_id, latitude,
          longitude, sequence_order, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.route_layer_id, input.feature_type, input.title ?? null,
       input.location_id ?? null, input.latitude ?? null, input.longitude ?? null,
       input.sequence_order ?? null, input.note ?? null, now],
    );
    return (await this.findRouteFeatureById(id))!;
  }

  // ── L6C: Expansion Maps ────────────────────────────────────────────────────

  expansionMaps(traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvExpansionMap>(
      this.db,
      `SELECT ${EM_COLS} FROM wv_expansion_maps ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_expansion_maps ${where}`,
      params, opts,
    );
  }

  findExpansionMapById(id: string): Promise<WvExpansionMap | null> {
    return queryOne<WvExpansionMap>(
      this.db, `SELECT ${EM_COLS} FROM wv_expansion_maps WHERE id = ?`, [id],
    );
  }

  async createExpansionMap(input: ExpansionMapCreate): Promise<WvExpansionMap> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_expansion_maps
         (id, slug, title, map_type, tradition_id, colonial_project_id,
          period_range, description_md, map_features_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.title, input.map_type,
       input.tradition_id ?? null, input.colonial_project_id ?? null,
       input.period_range ?? null, input.description_md ?? null,
       input.map_features_json ?? null, now],
    );
    return (await this.findExpansionMapById(id))!;
  }

  async patchExpansionMap(id: string, patch: Partial<ExpansionMapCreate>): Promise<WvExpansionMap | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findExpansionMapById(id);
    await execute(this.db, `UPDATE wv_expansion_maps SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findExpansionMapById(id);
  }

  // ── L6C: Timeline Events ───────────────────────────────────────────────────

  timelineEvents(century: number | null, traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (century)     { conds.push('century = ?');      params.push(century); }
    if (traditionId) { conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvTimelineEvent>(
      this.db,
      `SELECT ${TE_COLS} FROM wv_timeline_events ${where} ORDER BY year_exact, year_start`,
      `SELECT COUNT(*) AS count FROM wv_timeline_events ${where}`,
      params, opts,
    );
  }

  findTimelineEventById(id: string): Promise<WvTimelineEvent | null> {
    return queryOne<WvTimelineEvent>(
      this.db, `SELECT ${TE_COLS} FROM wv_timeline_events WHERE id = ?`, [id],
    );
  }

  async createTimelineEvent(input: TimelineEventCreate): Promise<WvTimelineEvent> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(this.db,
      `INSERT INTO wv_timeline_events
         (id, title, event_type, year_exact, year_start, year_end, is_approximate,
          century, location_id, tradition_id, person_id, wv_event_id,
          description_md, significance, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.title, input.event_type,
       input.year_exact ?? null, input.year_start ?? null, input.year_end ?? null,
       input.is_approximate ?? 0, input.century ?? null,
       input.location_id ?? null, input.tradition_id ?? null,
       input.person_id ?? null, input.wv_event_id ?? null,
       input.description_md ?? null, input.significance ?? null,
       input.meta_json ?? null, now],
    );
    return (await this.findTimelineEventById(id))!;
  }

  async patchTimelineEvent(id: string, patch: Partial<TimelineEventCreate>): Promise<WvTimelineEvent | null> {
    const { setClauses, values } = buildPatch(patch as Record<string, unknown>);
    if (!setClauses) return this.findTimelineEventById(id);
    await execute(this.db, `UPDATE wv_timeline_events SET ${setClauses} WHERE id = ?`, [...values, id]);
    return this.findTimelineEventById(id);
  }
}
