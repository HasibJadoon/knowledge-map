-- Surah 39 Passage 1 (1-9) — Step 1 (Reading) ayah metadata completion. Domain: QR.
-- ----------------------------------------------------------------------------
-- The reading layer already has the verse text in both diacritic
-- (qr_ayah.text_uthmani / text_uthmani_clean) and non-diacritic
-- (qr_ayah.text_bare) forms, the per-word forms (qr_word_occurrences.word_text /
-- word_text_bare), page numbers, translations, and ruku. Only the juz/hizb
-- reading-header metadata was missing. Surah 39 ayat 1-31 fall in Juz 23, and
-- 39:1-9 sit in Hizb 46 (Ruku 1) of the standard Ḥafṣ muṣḥaf.
-- Idempotent.

UPDATE qr_surah_ayah_meta SET juz=23, hizb=46
 WHERE surah=39 AND ayah BETWEEN 1 AND 9;

UPDATE qr_ayah SET juz=23, hizb=46, ruku=1
 WHERE surah=39 AND ayah BETWEEN 1 AND 9;
