// ─── Map schemas & types ───────────────────────────────────────────────

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

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateMapLayerCreate(body: unknown): SchemaValidationResult<MapLayerCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MapLayerCreate };
}

export function validateMapFeatureCreate(body: unknown): SchemaValidationResult<MapFeatureCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as MapFeatureCreate };
}

export function validateRouteSegmentCreate(body: unknown): SchemaValidationResult<RouteSegmentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as RouteSegmentCreate };
}

export function validateLocationRoleLinkCreate(body: unknown): SchemaValidationResult<LocationRoleLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as LocationRoleLinkCreate };
}

export function validateGeoTimelineLinkCreate(body: unknown): SchemaValidationResult<GeoTimelineLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as GeoTimelineLinkCreate };
}

export function validateCenturyProfileCreate(body: unknown): SchemaValidationResult<CenturyProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as CenturyProfileCreate };
}

export function validateTransitionSequenceCreate(body: unknown): SchemaValidationResult<TransitionSequenceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as TransitionSequenceCreate };
}

export function validateThinkerPeriodLinkCreate(body: unknown): SchemaValidationResult<ThinkerPeriodLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ThinkerPeriodLinkCreate };
}

export function validateGeoculturalZoneCreate(body: unknown): SchemaValidationResult<GeoculturalZoneCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as GeoculturalZoneCreate };
}

export function validateRouteLayerCreate(body: unknown): SchemaValidationResult<RouteLayerCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as RouteLayerCreate };
}

export function validateRouteFeatureCreate(body: unknown): SchemaValidationResult<RouteFeatureCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as RouteFeatureCreate };
}

export function validateExpansionMapCreate(body: unknown): SchemaValidationResult<ExpansionMapCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as ExpansionMapCreate };
}

export function validateTimelineEventCreate(body: unknown): SchemaValidationResult<TimelineEventCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as TimelineEventCreate };
}
