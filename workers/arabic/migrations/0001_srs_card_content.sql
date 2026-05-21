-- SRS cards become self-contained Anki-style cards: an explicit front and
-- back, structured extras, tags and a suspend flag. Previously a card only
-- carried a resource_ref and the content was assumed to be derived. The
-- snapshot columns let cards be reviewed offline and exported to Anki.

ALTER TABLE ar_srs_cards ADD COLUMN card_template TEXT NOT NULL DEFAULT 'freeform';
ALTER TABLE ar_srs_cards ADD COLUMN front_text    TEXT NOT NULL DEFAULT '';
ALTER TABLE ar_srs_cards ADD COLUMN back_text     TEXT NOT NULL DEFAULT '';
ALTER TABLE ar_srs_cards ADD COLUMN extra_json    TEXT;
ALTER TABLE ar_srs_cards ADD COLUMN tags          TEXT;
ALTER TABLE ar_srs_cards ADD COLUMN suspended     INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ar_sc_due
  ON ar_srs_cards(core_user_ref, suspended, next_review_at);
