------------------------------------------------------------------------------
-- Seed · Lemma wazn (batch 6) — high-frequency weak nouns missed at runtime
-- (defective-root شَىْء, ولي/هدي/رضو/هود families). Authored by id.
------------------------------------------------------------------------------

UPDATE qr_lemmas SET wazn_ar = 'فَعْل'    WHERE id = 'd513c315b45de1b683c781ff0d'; -- شَيْء · شيأ
UPDATE qr_lemmas SET wazn_ar = 'فُعَل'    WHERE id = '7e63507899aea37b3569e32c88'; -- هُدًى · هدي
UPDATE qr_lemmas SET wazn_ar = 'فَعِيل'   WHERE id = '50f3e1ec5dd9eda0ea6c698e86'; -- وَلِيّ · ولي
UPDATE qr_lemmas SET wazn_ar = 'مَفْعَل'  WHERE id = '6d801188a8bf2cbdf6aa2b0515'; -- مَوْلَى · ولي
UPDATE qr_lemmas SET wazn_ar = 'أَفْعَل'  WHERE id = '2fa7c0daa892afbf9adc7fe3f2'; -- أَوْلَى · ولي
UPDATE qr_lemmas SET wazn_ar = 'فُعْل'    WHERE id = 'e190e7aaeaab5aeb80074ea5e7'; -- هُود · هود
UPDATE qr_lemmas SET wazn_ar = 'فَاعِل'   WHERE id = '144a2437acf4d055f7f0e53cf2'; -- هَاد · هدي
UPDATE qr_lemmas SET wazn_ar = 'فِعْلَان' WHERE id = 'f1d893ef938dfb4cf83a50816d'; -- رِضْوَان · رضو
UPDATE qr_lemmas SET wazn_ar = 'فَعْل'    WHERE id = '0b672cb55116903e57254f890f'; -- هَدْي · هدي
UPDATE qr_lemmas SET wazn_ar = 'أَفْعَل'  WHERE id = 'f8267b580b4456694e5a3c4547'; -- أَهْدَى · هدي
UPDATE qr_lemmas SET wazn_ar = 'فَاعِلَة' WHERE id = 'd1a99cc007908e595169d8f828'; -- رَاضِيَة · رضو
