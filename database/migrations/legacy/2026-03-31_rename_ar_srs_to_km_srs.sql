PRAGMA foreign_keys=OFF;

ALTER TABLE ar_srs RENAME TO km_srs;

DROP INDEX IF EXISTS idx_ar_srs_user_due;
DROP INDEX IF EXISTS idx_ar_srs_user_lesson;
DROP INDEX IF EXISTS idx_ar_srs_type_key;
DROP TRIGGER IF EXISTS trg_ar_srs_updated_at;

CREATE INDEX IF NOT EXISTS idx_km_srs_user_due
  ON km_srs(user_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_km_srs_user_lesson
  ON km_srs(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_km_srs_type_key
  ON km_srs(item_type, item_key);

CREATE TRIGGER IF NOT EXISTS trg_km_srs_updated_at
AFTER UPDATE ON km_srs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE km_srs
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

PRAGMA foreign_keys=ON;
