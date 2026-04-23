-- K-MAPS SEED — qr_surah_passages — Surah 12
-- note_md is JSON for all rows.
INSERT OR IGNORE INTO qr_surah_passages
  (id, surah, passage_index, ayah_from, ayah_to, theme, title_ar, title_en, discourse_role, note_md)
VALUES
  ('5e22e76b7b4ce5e7690dc5cbb4', 12, 1, 1, 7,
   'prologue',
   'حلقة التمهيد: سلطة النص وبذرة القدر وتوجيه السائلين',
   'Prologue Ring: Authority, Destiny Seed, Reader as Seeker',
   'prologue',
   '{"structure":"ring","pattern":"A-B-C-D-C''-B''-A''","center":{"move":"D","ayah":4,"label":"Yusuf''s dream — destiny signal"},"pairs":[{"label":"A / A''","left":{"ayah":1,"theme":"Book clarity (authority of the text)"},"right":{"ayah":7,"theme":"Signs for seekers (reader posture)"},"mirror":"Outer frame: text identity ↔ reader identity"},{"label":"B / B''","left":{"ayah":2,"theme":"Arabic — path to comprehension"},"right":{"ayah":6,"theme":"Election + tā''wīl — depth of understanding"},"mirror":"Understanding offered broadly ↔ deepened specially"},{"label":"C / C''","left":{"ayah":3,"theme":"Divine narration authority"},"right":{"ayah":5,"theme":"Threat frame (plotting + shayṭān)"},"mirror":"Source secured ↔ conflict mechanics explained"}]}');
