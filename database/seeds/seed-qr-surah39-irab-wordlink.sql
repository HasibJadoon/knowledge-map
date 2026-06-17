-- Word-linking pass for Surah 39 iʿrāb book entries (km_quran).
-- Domain: QR. Prerequisite for sentence-structure mining (qr_ss_*).
--
-- Populates qr_irab_book_entries.word_occurrence_id by matching each
-- single-token fragment (target_text_bare) to a qr_word_occurrences row in
-- the same ayah (scoped by ayah_key = '39:N'). Only UNIQUE matches are
-- linked, so no fragment is bound to an arbitrary repeated token.
--
-- Result after these passes (1,893 entries): 473 linked, 389 span,
-- 1,031 ambiguous (repeated tokens / positional alignment - left to the
-- order-aware miner, see scripts/mine-ss-from-irab.mjs).
--
-- Idempotent: each pass only touches rows still 'pending'/'ambiguous'.

-- Pass 1: exact bare match, unique in ayah.
UPDATE qr_irab_book_entries
SET word_occurrence_id = (
      SELECT w.id FROM qr_word_occurrences w
      WHERE w.surah=39 AND ('39:'||w.ayah)=qr_irab_book_entries.ayah_key
        AND w.word_text_bare=qr_irab_book_entries.target_text_bare),
    word_link_status='linked',
    word_link_note='exact bare match, unique in ayah',
    updated_at=datetime('now')
WHERE surah=39 AND target_text_bare NOT LIKE '% %' AND target_text_bare<>''
  AND word_link_status IN ('pending','ambiguous') AND word_occurrence_id IS NULL
  AND (SELECT COUNT(*) FROM qr_word_occurrences w
       WHERE w.surah=39 AND ('39:'||w.ayah)=qr_irab_book_entries.ayah_key
         AND w.word_text_bare=qr_irab_book_entries.target_text_bare)=1;

-- Pass 2: normalized (hamza/alef/ya/ta) match, unique in ayah.
UPDATE qr_irab_book_entries AS e
SET word_occurrence_id = (
  SELECT w.id FROM qr_word_occurrences w
  WHERE w.surah=39 AND ('39:'||w.ayah)=e.ayah_key
    AND replace(replace(replace(replace(replace(w.word_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه')
      = replace(replace(replace(replace(replace(e.target_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه')),
    word_link_status='linked',
    word_link_note='normalized (hamza/alef/ya/ta) unique match',
    updated_at=datetime('now')
WHERE e.surah=39 AND e.target_text_bare NOT LIKE '% %' AND e.target_text_bare<>''
  AND e.word_link_status IN ('pending','ambiguous') AND e.word_occurrence_id IS NULL
  AND (SELECT COUNT(*) FROM qr_word_occurrences w
       WHERE w.surah=39 AND ('39:'||w.ayah)=e.ayah_key
         AND replace(replace(replace(replace(replace(w.word_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه')
           = replace(replace(replace(replace(replace(e.target_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه'))=1;

-- Pass 3: classify the remainder for the order-aware miner.
UPDATE qr_irab_book_entries SET word_link_status='span', updated_at=datetime('now')
WHERE surah=39 AND word_link_status IN ('pending') AND target_text_bare LIKE '% %';

UPDATE qr_irab_book_entries
SET word_link_status='ambiguous',
    word_link_note='single token; repeats in ayah or needs normalization - positional alignment required',
    updated_at=datetime('now')
WHERE surah=39 AND word_link_status='pending' AND target_text_bare NOT LIKE '% %' AND target_text_bare<>'';

-- Pass 4: positional alignment. For an ambiguous (repeated) token, pair the
-- n-th iʿrāb entry of that token (by entry_order, per book) to the n-th
-- occurrence of the token (by word_index) in the same ayah. Conservative:
-- unmatched ranks stay 'ambiguous'. Lifts Surah 39 to 524 linked.
UPDATE qr_irab_book_entries
SET word_occurrence_id = paired.wid,
    word_link_status='linked',
    word_link_note='positional alignment within ayah/book by entry order',
    updated_at=datetime('now')
FROM (
  SELECT er.entry_id AS entry_id, wr.wid AS wid
  FROM (
    SELECT id AS entry_id, ayah_key,
           replace(replace(replace(replace(replace(target_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه') AS nt,
           ROW_NUMBER() OVER (PARTITION BY ayah_key, source_slug, replace(replace(replace(replace(replace(target_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه') ORDER BY entry_order) AS rk
    FROM qr_irab_book_entries
    WHERE surah=39 AND word_link_status='ambiguous' AND target_text_bare NOT LIKE '% %' AND target_text_bare<>''
  ) er
  JOIN (
    SELECT id AS wid, ('39:'||ayah) AS ayah_key,
           replace(replace(replace(replace(replace(word_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه') AS nt,
           ROW_NUMBER() OVER (PARTITION BY ayah, replace(replace(replace(replace(replace(word_text_bare,'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),'ة','ه') ORDER BY word_index) AS rk
    FROM qr_word_occurrences WHERE surah=39
  ) wr ON wr.ayah_key=er.ayah_key AND wr.nt=er.nt AND wr.rk=er.rk
) AS paired
WHERE qr_irab_book_entries.id = paired.entry_id;
