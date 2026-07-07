------------------------------------------------------------------------------
-- 017 · Lemma-level wazn (وزن) — authored pattern, keyed by lemma
--
-- The wazn is a lexical (lemma) property, so it lives on qr_lemmas: one authored
-- value covers every occurrence of that lemma. The worker prefers this over the
-- runtime mīzān, which is needed for WEAK-root nouns (hollow/defective/hamzated)
-- and irregulars where surface iʿlāl makes the pattern non-derivable
-- (سَمَآء→فَعَال, مَقَام→مَفْعَل, ءَايَة→فَعَلَة …). Sound + doubled roots keep
-- deriving automatically; foreign proper nouns (أعجمي) stay null (no mīzān).
------------------------------------------------------------------------------

ALTER TABLE qr_lemmas ADD COLUMN wazn_ar TEXT;  -- authored mīzān for the lemma
