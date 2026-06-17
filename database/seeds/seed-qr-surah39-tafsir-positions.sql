-- Map Surah 39 tafsīr entries into the structured scholar-positions table.
-- Domain: QR. Feeds the study module's Scholarship & Tafsir step (SCH 700),
-- which resolves from qr_scholar_positions (not the raw qr_tafsir_entries).
--
-- Source: qr_tafsir_entries (310 rows, 8 works: Tabari, Zamakhshari, Razi,
-- Ibn Atiyya, Ibn Kathir, Abu Hayyan, Alusi, Ibn Ashur). All scholar_id /
-- work_id FK targets already exist in qr_scholar_profiles / qr_scholar_works.
--
-- Idempotent: keyed by QR:SCHPOS:39:{tafsir_id}.

DELETE FROM qr_scholar_positions WHERE id LIKE 'QR:SCHPOS:39:%';
INSERT INTO qr_scholar_positions (id, scholar_id, work_id, scope_type, surah, ayah_from, ayah_to, position_type, position_text_ar, position_text_en, position_summary, original_page, is_minority_view, is_contested, note_md)
SELECT 'QR:SCHPOS:39:'||t.id, t.scholar_id, t.work_id, 'ayah_range', 39, t.ayah_from, t.ayah_to, 'tafsir',
       t.content_ar, t.content_en, substr(COALESCE(t.content_en, t.content_ar),1,300), t.source_page, 0, 0,
       '{"mapped_from":"qr_tafsir_entries","tafsir_id":"'||t.id||'"}'
FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
