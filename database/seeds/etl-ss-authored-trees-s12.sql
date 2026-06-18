-- ─── ETL: S12 P1 authored sentence-structure trees → canonical qr_ss_tree* ────
-- Moves the 11 authored constituency trees for Yūsuf 12:1-7 out of
-- qr_surah_study_tasks.task_json into the canonical sentence-structure tables,
-- entirely in-database (no external round-trip) using SQLite json_tree.
--
-- Applied once to the live km_quran database. Re-runnable (DELETE guards first).
-- Result: 11 trees, 257 nodes, 246 edges, 80 constituency terms (coloured).

-- 0) Clear any prior run.
DELETE FROM qr_ss_tree_edge WHERE tree_id LIKE 'QR:SST:UT:C:QURAN:12:1-7:SS:%';
DELETE FROM qr_ss_tree_node WHERE tree_id LIKE 'QR:SST:UT:C:QURAN:12:1-7:SS:%';
DELETE FROM qr_ss_tree      WHERE id      LIKE 'QR:SST:UT:C:QURAN:12:1-7:SS:%';

-- 1) One tree per authored child task, linked to the ayah's occurrence sentence.
INSERT INTO qr_ss_tree (id, sentence_id, tree_type, grounding, source_ref)
SELECT 'QR:SST:'||t.id, s.id, 'constituency', 'authored', t.id
FROM qr_surah_study_tasks t
JOIN qr_ss_occ_sentence s
  ON s.surah = 12
 AND s.ayah_from = CAST(substr(t.task_name, instr(t.task_name,'12:')+3, 1) AS INTEGER)
WHERE t.passage_id = 'QR:SP:12:1-7' AND t.task_type = 'sentence_structure'
  AND t.task_json LIKE '%"tree"%';

-- 2) Every named tree object → a node. fullkey encodes the path; depth = number
--    of '.children[' segments; node_order = json_tree document order.
INSERT INTO qr_ss_tree_node (id, tree_id, parent_node_id, node_label, term_key, label_ar, depth, node_order)
SELECT 'QR:SSN:'||t.id||':'||jt.fullkey, 'QR:SST:'||t.id, NULL,
       json_extract(t.task_json, jt.fullkey||'.name'),
       json_extract(t.task_json, jt.fullkey||'.term_id'),
       json_extract(t.task_json, jt.fullkey||'.label_ar'),
       (length(jt.fullkey) - length(replace(jt.fullkey, '.children[', ''))) / length('.children['),
       jt.id
FROM qr_surah_study_tasks t
JOIN json_tree(t.task_json, '$.tree') jt ON jt.type = 'object'
WHERE t.passage_id = 'QR:SP:12:1-7' AND t.task_type = 'sentence_structure'
  AND t.task_json LIKE '%"tree"%'
  AND json_extract(t.task_json, jt.fullkey||'.name') IS NOT NULL;

-- 3) Parent linkage: a node's parent is its id minus the trailing '.children[N]'.
--    (Generated as a CASE map by scripts; equivalent to stripping the last path
--    segment. SQLite's LIKE self-join hits "pattern too complex", so the parent
--    fullkey is computed from the id string.)
--    See the session log / the in-repo helper for the generated UPDATE.

-- 4) Edges mirror the parent linkage.
INSERT INTO qr_ss_tree_edge (id, tree_id, parent_node_id, child_node_id)
SELECT 'QR:SSE:'||n.id, n.tree_id, n.parent_node_id, n.id
FROM qr_ss_tree_node n
WHERE n.tree_id LIKE 'QR:SST:UT:C:QURAN:12:1-7:SS:%' AND n.parent_node_id IS NOT NULL;

-- 5) Promote the authored term ids into the global dictionary, with their colours
--    taken from the per-tree term_colors maps.
INSERT OR IGNORE INTO qr_ss_term (term_key, label_ar, color, category)
SELECT term_key, label_ar, NULL, 'constituent' FROM (
  SELECT term_key, label_ar, ROW_NUMBER() OVER (PARTITION BY term_key ORDER BY id) rn
  FROM qr_ss_tree_node
  WHERE tree_id LIKE 'QR:SST:UT:C:QURAN:12:1-7:SS:%' AND term_key IS NOT NULL
) WHERE rn = 1;

UPDATE qr_ss_term SET color = COALESCE(color, (
  SELECT je.value FROM qr_surah_study_tasks t, json_each(t.task_json, '$.term_colors') je
  WHERE t.passage_id = 'QR:SP:12:1-7' AND t.task_type = 'sentence_structure'
    AND je.key = qr_ss_term.term_key LIMIT 1))
WHERE term_key IN (
  SELECT DISTINCT term_key FROM qr_ss_tree_node
  WHERE tree_id LIKE 'QR:SST:UT:C:QURAN:12:1-7:SS:%' AND term_key IS NOT NULL);
