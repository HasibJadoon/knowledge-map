-- Schema for km_worldview.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

CREATE TABLE wv_abrahamic_morality_matrices (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  axes_json       TEXT NOT NULL,                  
  traditions_json TEXT NOT NULL,                  
  cells_json      TEXT,                           
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_adversarial_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  pattern_type    TEXT NOT NULL DEFAULT 'pride',
    
    
  description_md  TEXT,
  scriptural_refs TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_affiliations (
  id              TEXT PRIMARY KEY,
  entity_ref      TEXT NOT NULL,                  
  entity_type     TEXT NOT NULL,                  
  target_type     TEXT NOT NULL,                  
  target_id       TEXT NOT NULL,
  affil_role      TEXT,                           
  period_label    TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_anthropology_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  human_image_id  TEXT,
  body_view       TEXT,
  soul_view       TEXT,
  desire_view     TEXT,
  sin_view        TEXT,
  vocation_view   TEXT,
  conscience_view TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (human_image_id) REFERENCES wv_human_image_profiles(id)
);

CREATE TABLE wv_argument_relations (
  id             TEXT PRIMARY KEY,
  from_arg_id    TEXT NOT NULL,
  to_arg_id      TEXT,                            
  to_claim_id    TEXT,
  relation_type  TEXT NOT NULL DEFAULT 'supports',
    
    
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_arg_id) REFERENCES wv_arguments(id)
);

CREATE TABLE wv_arguments (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  argument_text   TEXT NOT NULL,
  argument_type   TEXT NOT NULL DEFAULT 'deductive',
    
  topic_id        TEXT,
  tradition_id    TEXT,
  person_id       TEXT,
  school_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (person_id)    REFERENCES wv_people(id)
);

CREATE TABLE wv_authority_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  authority_type  TEXT NOT NULL DEFAULT 'institutional',
    
    
  tradition_id    TEXT,
  stream_id       TEXT,
  description_md  TEXT,
  legitimacy_claim TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (stream_id)    REFERENCES wv_modernity_streams(id)
);

CREATE TABLE wv_brainstorm_sessions (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  topic_id        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
    
  body_md         TEXT,
  tags_json       TEXT,                           
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)      REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE wv_case_scope_links (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL,
  scope_type  TEXT NOT NULL, 
  scope_id    TEXT NOT NULL,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES wv_exemplar_cases(id)
);

