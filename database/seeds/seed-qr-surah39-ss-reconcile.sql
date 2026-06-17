-- Sentence-structure reconciliation for Surah 39 (km_quran), mined from the
-- word-linked iʿrāb book entries. Run AFTER seed-qr-surah39-irab-wordlink.sql.
--
-- Builds qr_ss_* from qr_irab_book_entries where word_link_status='linked':
--   - qr_ss_occ_sentence    : one per-ayah container (2-75) + the 39:1 gold.
--   - qr_ss_scope_reading    : one row per (word, role); ranked across books,
--                              is_minority/is_contested flag the nuanced
--                              multiple readings (book disagreement).
--   - qr_ss_scope_morph_link : the majority iʿrāb role per word.
--   - qr_ss_scope_member_map : each word -> its ayah sentence, majority role.
--
-- 39:1 is excluded (ayah_key<>'39:1'): it has a richer hand-built gold example
-- in seed-qr-surah39-study.sql. Result (39:2-75): 75 sentences, 335 member
-- maps, 335 morph links, 355 readings (20 minority).
--
-- Idempotent: generated rows use QR:*X:39: id prefixes; re-running replaces them.

DELETE FROM qr_ss_scope_member_map WHERE id LIKE 'QR:SMMX:39:%';
DELETE FROM qr_ss_scope_morph_link WHERE id LIKE 'QR:SMLX:39:%';
DELETE FROM qr_ss_scope_reading    WHERE id LIKE 'QR:SRX:39:%';

-- Per-ayah sentence containers (clause segmentation is left to the miner).
INSERT OR REPLACE INTO qr_ss_occ_sentence (id, surah, ayah_from, ayah_to, word_start_index, word_end_index, sentence_kind, discourse_role, note_md)
SELECT 'QR:SS:39:'||ayah||':s1', 39, ayah, ayah, MIN(word_index), MAX(word_index), 'unspecified', 'ayah_unit',
       '{"note":"per-ayah container from word occurrences; clause segmentation pending miner"}'
FROM qr_word_occurrences WHERE surah=39 AND ayah BETWEEN 2 AND 75 GROUP BY ayah;

-- Multiple readings per word (ranked across books; minority/contested flagged).
INSERT INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md)
SELECT 'QR:SRX:39:'||wid||':'||rnk, 'word', wid, book_list, 'irab', 'AL:irab:role',
       'iʿrāb role: '||role, role, CASE WHEN rnk>1 THEN 1 ELSE 0 END, CASE WHEN num_roles>1 THEN 1 ELSE 0 END,
       '{"mined_from":"qr_irab_book_entries","book_count":'||books||',"rank":'||rnk||'}'
FROM (
  SELECT wid, role, books, book_list,
         ROW_NUMBER() OVER (PARTITION BY wid ORDER BY books DESC, role) AS rnk,
         COUNT(*) OVER (PARTITION BY wid) AS num_roles
  FROM (
    SELECT word_occurrence_id AS wid, grammar_role_norm AS role,
           COUNT(DISTINCT source_slug) AS books, GROUP_CONCAT(DISTINCT source_slug) AS book_list
    FROM qr_irab_book_entries
    WHERE surah=39 AND word_link_status='linked' AND word_occurrence_id IS NOT NULL
      AND grammar_role_norm IS NOT NULL AND TRIM(grammar_role_norm)<>'' AND ayah_key<>'39:1'
    GROUP BY word_occurrence_id, grammar_role_norm
  ) agg
) ranked;

-- Majority iʿrāb role per word.
INSERT INTO qr_ss_scope_morph_link (id, scope_type, scope_id, lx_morph_ref, syntactic_function, is_disputed, note_md)
SELECT 'QR:SMLX:39:'||wid, 'word', wid, 'AL:nahw:role', role, CASE WHEN num_roles>1 THEN 1 ELSE 0 END,
       '{"mined_from":"qr_irab_book_entries","book_count":'||books||',"alt_roles":'||(num_roles-1)||'}'
FROM (
  SELECT wid, role, books, num_roles FROM (
    SELECT wid, role, books,
           ROW_NUMBER() OVER (PARTITION BY wid ORDER BY books DESC, role) AS rnk,
           COUNT(*) OVER (PARTITION BY wid) AS num_roles
    FROM (
      SELECT word_occurrence_id AS wid, grammar_role_norm AS role, COUNT(DISTINCT source_slug) AS books
      FROM qr_irab_book_entries
      WHERE surah=39 AND word_link_status='linked' AND word_occurrence_id IS NOT NULL
        AND grammar_role_norm IS NOT NULL AND TRIM(grammar_role_norm)<>'' AND ayah_key<>'39:1'
      GROUP BY word_occurrence_id, grammar_role_norm
    ) a
  ) b WHERE rnk=1
) m;

-- Each word -> its ayah sentence, tagged with its majority role.
INSERT INTO qr_ss_scope_member_map (id, word_occurrence_id, scope_type, scope_id, member_role)
SELECT 'QR:SMMX:39:'||m.wid, m.wid, 'sentence', 'QR:SS:39:'||w.ayah||':s1', m.role
FROM (
  SELECT wid, role FROM (
    SELECT wid, role, ROW_NUMBER() OVER (PARTITION BY wid ORDER BY books DESC, role) AS rnk
    FROM (
      SELECT word_occurrence_id AS wid, grammar_role_norm AS role, COUNT(DISTINCT source_slug) AS books
      FROM qr_irab_book_entries
      WHERE surah=39 AND word_link_status='linked' AND word_occurrence_id IS NOT NULL
        AND grammar_role_norm IS NOT NULL AND TRIM(grammar_role_norm)<>'' AND ayah_key<>'39:1'
      GROUP BY word_occurrence_id, grammar_role_norm
    ) a
  ) b WHERE rnk=1
) m
JOIN qr_word_occurrences w ON w.id=m.wid;
