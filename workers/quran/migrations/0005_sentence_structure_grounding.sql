-- ─── Sentence-structure grounding ────────────────────────────────────────────
-- Moves the authored sentence-structure constituency trees out of
-- qr_surah_study_tasks.task_json into the canonical qr_ss_tree* tables, and adds
-- a GLOBAL grammatical/balāgha term dictionary so node labels and colors are
-- normalized across every sentence (instead of per-task colour maps).
--
-- The trees are then served by the table-sourced morphology/sentence-structure
-- step builders, fused with the clause analysis (qr_ss_occ_clause), the per-word
-- iʿrāb grounding (qr_irab_book_entries), balāgha/ellipsis annotations, and the
-- tafsīr discussion — no task_json.

-- Global term dictionary: one row per grammatical / balāgha term, with its
-- Arabic + English label and a stable colour. term_key is the join key used by
-- qr_ss_tree_node.term_key and surfaced to the UI as term_colors.
CREATE TABLE IF NOT EXISTS qr_ss_term (
  term_key    TEXT PRIMARY KEY,        -- e.g. 'mubtada', 'khabar', 'naat'
  label_ar    TEXT,                    -- e.g. 'مبتدأ'
  label_en    TEXT,                    -- e.g. 'subject (mubtadaʾ)'
  color       TEXT,                    -- stable hex, e.g. '#4285F4'
  category    TEXT NOT NULL DEFAULT 'constituent',  -- constituent | clause | particle | balagha | irab
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qr_ss_term_cat ON qr_ss_term(category, sort_order);

-- Enrich the constituency node with the term reference, the Arabic role label,
-- a per-node nuance note, and a link to the underlying word (for leaf nodes,
-- so the UI can cross-reference the Five-Lens lexicon and per-word iʿrāb).
ALTER TABLE qr_ss_tree_node ADD COLUMN term_key TEXT;
ALTER TABLE qr_ss_tree_node ADD COLUMN label_ar TEXT;
ALTER TABLE qr_ss_tree_node ADD COLUMN note_md TEXT;
ALTER TABLE qr_ss_tree_node ADD COLUMN word_occurrence_id TEXT;

-- Record how a tree was grounded: 'authored' (curated constituency parse) or
-- 'irab' (synthesized from the linked iʿrāb book entries), plus a source ref.
ALTER TABLE qr_ss_tree ADD COLUMN grounding TEXT NOT NULL DEFAULT 'authored';
ALTER TABLE qr_ss_tree ADD COLUMN source_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_ss_tree_node_term ON qr_ss_tree_node(term_key);
CREATE INDEX IF NOT EXISTS idx_qr_ss_tree_node_word ON qr_ss_tree_node(word_occurrence_id);
