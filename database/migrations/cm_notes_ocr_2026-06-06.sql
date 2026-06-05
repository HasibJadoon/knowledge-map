-- Handwriting search (Notability-style): store recognized text from the ink
-- layer so handwritten notes are findable by the same `q` search as typed
-- notes. iOS runs on-device Vision OCR (English strong, Arabic best-effort) and
-- PATCHes `ocr_text`; the recognizer is swappable, so a better Arabic model can
-- repopulate this column later without any schema change. Additive.
ALTER TABLE cm_notes ADD COLUMN ocr_text TEXT;
