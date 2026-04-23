-- Backfill qr_lemmas.total_occurrences from qr_lemma_occurrences counts.
UPDATE qr_lemmas
SET
  total_occurrences = (
    SELECT COUNT(*) FROM qr_lemma_occurrences WHERE lemma_id = qr_lemmas.id
  ),
  updated_at = datetime('now');
