-- Surah 39 (all verses) — normalized source provenance for sentence structure,
-- rooted verse-by-verse in the iʿrāb books and tafsīr. Domain: QR (km_quran).
--
-- Brings 39:2-75 up to the 39:1 provenance standard using the schema's
-- dedicated tables (not note_md):
--   - qr_evidence_items                 : one row per linked iʿrāb entry and
--                                         per tafsīr entry, source_ref -> the
--                                         canonical work (qr_irab_sources /
--                                         qr_scholar_works), content_text_ar =
--                                         the book's own text.
--   - qr_ss_scope_reading_evidence_link : binds each per-word reading to the
--                                         book entries that support it, and
--                                         each per-verse synthesis to the
--                                         tafsīr works covering that verse.
--   - per-verse synthesis (QR:SRY)      : the majority iʿrāb skeleton
--                                         reconciled across books, scoped to
--                                         the verse sentence, rooted in tafsīr.
--
-- Run AFTER seed-qr-surah39-ss-reconcile.sql and the tafsir-positions seed.
-- Coverage tracks word-linking: 52/75 verses have a synthesis (the rest await
-- further iʿrāb word-linking). Idempotent (deterministic ids / INSERT OR REPLACE).

-- iʿrāb evidence: one per linked book entry (39:2-75).
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md)
SELECT 'QR:EVX:39:'||e.id, 'irab_book', s.source_title_ar, e.ayah_key,
       'iʿrāb ('||e.source_slug||'): '||e.grammar_role_norm||' — '||e.target_text_bare,
       e.grammar_role_norm||'  ('||e.target_text_bare||')',
       0, s.id,
       '{"slug":"'||e.source_slug||'","entry":"'||e.id||'","word_occurrence_id":"'||e.word_occurrence_id||'"}'
FROM qr_irab_book_entries e
JOIN qr_irab_sources s ON s.source_slug=e.source_slug
WHERE e.surah=39 AND e.word_link_status='linked' AND e.word_occurrence_id IS NOT NULL
  AND e.ayah_key<>'39:1' AND e.grammar_role_norm IS NOT NULL AND TRIM(e.grammar_role_norm)<>'';

-- Link each per-word reading to its supporting iʿrāb evidence (word + role match).
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT r.id, 'QR:EVX:39:'||e.id, 'supports'
FROM qr_irab_book_entries e
JOIN qr_ss_scope_reading r ON r.scope_id=e.word_occurrence_id AND r.reading_text_ar=e.grammar_role_norm
WHERE e.surah=39 AND e.word_link_status='linked' AND e.word_occurrence_id IS NOT NULL
  AND e.ayah_key<>'39:1' AND e.grammar_role_norm IS NOT NULL AND TRIM(e.grammar_role_norm)<>''
  AND r.id LIKE 'QR:SRX:39:%';

-- tafsīr evidence: one per tafsīr entry (8 works), snippet of the work's text.
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md)
SELECT 'QR:EVT:39:'||t.id, 'tafsir', w.title_ar, '39:'||t.ayah_from||'-'||t.ayah_to,
       'tafsir '||t.scholar_id||' ('||t.ayah_from||'-'||t.ayah_to||')',
       substr(t.content_ar,1,600), 0, t.work_id,
       '{"tafsir_id":"'||t.id||'","scholar":"'||t.scholar_id||'","ayah_from":'||t.ayah_from||',"ayah_to":'||t.ayah_to||'}'
FROM qr_tafsir_entries t JOIN qr_scholar_works w ON w.id=t.work_id
WHERE t.surah=39 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';

-- Per-verse synthesis: majority iʿrāb skeleton reconciled across books.
DELETE FROM qr_ss_scope_reading WHERE id LIKE 'QR:SRY:39:%';
INSERT INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md)
SELECT 'QR:SRY:39:'||ayah, 'sentence', 'QR:SS:39:'||ayah||':s1', 'synthesis:irab-books+tafsir', 'synthesis', 'AL:irab:synthesis',
       'Per-verse synthesis: majority iʿrāb skeleton reconciled across the iʿrāb books, with tafsīr evidence linked for meaning/context.',
       GROUP_CONCAT(tok, '، '),
       0, 0, '{"synthesis":true,"basis":"reconciled qr_ss_scope_morph_link + linked tafsir/irab evidence"}'
FROM (
  SELECT w.ayah AS ayah, w.word_index AS wi, w.word_text_bare||'='||m.syntactic_function AS tok
  FROM qr_ss_scope_morph_link m JOIN qr_word_occurrences w ON w.id=m.scope_id
  WHERE m.id LIKE 'QR:SMLX:39:%' AND w.surah=39 AND w.ayah BETWEEN 2 AND 75
  ORDER BY w.ayah, w.word_index
) GROUP BY ayah;

-- Root each per-verse synthesis in every tafsīr work covering that verse.
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT r.id, 'QR:EVT:39:'||t.id, 'supports'
FROM qr_ss_scope_reading r
JOIN qr_tafsir_entries t ON t.surah=39
  AND t.ayah_from <= CAST(substr(r.id,11) AS INTEGER)
  AND t.ayah_to   >= CAST(substr(r.id,11) AS INTEGER)
WHERE r.id LIKE 'QR:SRY:39:%' AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