CREATE TABLE wv_century_profiles (
  id              TEXT PRIMARY KEY,
  century         INTEGER NOT NULL UNIQUE,        
  label           TEXT NOT NULL,                  
  dominant_transitions TEXT,                      
  dominant_crises TEXT,                           
  key_regions     TEXT,                           
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_charity_infrastructures (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  infra_type      TEXT NOT NULL DEFAULT 'waqf',
    
    
  period_id       TEXT,
  location_id     TEXT,
  institution_id  TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (institution_id) REFERENCES wv_institutions(id)
);

CREATE TABLE wv_civilizational_contributions (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  domain_id       TEXT,
  contrib_type    TEXT NOT NULL DEFAULT 'intellectual',
    
    
  period_id       TEXT,
  location_id     TEXT,
  description_md  TEXT,
  significance_md TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (domain_id)    REFERENCES wv_domains(id),
  FOREIGN KEY (period_id)    REFERENCES wv_periods(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);

CREATE VIRTUAL TABLE wv_civilizational_contributions_fts USING fts5(
  title, description_md, significance_md,
  content='wv_civilizational_contributions', content_rowid='rowid'
);

CREATE TABLE wv_civilizational_crises (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  crisis_type     TEXT NOT NULL DEFAULT 'moral',
    
  stream_id       TEXT,
  period_range    TEXT,
  description_md  TEXT,
  diagnostic_claims TEXT,                         
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_civilizational_matrices (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  streams_json    TEXT,                           
  axes_json       TEXT,                           
  cells_json      TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_claim_evidence_links (
  id            TEXT PRIMARY KEY,
  claim_id      TEXT NOT NULL,
  evidence_id   TEXT NOT NULL,
  link_role     TEXT NOT NULL DEFAULT 'supports',
    
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (claim_id)    REFERENCES wv_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES wv_evidence_items(id),
  UNIQUE (claim_id, evidence_id, link_role)
);

CREATE TABLE wv_claim_types (
  id    TEXT PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_claims (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  claim_text      TEXT NOT NULL,
  claim_type      TEXT NOT NULL DEFAULT 'doctrinal',
    
    
  topic_id        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  person_id       TEXT,
  school_id       TEXT,
  certainty_level TEXT NOT NULL DEFAULT 'position',
    
  status          TEXT NOT NULL DEFAULT 'active',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)      REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (person_id)     REFERENCES wv_people(id),
  FOREIGN KEY (school_id)     REFERENCES wv_schools(id)
);

CREATE VIRTUAL TABLE wv_claims_fts USING fts5(
  title, claim_text, content='wv_claims', content_rowid='rowid'
);

CREATE TABLE wv_cluster_members (
  id            TEXT PRIMARY KEY,
  cluster_id    TEXT NOT NULL,
  entity_type   TEXT NOT NULL, 
  entity_id     TEXT NOT NULL,
  role          TEXT,          
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cluster_id) REFERENCES wv_clusters(id),
  UNIQUE (cluster_id, entity_type, entity_id)
);

CREATE TABLE wv_clusters (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  cluster_type    TEXT NOT NULL DEFAULT 'thematic',
    
  description_md  TEXT,
  tradition_id    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_colonial_methods (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  method_type     TEXT NOT NULL DEFAULT 'extraction',
    
    
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_colonial_projects (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  colonizer       TEXT,
  colonized       TEXT,
  period_id       TEXT,
  region_id       TEXT,
  project_type    TEXT NOT NULL DEFAULT 'territorial',
    
  key_institutions TEXT,                          
  moral_narrative TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (period_id)  REFERENCES wv_periods(id),
  FOREIGN KEY (region_id)  REFERENCES wv_regions(id)
);

CREATE TABLE wv_comparison_axes (
  id              TEXT PRIMARY KEY,
  comparison_id   TEXT NOT NULL,
  moral_axis_id   TEXT,
  axis_label      TEXT NOT NULL,
  axis_description TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (comparison_id) REFERENCES wv_comparisons(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE wv_comparison_cells (
  id              TEXT PRIMARY KEY,
  comparison_id   TEXT NOT NULL,
  row_id          TEXT NOT NULL,
  axis_id         TEXT NOT NULL,
  cell_text       TEXT,
  stance          TEXT,                           
  evidence_ids    TEXT,                           
  tension_note    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (comparison_id) REFERENCES wv_comparisons(id),
  FOREIGN KEY (row_id)        REFERENCES wv_comparison_rows(id),
  FOREIGN KEY (axis_id)       REFERENCES wv_comparison_axes(id),
  UNIQUE (row_id, axis_id)
);

CREATE TABLE wv_comparison_rows (
  id              TEXT PRIMARY KEY,
  comparison_id   TEXT NOT NULL,
  entity_type     TEXT NOT NULL,  
  entity_id       TEXT NOT NULL,
  row_label       TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (comparison_id) REFERENCES wv_comparisons(id)
);

CREATE TABLE wv_comparison_templates (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  axes_json       TEXT NOT NULL,                  
  row_types       TEXT NOT NULL,                  
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_comparisons (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  comparison_type TEXT NOT NULL DEFAULT 'tradition',
    
  description_md  TEXT,
  template_id     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE wv_comparisons_fts USING fts5(
  title, description_md, content='wv_comparisons', content_rowid='rowid'
);

CREATE TABLE wv_contribution_evidence_links (
  id              TEXT PRIMARY KEY,
  contrib_id      TEXT NOT NULL,
  evidence_id     TEXT NOT NULL,
  link_role       TEXT NOT NULL DEFAULT 'supports',
    
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contrib_id)  REFERENCES wv_civilizational_contributions(id),
  FOREIGN KEY (evidence_id) REFERENCES wv_evidence_items(id)
);

CREATE TABLE wv_corpus_units (
  id              TEXT PRIMARY KEY,
  corpus_id       TEXT NOT NULL,
  parent_id       TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'chapter',
    
  title           TEXT,
  unit_index      INTEGER,
  start_ref       TEXT,
  end_ref         TEXT,
  text_excerpt    TEXT,
  description_md  TEXT,
  qr_scope_ref    TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (corpus_id) REFERENCES wv_scriptural_corpora(id),
  FOREIGN KEY (parent_id) REFERENCES wv_corpus_units(id)
);

CREATE TABLE wv_counterfeit_redemption_claims (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  claim_text      TEXT NOT NULL,
  stream_id       TEXT,
  project_type    TEXT NOT NULL DEFAULT 'revolutionary',
    
  redemption_promise TEXT,
  displacement_mechanism TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

CREATE TABLE wv_covenant_frameworks (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  parties         TEXT,                           
  covenant_type   TEXT NOT NULL DEFAULT 'bilateral',
    
  key_sign        TEXT,
  key_obligation  TEXT,
  memory_practice TEXT,
  renewal_pattern TEXT,
  description_md  TEXT,
  corpus_refs     TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_debate_cluster_members (
  id          TEXT PRIMARY KEY,
  cluster_id  TEXT NOT NULL,
  entity_type TEXT NOT NULL, 
  entity_id   TEXT NOT NULL,
  stance      TEXT,          
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cluster_id) REFERENCES wv_debate_clusters(id)
);

CREATE TABLE wv_debate_clusters (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  topic_id        TEXT,
  moral_axis_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE wv_deception_signatures (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  signature_type  TEXT NOT NULL DEFAULT 'doctrinal',
    
  description_md  TEXT,
  warning_signs   TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_diagram_instances (
  id              TEXT PRIMARY KEY,
  spec_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  render_data     TEXT,                           
  thumbnail_url   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (spec_id) REFERENCES wv_diagram_specs(id)
);

CREATE TABLE wv_diagram_specs (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  diagram_type    TEXT NOT NULL DEFAULT 'graph',
    
    
  scope_rule      TEXT,                           
  selection_json  TEXT,                           
  layout_rule     TEXT,
  renderer_hint   TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_discernment_diagram_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT NOT NULL,
  adversarial_pattern_ids TEXT,                   
  moral_inversion_ids TEXT,                       
  counterfeit_ids TEXT,                           
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)    REFERENCES wv_traditions(id),
  FOREIGN KEY (diagram_spec_id) REFERENCES wv_diagram_specs(id)
);

CREATE TABLE wv_discernment_rules (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT NOT NULL,
  rule_type       TEXT NOT NULL DEFAULT 'hermeneutic',
    
  rule_text       TEXT NOT NULL,
  scriptural_basis TEXT,                          
  warning_indicators TEXT,                        
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_distill_batches (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  batch_type      TEXT NOT NULL DEFAULT 'manual',
    
  source_id       TEXT,                           
  status          TEXT NOT NULL DEFAULT 'pending',
    
  item_count      INTEGER NOT NULL DEFAULT 0,
  approved_count  INTEGER NOT NULL DEFAULT 0,
  rejected_count  INTEGER NOT NULL DEFAULT 0,
  core_user_ref   TEXT,
  core_ws_ref     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES wv_sources(id)
);

CREATE TABLE wv_distill_items (
  id              TEXT PRIMARY KEY,
  batch_id        TEXT NOT NULL,
  item_type       TEXT NOT NULL DEFAULT 'insight',
    
  source_note_id  TEXT,
  source_highlight_id TEXT,
  content_md      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
    
  approved_as_type TEXT,                          
  approved_as_id   TEXT,                          
  core_user_ref   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id)
);

CREATE TABLE wv_divine_human_relations (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  relation_type   TEXT NOT NULL DEFAULT 'covenantal',
    
  key_qualities   TEXT,                           
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_doc_links (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,
    
    
  entity_id       TEXT NOT NULL,
  cm_doc_ref      TEXT NOT NULL,                  
  link_role       TEXT NOT NULL DEFAULT 'related',
    
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_domains (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  title_ar      TEXT,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_enlightenment_currents (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  stream_id       TEXT,
  key_thinkers    TEXT,                           
  key_texts       TEXT,                           
  period_range    TEXT,
  origin_region   TEXT,
  description_md  TEXT,
  successor_of    TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id)    REFERENCES wv_modernity_streams(id),
  FOREIGN KEY (successor_of) REFERENCES wv_enlightenment_currents(id)
);

CREATE TABLE wv_episode_quran_links (
  id              TEXT PRIMARY KEY,
  episode_id      TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,                  
  link_type       TEXT NOT NULL DEFAULT 'narrates',
    
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES wv_prophetic_episodes(id)
);

CREATE TABLE wv_epistemic_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'rationalist',
    
    
  tradition_id    TEXT,                           
  period_id       TEXT,
  description_md  TEXT,
  key_claims      TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_event_locations (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL,
  location_id TEXT NOT NULL,
  role        TEXT,               
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id)    REFERENCES wv_events(id),
  FOREIGN KEY (location_id) REFERENCES wv_locations(id)
);

CREATE TABLE wv_event_participants (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL,
  entity_type     TEXT NOT NULL,  
  entity_id       TEXT NOT NULL,
  role            TEXT,           
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES wv_events(id)
);

CREATE TABLE wv_event_types (
  id    TEXT PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_events (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  event_type_id   TEXT,
  tradition_id    TEXT,
  period_id       TEXT,
  location_id     TEXT,
  start_year      INTEGER,
  end_year        INTEGER,
  is_approximate  INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  moral_significance TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (period_id)    REFERENCES wv_periods(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);

CREATE VIRTUAL TABLE wv_events_fts USING fts5(
  title, description_md, content='wv_events', content_rowid='rowid'
);

CREATE TABLE wv_evidence_items (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'scriptural',
    
    
  source_id       TEXT,
  source_unit_id  TEXT,
  locator         TEXT,                           
  excerpt         TEXT,
  qr_scope_ref    TEXT,                           
  al_concept_ref  TEXT,                           
  cm_doc_ref      TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)
);

CREATE TABLE wv_evidence_scope_links (
  id              TEXT PRIMARY KEY,
  evidence_id     TEXT NOT NULL,
  scope_module    TEXT NOT NULL, 
  scope_ref       TEXT NOT NULL, 
  link_role       TEXT NOT NULL DEFAULT 'reference',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (evidence_id) REFERENCES wv_evidence_items(id),
  UNIQUE (evidence_id, scope_ref)
);

CREATE TABLE wv_exemplar_case_timelines (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  case_ids_json   TEXT NOT NULL,                  
  tradition_ids   TEXT,                           
  timeline_view_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (timeline_view_id) REFERENCES wv_timeline_views(id)
);

CREATE TABLE wv_exemplar_cases (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  case_type       TEXT NOT NULL DEFAULT 'prophetic_episode',
    
    
  narrative_text  TEXT,
  moral_lesson    TEXT,
  qr_scope_ref    TEXT,
  period_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE wv_expansion_maps (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  map_type        TEXT NOT NULL DEFAULT 'colonial',
    
  tradition_id    TEXT,
  colonial_project_id TEXT,
  period_range    TEXT,
  description_md  TEXT,
  map_features_json TEXT,                         
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)         REFERENCES wv_traditions(id),
  FOREIGN KEY (colonial_project_id)  REFERENCES wv_colonial_projects(id)
);

CREATE TABLE wv_false_transcendence_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  profile_type    TEXT NOT NULL DEFAULT 'political',
    
  stream_id       TEXT,
  description_md  TEXT,
  how_it_mimics   TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

CREATE TABLE wv_geo_timeline_links (
  id            TEXT PRIMARY KEY,
  location_id   TEXT NOT NULL,
  entity_type   TEXT NOT NULL, 
  entity_id     TEXT NOT NULL,
  role          TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES wv_locations(id)
);

CREATE TABLE wv_geocultural_zones (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  zone_type       TEXT NOT NULL DEFAULT 'civilizational',
    
  parent_region_id TEXT,
  period_range    TEXT,
  description_md  TEXT,
  bounding_json   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_region_id) REFERENCES wv_regions(id)
);

CREATE TABLE wv_graph_projections (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  projection_type TEXT NOT NULL DEFAULT 'thematic',
    
  root_entity     TEXT,                           
  filter_json     TEXT,                           
  node_ids_json   TEXT,                           
  edge_ids_json   TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_graph_views (
  id              TEXT PRIMARY KEY,
  projection_id   TEXT NOT NULL,
  title           TEXT NOT NULL,
  layout_type     TEXT NOT NULL DEFAULT 'force',
    
  renderer_hint   TEXT,
  filter_json     TEXT,
  viewport_json   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (projection_id) REFERENCES wv_graph_projections(id)
);

CREATE TABLE wv_highlights (
  id              TEXT PRIMARY KEY,
  source_id       TEXT,
  source_unit_id  TEXT,
  corpus_unit_id  TEXT,
  locator         TEXT,                           
  text_excerpt    TEXT NOT NULL,
  note            TEXT,
  highlight_type  TEXT NOT NULL DEFAULT 'general',
    
  color           TEXT,
  moral_axis_id   TEXT,
  topic_id        TEXT,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  reading_session_id TEXT REFERENCES wv_reading_sessions(id),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  FOREIGN KEY (moral_axis_id)  REFERENCES wv_moral_axes(id),
  FOREIGN KEY (topic_id)       REFERENCES wv_topics(id)
);

CREATE TABLE wv_household_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  period_id       TEXT,
  authority_structure TEXT,
  formation_methods TEXT,                         
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_human_image_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  image_type      TEXT NOT NULL DEFAULT 'covenantal',
    
    
  tradition_id    TEXT,
  stream_id       TEXT,
  description_md  TEXT,
  key_attributes  TEXT,                           
  moral_implications TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (stream_id)    REFERENCES wv_modernity_streams(id)
);

CREATE TABLE wv_identity_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'political',
    
  stream_id       TEXT,
  period_id       TEXT,
  description_md  TEXT,
  key_mechanisms  TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

CREATE TABLE wv_ideology_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  ideology_type   TEXT NOT NULL DEFAULT 'political',
    
  stream_id       TEXT,
  key_claims      TEXT,                           
  key_virtues     TEXT,                           
  key_taboos      TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_image_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'colonial',
    
  colonial_project_id TEXT,
  orientalist_frame_id TEXT,
  description_md  TEXT,
  key_mechanisms  TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (colonial_project_id) REFERENCES wv_colonial_projects(id),
  FOREIGN KEY (orientalist_frame_id) REFERENCES wv_orientalist_frames(id)
);

CREATE TABLE wv_insight_decisions (
  id              TEXT PRIMARY KEY,
  suggestion_id   TEXT NOT NULL,
  decision        TEXT NOT NULL,                  
  original_json   TEXT,                           
  final_json      TEXT,                           
  decision_note   TEXT,
  core_user_ref   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (suggestion_id) REFERENCES wv_insight_suggestions(id)
);

CREATE TABLE wv_insight_suggestions (
  id              TEXT PRIMARY KEY,
  batch_id        TEXT,
  source_chunk_ref TEXT,                          
  suggestion_type TEXT NOT NULL DEFAULT 'node',
    
  payload_json    TEXT NOT NULL,                  
  confidence      REAL,
  model_used      TEXT,
  status          TEXT NOT NULL DEFAULT 'suggested',
    
  target_table    TEXT,                           
  target_id       TEXT,                           
  core_user_ref   TEXT,                           
  reviewed_at     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id)
);

CREATE TABLE wv_institution_profiles (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL,
  moral_role      TEXT,
  civilizational_role TEXT,
  key_functions   TEXT,                           
  notable_periods TEXT,                           
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (institution_id) REFERENCES wv_institutions(id)
);

CREATE TABLE wv_institutions (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  title_ar         TEXT,
  institution_type TEXT NOT NULL DEFAULT 'religious',
    
    
  tradition_id     TEXT,
  location_id      TEXT,
  period_id        TEXT,
  founded_year     INTEGER,
  dissolved_year   INTEGER,
  description_md   TEXT,
  meta_json        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);

CREATE TABLE wv_law_morality_links (
  id              TEXT PRIMARY KEY,
  tradition_id    TEXT,
  law_system      TEXT NOT NULL,
  morality_domain TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'grounds',
    
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_location_role_links (
  id            TEXT PRIMARY KEY,
  location_id   TEXT NOT NULL,
  role          TEXT NOT NULL,
    
    
  tradition_id  TEXT,
  period_id     TEXT,
  institution_id TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id)   REFERENCES wv_locations(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (institution_id) REFERENCES wv_institutions(id)
);

CREATE TABLE wv_locations (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  location_type   TEXT NOT NULL DEFAULT 'city',
    
    
  region_id       TEXT,
  latitude        REAL,
  longitude       REAL,
  modern_name     TEXT,
  modern_country  TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (region_id) REFERENCES wv_regions(id)
);

CREATE TABLE wv_map_features (
  id              TEXT PRIMARY KEY,
  map_layer_id    TEXT NOT NULL,
  feature_type    TEXT NOT NULL DEFAULT 'point',
    
  title           TEXT,
  location_id     TEXT,
  latitude        REAL,
  longitude       REAL,
  geometry_json   TEXT,                           
  linked_entity   TEXT,                           
  period_label    TEXT,
  label           TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (map_layer_id) REFERENCES wv_map_layers(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);

CREATE TABLE wv_map_layers (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  layer_type      TEXT NOT NULL DEFAULT 'prophetic_routes',
    
    
    
  tradition_id    TEXT,
  period_id       TEXT,
  description_md  TEXT,
  renderer_hint   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_media_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'print',
    
  period_id       TEXT,
  description_md  TEXT,
  key_characteristics TEXT,                       
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_memory_rewrites (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  rewrite_type    TEXT NOT NULL DEFAULT 'erasure',
    
  target_tradition TEXT,
  target_event_id TEXT,
  agent           TEXT,                           
  period_range    TEXT,
  description_md  TEXT,
  evidence_refs   TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_memory_traditions (
  id              TEXT PRIMARY KEY,
  case_id         TEXT,
  tradition_id    TEXT,
  memory_type     TEXT NOT NULL DEFAULT 'liturgical',
    
  description_md  TEXT,
  vehicle         TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id)      REFERENCES wv_exemplar_cases(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_modernity_streams (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  stream_type     TEXT NOT NULL DEFAULT 'secular',
    
    
  origin_period_id TEXT,
  description_md  TEXT,
  key_values      TEXT,                           
  key_tensions    TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_moral_arc_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  moral_axis_id   TEXT,
  tradition_id    TEXT,
  century_from    INTEGER,
  century_to      INTEGER,
  arc_steps_json  TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id)
);

CREATE TABLE wv_moral_axes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  axis_type       TEXT NOT NULL DEFAULT 'relational',
    
  description_md  TEXT,
  domain_id       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES wv_domains(id)
);

CREATE TABLE wv_moral_case_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  pattern_type    TEXT NOT NULL DEFAULT 'sacrifice',
    
    
  description_md  TEXT,
  traditions_using TEXT,                          
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_moral_civilization_maps (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  period_id       TEXT,
  institution_types TEXT,                         
  map_layer_id    TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (map_layer_id) REFERENCES wv_map_layers(id)
);

CREATE TABLE wv_moral_inversion_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  inverted_virtue TEXT,                           
  replacement_virtue TEXT,                        
  mechanism       TEXT,
  adversarial_pattern_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)          REFERENCES wv_traditions(id),
  FOREIGN KEY (adversarial_pattern_id) REFERENCES wv_adversarial_patterns(id)
);

CREATE TABLE wv_moral_norms (
  id              TEXT PRIMARY KEY,
  moral_axis_id   TEXT,
  tradition_id    TEXT,
  title           TEXT NOT NULL,
  norm_type       TEXT NOT NULL DEFAULT 'duty',
    
  scope           TEXT,                           
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id)
);

CREATE TABLE wv_movements (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  movement_type   TEXT NOT NULL DEFAULT 'revival',
    
    
  tradition_id    TEXT,
  period_id       TEXT,
  region_id       TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_narrative_scripts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  script_type     TEXT NOT NULL DEFAULT 'consent',
    
  propaganda_system_id TEXT,
  media_regime_id TEXT,
  description_md  TEXT,
  key_moves       TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (propaganda_system_id) REFERENCES wv_propaganda_systems(id),
  FOREIGN KEY (media_regime_id)      REFERENCES wv_media_regimes(id)
);

CREATE TABLE wv_node_edges (
  id              TEXT PRIMARY KEY,
  from_node_id    TEXT NOT NULL,
  to_node_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL DEFAULT 'related_to',
    
    
    
    
    
  note            TEXT,
  weight          REAL NOT NULL DEFAULT 1.0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_node_id) REFERENCES wv_nodes(id),
  FOREIGN KEY (to_node_id)   REFERENCES wv_nodes(id)
);

CREATE TABLE wv_node_quran_links (
  id              TEXT PRIMARY KEY,
  node_id         TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,                  
  link_type       TEXT NOT NULL DEFAULT 'illustrates',
    
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id)
);

CREATE TABLE wv_node_scope_links (
  id            TEXT PRIMARY KEY,
  node_id       TEXT NOT NULL,
  scope_type    TEXT NOT NULL, 
  scope_ref     TEXT NOT NULL, 
  link_role     TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id)
);

CREATE TABLE wv_nodes (
  id              TEXT PRIMARY KEY,
  node_type       TEXT NOT NULL DEFAULT 'concept',
    
    
  title           TEXT NOT NULL,
  summary         TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  data_json       TEXT,                           
  canonical_ref   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE VIRTUAL TABLE wv_nodes_fts USING fts5(
  title, summary, content='wv_nodes', content_rowid='rowid'
);

CREATE TABLE wv_norm_sources (
  id             TEXT PRIMARY KEY,
  norm_id        TEXT NOT NULL,
  source_type    TEXT NOT NULL DEFAULT 'scripture',
    
  source_ref     TEXT NOT NULL,                   
  locator        TEXT,
  excerpt        TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (norm_id) REFERENCES wv_moral_norms(id)
);

CREATE TABLE wv_note_relations (
  id            TEXT PRIMARY KEY,
  note_id       TEXT NOT NULL,
  target_type   TEXT NOT NULL,
    
    
  target_id     TEXT NOT NULL,
  relation_role TEXT,                             
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES wv_notes(id)
);

CREATE TABLE wv_notes (
  id              TEXT PRIMARY KEY,
  note_type       TEXT NOT NULL DEFAULT 'reflection',
    
  title           TEXT,
  body_md         TEXT NOT NULL,
  tradition_id    TEXT,
  topic_id        TEXT,
  moral_axis_id   TEXT,
  core_user_ref   TEXT NOT NULL,                  
  core_ws_ref     TEXT,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE VIRTUAL TABLE wv_notes_fts USING fts5(
  title, body_md, content='wv_notes', content_rowid='rowid'
);

CREATE TABLE wv_organizations (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  org_type         TEXT NOT NULL DEFAULT 'religious_body',
    
    
  tradition_id     TEXT,
  location_id      TEXT,
  period_id        TEXT,
  description_md   TEXT,
  meta_json        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_orientalism_image_chains (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  orientalist_frame_id TEXT,
  chain_steps_json TEXT,                          
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (orientalist_frame_id) REFERENCES wv_orientalist_frames(id)
);

CREATE TABLE wv_orientalist_frames (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  target_tradition TEXT,
  target_region    TEXT,
  period_range    TEXT,
  key_stereotypes TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_output_artifacts (
  id              TEXT PRIMARY KEY,
  artifact_type   TEXT NOT NULL DEFAULT 'cluster_brief',
    
    
  title           TEXT NOT NULL,
  source_spec     TEXT,                           
  cm_doc_ref      TEXT,                           
  content_json    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',  
  core_user_ref   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_people (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  person_type     TEXT NOT NULL DEFAULT 'scholar',
    
    
  tradition_id    TEXT,
  era             TEXT,
  birth_year      INTEGER,
  death_year      INTEGER,
  birth_location_id TEXT,
  death_location_id TEXT,
  nationality     TEXT,
  affiliation     TEXT,
  bio_md          TEXT,
  visibility      TEXT NOT NULL DEFAULT 'workspace',
    
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_people_aliases (
  id         TEXT PRIMARY KEY,
  person_id  TEXT NOT NULL,
  alias      TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'transliteration',
    
  language   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (person_id) REFERENCES wv_people(id)
);

CREATE VIRTUAL TABLE wv_people_fts USING fts5(
  name, name_ar, bio_md, content='wv_people', content_rowid='rowid'
);

CREATE TABLE wv_people_relations (
  id            TEXT PRIMARY KEY,
  from_person_id TEXT NOT NULL,
  to_person_id   TEXT NOT NULL,
  relation_type  TEXT NOT NULL DEFAULT 'influenced',
    
    
  note          TEXT,
  source_ref    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_person_id) REFERENCES wv_people(id),
  FOREIGN KEY (to_person_id)   REFERENCES wv_people(id)
);

CREATE TABLE wv_periods (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  period_type     TEXT NOT NULL DEFAULT 'era',
    
  start_year      INTEGER,
  end_year        INTEGER,
  is_approximate  INTEGER NOT NULL DEFAULT 0,
  civilizational_label TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_practices (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  practice_type   TEXT NOT NULL DEFAULT 'ritual',
    
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  period_id       TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE wv_propaganda_flow_maps (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  propaganda_system_id TEXT,
  media_regime_id TEXT,
  flow_steps_json TEXT,                           
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (propaganda_system_id) REFERENCES wv_propaganda_systems(id),
  FOREIGN KEY (media_regime_id)      REFERENCES wv_media_regimes(id)
);

CREATE TABLE wv_propaganda_systems (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  system_type     TEXT NOT NULL DEFAULT 'state',
    
  period_id       TEXT,
  region_id       TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_prophetic_episode_links (
  id              TEXT PRIMARY KEY,
  episode_id      TEXT NOT NULL,
  target_type     TEXT NOT NULL,
    
  target_id       TEXT NOT NULL,
  link_role       TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES wv_prophetic_episodes(id)
);

CREATE TABLE wv_prophetic_episodes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  prophet_id      TEXT,                           
  moral_axis_id   TEXT,
  episode_type    TEXT NOT NULL DEFAULT 'testing',
    
    
  narrative_text  TEXT,
  moral_lesson    TEXT,
  qr_scope_ref    TEXT,                           
  corpus_unit_id  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (prophet_id)   REFERENCES wv_people(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE VIRTUAL TABLE wv_prophetic_episodes_fts USING fts5(
  title, title_ar, narrative_text, moral_lesson,
  content='wv_prophetic_episodes', content_rowid='rowid'
);

CREATE TABLE wv_prophetic_exemplars (
  id              TEXT PRIMARY KEY,
  person_id       TEXT NOT NULL,
  tradition_id    TEXT,
  prophetic_model_id TEXT,
  virtues_embodied TEXT,                          
  key_episodes    TEXT,                           
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (person_id)           REFERENCES wv_people(id),
  FOREIGN KEY (tradition_id)        REFERENCES wv_traditions(id),
  FOREIGN KEY (prophetic_model_id)  REFERENCES wv_prophetic_models(id)
);

CREATE TABLE wv_prophetic_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  model_role      TEXT NOT NULL DEFAULT 'messenger',
    
    
  key_attributes  TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_psychology_schools (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  founder_name    TEXT,
  period_range    TEXT,
  origin_region   TEXT,
  human_image_id  TEXT,
  key_concepts    TEXT,                           
  civilizational_role TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (human_image_id) REFERENCES wv_human_image_profiles(id)
);

CREATE TABLE wv_questions (
  id              TEXT PRIMARY KEY,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'open',
    
  topic_id        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'open',   
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_regions (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  region_type    TEXT NOT NULL DEFAULT 'macro',
    
  parent_id      TEXT,
  description_md TEXT,
  bounding_box   TEXT,                            
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES wv_regions(id)
);

CREATE TABLE wv_renderer_presets (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  renderer_type   TEXT NOT NULL DEFAULT 'graph',
    
  config_json     TEXT NOT NULL,
  description     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_replacement_bedrock_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  abrahamic_foundation TEXT NOT NULL,             
  stream_id       TEXT,
  replacement_mechanism TEXT,
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id)       REFERENCES wv_modernity_streams(id),
  FOREIGN KEY (diagram_spec_id) REFERENCES wv_diagram_specs(id)
);

CREATE TABLE wv_revelation_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  revelation_type TEXT NOT NULL DEFAULT 'prophetic',
    
    
  medium          TEXT,                           
  continuity      TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_route_features (
  id              TEXT PRIMARY KEY,
  route_layer_id  TEXT NOT NULL,
  feature_type    TEXT NOT NULL DEFAULT 'waypoint',
    
  title           TEXT,
  location_id     TEXT,
  latitude        REAL,
  longitude       REAL,
  sequence_order  INTEGER,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (route_layer_id) REFERENCES wv_route_layers(id),
  FOREIGN KEY (location_id)    REFERENCES wv_locations(id)
);

CREATE TABLE wv_route_layers (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  route_category  TEXT NOT NULL DEFAULT 'trade',
    
  period_range    TEXT,
  tradition_id    TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_route_segments (
  id              TEXT PRIMARY KEY,
  map_layer_id    TEXT,
  title           TEXT,
  route_type      TEXT NOT NULL DEFAULT 'pilgrimage',
    
    
  from_location_id TEXT,
  to_location_id  TEXT,
  waypoints_json  TEXT,                           
  period_label    TEXT,
  tradition_id    TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (map_layer_id)      REFERENCES wv_map_layers(id),
  FOREIGN KEY (from_location_id)  REFERENCES wv_locations(id),
  FOREIGN KEY (to_location_id)    REFERENCES wv_locations(id)
);

CREATE TABLE wv_sacrifice_frameworks (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  sacrifice_type  TEXT NOT NULL DEFAULT 'ritual',
    
    
  key_example     TEXT,
  theological_role TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_salvation_redemption_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  model_type      TEXT NOT NULL DEFAULT 'moral',
    
    
  sin_diagnosis   TEXT,
  remedy          TEXT,
  final_hope      TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_schools (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  title_ar       TEXT,
  school_type    TEXT NOT NULL DEFAULT 'theological',
    
  tradition_id   TEXT,
  branch_id      TEXT,
  founded_year   INTEGER,
  founder_name   TEXT,
  description_md TEXT,
  meta_json      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (branch_id)    REFERENCES wv_tradition_branches(id)
);

CREATE TABLE wv_scriptural_corpora (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  corpus_type     TEXT NOT NULL DEFAULT 'scripture',
    
  language        TEXT,
  canon_status    TEXT,                           
  date_range      TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_secular_moralities (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  moral_type      TEXT NOT NULL DEFAULT 'utilitarian',
    
    
  stream_id       TEXT,
  key_values      TEXT,                           
  legitimacy_claim TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

CREATE TABLE wv_social_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  pattern_type    TEXT NOT NULL DEFAULT 'family',
    
    
  tradition_id    TEXT,
  period_id       TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_source_chunks (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  source_unit_id  TEXT,
  chunk_index     INTEGER NOT NULL,
  heading_norm    TEXT,
  page_no         INTEGER,
  char_start      INTEGER,
  char_end        INTEGER,
  token_count     INTEGER,
  text_content    TEXT NOT NULL,
  chunk_kind      TEXT,
    
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  UNIQUE (source_id, chunk_index)
);

CREATE VIRTUAL TABLE wv_source_chunks_fts USING fts5(
  heading_norm, text_content,
  content='wv_source_chunks', content_rowid='rowid'
);

CREATE TABLE wv_source_people (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL,
  person_id   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'author',
    
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES wv_sources(id),
  FOREIGN KEY (person_id) REFERENCES wv_people(id),
  UNIQUE (source_id, person_id, role)
);

CREATE TABLE wv_source_units (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  parent_id       TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'chapter',
    
  title           TEXT,
  unit_index      INTEGER,
  page_start      INTEGER,
  page_end        INTEGER,
  text_excerpt    TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES wv_sources(id),
  FOREIGN KEY (parent_id) REFERENCES wv_source_units(id)
);

CREATE TABLE wv_source_unit_illustrations (
  id              TEXT PRIMARY KEY,
  source_unit_id  TEXT NOT NULL,
  source_id       TEXT,
  slug            TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0,
  title           TEXT,
  caption         TEXT,
  theme           TEXT NOT NULL DEFAULT 'dark',
  html_content    TEXT NOT NULL,
  meta_json       TEXT,
  reading_session_id TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id)
);

CREATE TABLE wv_sources (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  source_type     TEXT NOT NULL DEFAULT 'book',
    
    
  source_domain   TEXT NOT NULL DEFAULT 'general',
    
  tradition_id    TEXT,
  language        TEXT,
  published_year  INTEGER,
  publisher       TEXT,
  doi             TEXT,
  url             TEXT,
  cover_blob      TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE VIRTUAL TABLE wv_sources_fts USING fts5(
  title, title_ar, description_md, content='wv_sources', content_rowid='rowid'
);

CREATE TABLE wv_reading_sessions (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  source_unit_id  TEXT,
  title           TEXT,
  session_type    TEXT NOT NULL DEFAULT 'reading',
  status          TEXT NOT NULL DEFAULT 'active',
  focus_mode      TEXT,
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT,
  last_position   TEXT,
  duration_secs   INTEGER,
  summary_md      TEXT,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)
);

CREATE TABLE wv_spiritual_agents (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT NOT NULL,
  agent_type      TEXT NOT NULL DEFAULT 'angelic',
    
  description_md  TEXT,
  scriptural_basis TEXT,                          
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_storyline_specs (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  topic_id        TEXT,
  steps_json      TEXT NOT NULL,                  
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id)
);

CREATE TABLE wv_temptation_modes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  mode_type       TEXT NOT NULL DEFAULT 'appetitive',
    
    
  tradition_id    TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_term_links (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,  
  entity_id       TEXT NOT NULL,
  al_concept_ref  TEXT NOT NULL,  
  link_type       TEXT NOT NULL DEFAULT 'key_term',
    
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_thinker_period_links (
  id                  TEXT PRIMARY KEY,
  person_id           TEXT NOT NULL,
  century_profile_id  TEXT,
  period_id           TEXT,
  transition_id       TEXT,
  role                TEXT,  
  note                TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (person_id)          REFERENCES wv_people(id),
  FOREIGN KEY (century_profile_id) REFERENCES wv_century_profiles(id),
  FOREIGN KEY (period_id)          REFERENCES wv_periods(id)
);

CREATE TABLE wv_timeline_events (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  event_type      TEXT NOT NULL DEFAULT 'historical',
    
    
  year_exact      INTEGER,
  year_start      INTEGER,
  year_end        INTEGER,
  is_approximate  INTEGER NOT NULL DEFAULT 0,
  century         INTEGER,
  location_id     TEXT,
  tradition_id    TEXT,
  person_id       TEXT,
  wv_event_id     TEXT,                           
  description_md  TEXT,
  significance    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (person_id)    REFERENCES wv_people(id),
  FOREIGN KEY (wv_event_id)  REFERENCES wv_events(id)
);

CREATE TABLE wv_timeline_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  timeline_theme  TEXT NOT NULL DEFAULT 'general',
    
    
  tradition_id    TEXT,
  century_from    INTEGER,
  century_to      INTEGER,
  filter_json     TEXT,                           
  event_ids_json  TEXT,                           
  renderer_hint   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

CREATE TABLE wv_topics (
  id              TEXT PRIMARY KEY,
  topic_key       TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  topic_domain    TEXT NOT NULL DEFAULT 'theology',
    
    
    
  parent_id       TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE VIRTUAL TABLE wv_topics_fts USING fts5(
  title, title_ar, description_md, content='wv_topics', content_rowid='rowid'
);

CREATE TABLE wv_tradition_branches (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  title_ar       TEXT,
  tradition_id   TEXT NOT NULL,
  branch_type    TEXT NOT NULL DEFAULT 'doctrinal',
    
  parent_id      TEXT,
  description_md TEXT,
  period_range   TEXT,                            
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (parent_id)    REFERENCES wv_tradition_branches(id)
);

CREATE TABLE wv_traditions (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_type  TEXT NOT NULL DEFAULT 'religion',
    
  domain_id       TEXT,
  parent_id       TEXT,                           
  founded_period  TEXT,
  geographic_origin TEXT,
  scripture_refs  TEXT,                           
  core_beliefs    TEXT,                           
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (domain_id)  REFERENCES wv_domains(id)
);

CREATE VIRTUAL TABLE wv_traditions_fts USING fts5(
  title, title_ar, description_md, content='wv_traditions', content_rowid='rowid'
);

CREATE TABLE wv_transition_sequences (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  from_regime     TEXT,                           
  to_regime       TEXT,                           
  century_from    INTEGER,
  century_to      INTEGER,
  steps_json      TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_value_positions (
  id              TEXT PRIMARY KEY,
  moral_axis_id   TEXT NOT NULL,
  tradition_id    TEXT,
  school_id       TEXT,
  person_id       TEXT,
  position_title  TEXT NOT NULL,
  position_text   TEXT NOT NULL,
  position_type   TEXT NOT NULL DEFAULT 'normative',
    
  evidence_refs   TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (school_id)     REFERENCES wv_schools(id),
  FOREIGN KEY (person_id)     REFERENCES wv_people(id)
);

CREATE TABLE wv_vice_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE wv_virtue_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  description_md  TEXT,
  scripture_refs  TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE INDEX idx_wv_aff_entity ON wv_affiliations(entity_ref, entity_type);

CREATE INDEX idx_wv_aff_target ON wv_affiliations(target_type, target_id);

CREATE INDEX idx_wv_ap_trad ON wv_adversarial_patterns(tradition_id);

CREATE INDEX idx_wv_ap_type ON wv_adversarial_patterns(pattern_type);

CREATE INDEX idx_wv_ar_from ON wv_argument_relations(from_arg_id);

CREATE INDEX idx_wv_arg_topic ON wv_arguments(topic_id);

CREATE INDEX idx_wv_arg_trad  ON wv_arguments(tradition_id);

CREATE INDEX idx_wv_bs_status ON wv_brainstorm_sessions(status);

CREATE INDEX idx_wv_bs_topic  ON wv_brainstorm_sessions(topic_id);

CREATE INDEX idx_wv_bs_user   ON wv_brainstorm_sessions(core_user_ref);

CREATE INDEX idx_wv_cax_comp ON wv_comparison_axes(comparison_id);

CREATE INDEX idx_wv_cc2_comp ON wv_comparison_cells(comparison_id);

CREATE INDEX idx_wv_cc2_row  ON wv_comparison_cells(row_id);

CREATE INDEX idx_wv_cc_trad ON wv_civilizational_contributions(tradition_id);

CREATE INDEX idx_wv_cc_type ON wv_civilizational_contributions(contrib_type);

CREATE INDEX idx_wv_cel2_contrib ON wv_contribution_evidence_links(contrib_id);

CREATE INDEX idx_wv_cel_claim    ON wv_claim_evidence_links(claim_id);

CREATE INDEX idx_wv_cel_evidence ON wv_claim_evidence_links(evidence_id);

CREATE INDEX idx_wv_cf_trad ON wv_covenant_frameworks(tradition_id);

CREATE INDEX idx_wv_cl_topic  ON wv_claims(topic_id);

CREATE INDEX idx_wv_cl_trad   ON wv_claims(tradition_id);

CREATE INDEX idx_wv_cl_type   ON wv_claims(claim_type);

CREATE INDEX idx_wv_cm_cluster ON wv_cluster_members(cluster_id);

CREATE INDEX idx_wv_cm_entity  ON wv_cluster_members(entity_type, entity_id);

CREATE INDEX idx_wv_cp_type ON wv_colonial_projects(project_type);

CREATE INDEX idx_wv_cr_comp ON wv_comparison_rows(comparison_id);

CREATE INDEX idx_wv_csl_case  ON wv_case_scope_links(case_id);

CREATE INDEX idx_wv_csl_scope ON wv_case_scope_links(scope_type, scope_id);

CREATE INDEX idx_wv_cu_corpus ON wv_corpus_units(corpus_id);

CREATE INDEX idx_wv_cu_parent ON wv_corpus_units(parent_id);

CREATE INDEX idx_wv_cu_type   ON wv_corpus_units(unit_type);

CREATE INDEX idx_wv_db_source ON wv_distill_batches(source_id);

CREATE INDEX idx_wv_db_status ON wv_distill_batches(status);

CREATE INDEX idx_wv_dcm_cluster ON wv_debate_cluster_members(cluster_id);

CREATE INDEX idx_wv_di2_batch  ON wv_distill_items(batch_id);

CREATE INDEX idx_wv_di2_status ON wv_distill_items(status);

CREATE INDEX idx_wv_di_spec ON wv_diagram_instances(spec_id);

CREATE INDEX idx_wv_dl_doc    ON wv_doc_links(cm_doc_ref);

CREATE INDEX idx_wv_dl_entity ON wv_doc_links(entity_type, entity_id);

CREATE INDEX idx_wv_dr_trad ON wv_discernment_rules(tradition_id);

CREATE INDEX idx_wv_ec_stream ON wv_enlightenment_currents(stream_id);

CREATE INDEX idx_wv_ec_trad ON wv_exemplar_cases(tradition_id);

CREATE INDEX idx_wv_ec_type ON wv_exemplar_cases(case_type);

CREATE INDEX idx_wv_ei_source ON wv_evidence_items(source_id);

CREATE INDEX idx_wv_ei_type   ON wv_evidence_items(evidence_type);

CREATE INDEX idx_wv_el_event ON wv_event_locations(event_id);

CREATE INDEX idx_wv_el_loc   ON wv_event_locations(location_id);

CREATE INDEX idx_wv_ep_entity ON wv_event_participants(entity_type, entity_id);

CREATE INDEX idx_wv_ep_event  ON wv_event_participants(event_id);

CREATE INDEX idx_wv_eql_ep ON wv_episode_quran_links(episode_id);

CREATE INDEX idx_wv_eql_qr ON wv_episode_quran_links(qr_scope_ref);

CREATE INDEX idx_wv_esl_evidence ON wv_evidence_scope_links(evidence_id);

CREATE INDEX idx_wv_ev_loc   ON wv_events(location_id);

CREATE INDEX idx_wv_ev_trad  ON wv_events(tradition_id);

CREATE INDEX idx_wv_ev_years ON wv_events(start_year, end_year);

CREATE INDEX idx_wv_gtl_loc ON wv_geo_timeline_links(location_id);

CREATE INDEX idx_wv_hl_axis     ON wv_highlights(moral_axis_id);

CREATE INDEX idx_wv_hl_source   ON wv_highlights(source_id);

CREATE INDEX idx_wv_hl_user     ON wv_highlights(core_user_ref);

CREATE INDEX idx_wv_id_suggestion ON wv_insight_decisions(suggestion_id);

CREATE INDEX idx_wv_id_user       ON wv_insight_decisions(core_user_ref);

CREATE INDEX idx_wv_inst_loc  ON wv_institutions(location_id);

CREATE INDEX idx_wv_inst_trad ON wv_institutions(tradition_id);

CREATE INDEX idx_wv_inst_type ON wv_institutions(institution_type);

CREATE INDEX idx_wv_ip_inst ON wv_institution_profiles(institution_id);

CREATE INDEX idx_wv_is_batch  ON wv_insight_suggestions(batch_id);

CREATE INDEX idx_wv_is_status ON wv_insight_suggestions(status);

CREATE INDEX idx_wv_is_type   ON wv_insight_suggestions(suggestion_type);

CREATE INDEX idx_wv_loc_region ON wv_locations(region_id);

CREATE INDEX idx_wv_loc_type   ON wv_locations(location_type);

CREATE INDEX idx_wv_lrl_loc  ON wv_location_role_links(location_id);

CREATE INDEX idx_wv_lrl_trad ON wv_location_role_links(tradition_id);

CREATE INDEX idx_wv_ma_type ON wv_moral_axes(axis_type);

CREATE INDEX idx_wv_mav_axis ON wv_moral_arc_views(moral_axis_id);

CREATE INDEX idx_wv_mf_layer ON wv_map_features(map_layer_id);

CREATE INDEX idx_wv_mn_axis ON wv_moral_norms(moral_axis_id);

CREATE INDEX idx_wv_mn_trad ON wv_moral_norms(tradition_id);

CREATE INDEX idx_wv_mov_trad ON wv_movements(tradition_id);

CREATE INDEX idx_wv_mov_type ON wv_movements(movement_type);

CREATE INDEX idx_wv_ms_type ON wv_modernity_streams(stream_type);

CREATE INDEX idx_wv_nd_trad ON wv_nodes(tradition_id);

CREATE INDEX idx_wv_nd_type ON wv_nodes(node_type);

CREATE INDEX idx_wv_ne_from ON wv_node_edges(from_node_id);

CREATE INDEX idx_wv_ne_rel  ON wv_node_edges(relation_type);

CREATE INDEX idx_wv_ne_to   ON wv_node_edges(to_node_id);

CREATE INDEX idx_wv_nql_node ON wv_node_quran_links(node_id);

CREATE INDEX idx_wv_nql_qr   ON wv_node_quran_links(qr_scope_ref);

CREATE INDEX idx_wv_nr_note   ON wv_note_relations(note_id);

CREATE INDEX idx_wv_nr_target ON wv_note_relations(target_type, target_id);

CREATE INDEX idx_wv_ns_norm ON wv_norm_sources(norm_id);

CREATE INDEX idx_wv_nsl_node  ON wv_node_scope_links(node_id);

CREATE INDEX idx_wv_nsl_scope ON wv_node_scope_links(scope_type, scope_ref);

CREATE INDEX idx_wv_nt_topic ON wv_notes(topic_id);

CREATE INDEX idx_wv_nt_user  ON wv_notes(core_user_ref);

CREATE INDEX idx_wv_oa_status ON wv_output_artifacts(status);

CREATE INDEX idx_wv_oa_type   ON wv_output_artifacts(artifact_type);

CREATE INDEX idx_wv_org_trad ON wv_organizations(tradition_id);

CREATE INDEX idx_wv_org_type ON wv_organizations(org_type);

CREATE INDEX idx_wv_pa_person ON wv_people_aliases(person_id);

CREATE INDEX idx_wv_pe_prophet ON wv_prophetic_episodes(prophet_id);

CREATE INDEX idx_wv_pe_trad   ON wv_prophetic_episodes(tradition_id);

CREATE INDEX idx_wv_pe_type   ON wv_prophetic_episodes(episode_type);

CREATE INDEX idx_wv_pel_episode ON wv_prophetic_episode_links(episode_id);

CREATE INDEX idx_wv_pel_target  ON wv_prophetic_episode_links(target_type, target_id);

CREATE INDEX idx_wv_per_years ON wv_periods(start_year, end_year);

CREATE INDEX idx_wv_pex_person ON wv_prophetic_exemplars(person_id);

CREATE INDEX idx_wv_pm_trad ON wv_prophetic_models(tradition_id);

CREATE INDEX idx_wv_ppl_era  ON wv_people(era);

CREATE INDEX idx_wv_ppl_trad ON wv_people(tradition_id);

CREATE INDEX idx_wv_ppl_type ON wv_people(person_type);

CREATE INDEX idx_wv_pr_from ON wv_people_relations(from_person_id);

CREATE INDEX idx_wv_pr_to   ON wv_people_relations(to_person_id);

CREATE INDEX idx_wv_pr_trad ON wv_practices(tradition_id);

CREATE INDEX idx_wv_pr_type ON wv_practices(practice_type);

CREATE INDEX idx_wv_q_topic ON wv_questions(topic_id);

CREATE INDEX idx_wv_reg_parent ON wv_regions(parent_id);

CREATE INDEX idx_wv_rf_layer ON wv_route_features(route_layer_id);

CREATE INDEX idx_wv_rm_trad ON wv_revelation_models(tradition_id);

CREATE INDEX idx_wv_rs_layer ON wv_route_segments(map_layer_id);

CREATE INDEX idx_wv_sc_embedded ON wv_source_chunks(is_embedded);

CREATE INDEX idx_wv_sc_kind     ON wv_source_chunks(source_id, chunk_kind);

CREATE INDEX idx_wv_sc_source   ON wv_source_chunks(source_id);

CREATE INDEX idx_wv_sc_trad ON wv_scriptural_corpora(tradition_id);

CREATE INDEX idx_wv_sc_type ON wv_scriptural_corpora(corpus_type);

CREATE INDEX idx_wv_sch_trad ON wv_schools(tradition_id);

CREATE INDEX idx_wv_sch_type ON wv_schools(school_type);

CREATE INDEX idx_wv_sf_trad ON wv_sacrifice_frameworks(tradition_id);

CREATE INDEX idx_wv_sp_person ON wv_source_people(person_id);

CREATE INDEX idx_wv_sp_source ON wv_source_people(source_id);

CREATE INDEX idx_wv_src_trad   ON wv_sources(tradition_id);

CREATE INDEX idx_wv_src_type   ON wv_sources(source_type);

CREATE INDEX idx_wv_srm_trad ON wv_salvation_redemption_models(tradition_id);

CREATE INDEX idx_wv_su_source ON wv_source_units(source_id);

CREATE INDEX idx_wv_su_illus_unit ON wv_source_unit_illustrations(source_unit_id, order_index);

CREATE INDEX idx_wv_su_illus_source ON wv_source_unit_illustrations(source_id);

CREATE UNIQUE INDEX idx_wv_su_illus_slug ON wv_source_unit_illustrations(slug) WHERE slug IS NOT NULL;

CREATE INDEX idx_wv_su_illus_rsession ON wv_source_unit_illustrations(reading_session_id, order_index);

CREATE INDEX idx_wv_tb_trad ON wv_tradition_branches(tradition_id);

CREATE INDEX idx_wv_te_cent ON wv_timeline_events(century);

CREATE INDEX idx_wv_te_trad ON wv_timeline_events(tradition_id);

CREATE INDEX idx_wv_te_year ON wv_timeline_events(year_exact, year_start);

CREATE INDEX idx_wv_tl_al     ON wv_term_links(al_concept_ref);

CREATE INDEX idx_wv_tl_entity ON wv_term_links(entity_type, entity_id);

CREATE INDEX idx_wv_top_domain ON wv_topics(topic_domain);

CREATE INDEX idx_wv_top_trad   ON wv_topics(tradition_id);

CREATE INDEX idx_wv_tpl_person ON wv_thinker_period_links(person_id);

CREATE INDEX idx_wv_trad_parent ON wv_traditions(parent_id);

CREATE INDEX idx_wv_trad_type   ON wv_traditions(tradition_type);

CREATE INDEX idx_wv_vp_axis ON wv_value_positions(moral_axis_id);

CREATE INDEX idx_wv_vp_trad ON wv_virtue_profiles(tradition_id);
