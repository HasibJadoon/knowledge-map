-- Five-Lens zulfā (re_kmaps_zlf_zumar_3) → Qurʾān cross-domain bridge. Domain: AL.
-- ----------------------------------------------------------------------------
-- The five-lens lexicon entry for زُلْفَىٰ was fully built (blocks + 5 lens
-- prose, rooted in the lexica/tafsīr/iʿrāb books) but was never bound to the
-- Qurʾān word it glosses. This adds the typed cross-domain link (AL → QR) and
-- the lexicon→ayah reference, so the lexicon lens is reachable from 39:3 word 16.
--
-- Apply: wrangler d1 execute km_arabic_linguistic --remote \
--   --config workers/ar-linguistics/wrangler.toml \
--   --file database/seeds/seed-five-lens-zulf-quran-link.sql
-- Idempotent.

-- Cross-domain contract: AL lexicon entity attests/glosses the QR word scope.
INSERT OR REPLACE INTO ar_ling_quran_links
  (id, al_entity_ref, al_entity_type, qr_scope_ref, link_type, note_md, confidence) VALUES
 ('ql_kmaps_zlf_39_3','re_kmaps_zlf_zumar_3','lexicon_root_entry','QR:39:3','glosses',
  '{"word":"زلفى","word_index":16,"word_occurrence_id":"53b28a79e473231be9a1324509","lens":"five_lens","root":"زلف"}',1.0);

-- Lexicon → ayah reference (the entry cites 39:3).
INSERT OR REPLACE INTO ar_ling_lexicon_quran_refs
  (id, source_slug, root_entry_id, root_norm, surah, ayah, raw_ref, context_snippet) VALUES
 ('lqr_kmaps_zlf_39_3','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف',39,3,'[39:3]',
  'ليقربونا إلى الله زلفى');
