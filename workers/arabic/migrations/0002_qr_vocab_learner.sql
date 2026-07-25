-- 0002 — Qur'anic-vocabulary SRS uses the PROPER SRS engine (one deck per Surah).
--
-- Correction to an earlier design: Qur'anic vocabulary review does NOT get its
-- own table family. It reuses the existing, Anki-exportable SRS engine that
-- powers /srs:
--   ar_learn_srs_deck   — one row per (user, Surah), deck_type = 'quran_vocab'
--   ar_learn_srs_card   — one row per vocab item (resource_ref -> AL backbone),
--                    with front_text/back_text/tags/extra_json snapshots so the
--                    deck exports cleanly to Anki (.apkg)
--   ar_learn_srs_review — FSRS rating log
--
-- Card conventions:
--   resource_type = 'qr_vocab_root' | 'qr_vocab_sense'
--   resource_ref  = AL root_norm  (root cards)  |  ar_ling_senses.id (sense cards)
--   card_template = 'qr_vocab'
--   tags          = 'Quran::<surah-name>::P<n> type::root|sense'   (Anki hierarchy)
--   extra_json    = { al_root_ref, root_norm, scope, first_surah, first_ayah }
--   Passage is carried in tags/extra_json; the Memlet content is rendered from
--   the AL backbone at study time via resource_ref (not duplicated on the card).
--
-- A Surah Deck is a MIXED deck. resource_type taxonomy:
--   qr_vocab_root | qr_vocab_sense        -> AL backbone (root_vocab / senses)
--   qr_expression                         -> AL ar_ling_collocations
--   qr_verbal_idiom                       -> AL ar_ling_expressions (Mir)
--   qr_verse  (+ extra_json.kind)         -> QR / AL, one card per analytical lens:
--        kind ∈ important | difficult | grammar(iʿrāb) | balagha |
--               tafsir | historical(asbāb al-nuzūl)
--        resource_ref = 'QR:39:53#tafsir'  (lens suffix keeps it unique per deck)
--   qr_key_concept (+ extra_json.domain)  -> WV, domain ∈ theology|psychology|
--               philosophy|… ; resource_ref = 'WV:concept:<slug>'
-- tags use Anki hierarchy, e.g. 'Quran::az-Zumar::P1 type::verse::balagha'.
--
-- The superseded ar_qr_vocab_decks/cards/reviews/progress tables are dropped.

DROP TABLE IF EXISTS ar_qr_vocab_reviews;
DROP TABLE IF EXISTS ar_qr_vocab_cards;
DROP TABLE IF EXISTS ar_qr_vocab_progress;
DROP TABLE IF EXISTS ar_qr_vocab_decks;

-- Helpful indexes for the /srs deck + Anki export queries.
CREATE INDEX IF NOT EXISTS idx_ar_learn_srs_deck_type ON ar_learn_srs_deck(core_user_ref, deck_type);
CREATE INDEX IF NOT EXISTS idx_ar_learn_srs_card_restype ON ar_learn_srs_card(deck_id, resource_type);
