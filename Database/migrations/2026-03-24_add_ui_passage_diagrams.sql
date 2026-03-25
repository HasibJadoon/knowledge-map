-- ============================================================
-- Migration: 2026-03-24 — Add passage diagram registry tables
-- Purpose:
-- 1. Store multiple passage-scoped diagram definitions per unit.
-- 2. Attach worldview nodes to each diagram with rendering roles.
-- ============================================================

CREATE TABLE IF NOT EXISTS ui_passage_diagrams (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  unit_id          TEXT NOT NULL,              -- FK ar_container_units
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  passage_ref      TEXT,                       -- "12:1-18"

  diagram_key      TEXT NOT NULL,              -- cluster_map / proof_tree / flow / graph
  title            TEXT NOT NULL,
  description      TEXT,

  renderer         TEXT NOT NULL,              -- rect_3d_grid / vertical_proof_tree / animated_path_flow / node_graph
  diagram_type     TEXT NOT NULL CHECK (diagram_type IN (
    'cluster_map',
    'claim_evidence_tree',
    'sequence_flow',
    'law_derivation',
    'ayah_focus_strip',
    'constellation_graph',
    'custom'
  )),

  order_index      INTEGER NOT NULL DEFAULT 0,
  is_default       INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),

  layout_json      JSON CHECK (layout_json  IS NULL OR json_valid(layout_json)),
  gsap_json        JSON CHECK (gsap_json    IS NULL OR json_valid(gsap_json)),
  filters_json     JSON CHECK (filters_json IS NULL OR json_valid(filters_json)),
  meta_json        JSON CHECK (meta_json    IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (unit_id, diagram_key),

  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE,
  FOREIGN KEY (surah)   REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ui_passage_diagrams_unit
  ON ui_passage_diagrams(unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ui_passage_diagrams_surah_range
  ON ui_passage_diagrams(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_ui_passage_diagrams_status
  ON ui_passage_diagrams(status);
CREATE INDEX IF NOT EXISTS idx_ui_passage_diagrams_default
  ON ui_passage_diagrams(unit_id, is_default)
  WHERE is_default = 1;

CREATE TRIGGER IF NOT EXISTS trg_ui_passage_diagrams_updated_at
AFTER UPDATE ON ui_passage_diagrams
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ui_passage_diagrams SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS ui_passage_diagram_nodes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  diagram_id       TEXT NOT NULL,
  node_id          TEXT NOT NULL,

  role             TEXT CHECK (role IN (
    'primary',
    'secondary',
    'supporting',
    'claim',
    'evidence',
    'law',
    'flow_step',
    'theme',
    'concept',
    'hidden'
  )),

  order_index      INTEGER NOT NULL DEFAULT 0,
  is_entry         INTEGER NOT NULL DEFAULT 0 CHECK (is_entry IN (0, 1)),
  is_exit          INTEGER NOT NULL DEFAULT 0 CHECK (is_exit IN (0, 1)),

  ui_json          JSON CHECK (ui_json IS NULL OR json_valid(ui_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (diagram_id, node_id),

  FOREIGN KEY (diagram_id) REFERENCES ui_passage_diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id)    REFERENCES wv_nodes(id)            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ui_passage_diagram_nodes_diagram
  ON ui_passage_diagram_nodes(diagram_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ui_passage_diagram_nodes_node
  ON ui_passage_diagram_nodes(node_id);
