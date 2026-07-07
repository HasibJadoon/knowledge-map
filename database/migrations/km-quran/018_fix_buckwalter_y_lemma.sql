------------------------------------------------------------------------------
-- 018 · Data fix — un-converted Buckwalter "Y" (U+0059) in lemmas
--
-- 366 qr_word_occurrences rows had a Latin "Y" left in the vocalised lemma
-- (Buckwalter Y = ى ALEF MAKSURA), e.g. شَYْء, هُدًY, وَحْY. This broke the lemma
-- display, the qr_lemmas join, and the wazn mīzān. Replace Y → ى.
------------------------------------------------------------------------------

UPDATE qr_word_occurrences SET lemma = REPLACE(lemma, 'Y', 'ى') WHERE lemma GLOB '*Y*';
UPDATE qr_lemmas           SET lemma_text = REPLACE(lemma_text, 'Y', 'ى') WHERE lemma_text GLOB '*Y*';
