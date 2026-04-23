UPDATE ar_quran_translations
SET
  translation_haleem = CASE
    WHEN translation_haleem IS NULL THEN NULL
    ELSE trim(replace(replace(
      CASE
        WHEN length(translation_haleem) >= 2
          AND substr(translation_haleem, 1, 1) = '"'
          AND substr(translation_haleem, -1, 1) = '"'
        THEN substr(translation_haleem, 2, length(translation_haleem) - 2)
        ELSE translation_haleem
      END,
      char(10), ' '
    ), char(13), ' '))
  END,
  translation_asad = CASE
    WHEN translation_asad IS NULL THEN NULL
    ELSE trim(replace(replace(
      CASE
        WHEN length(translation_asad) >= 2
          AND substr(translation_asad, 1, 1) = '"'
          AND substr(translation_asad, -1, 1) = '"'
        THEN substr(translation_asad, 2, length(translation_asad) - 2)
        ELSE translation_asad
      END,
      char(10), ' '
    ), char(13), ' '))
  END,
  translation_sahih = CASE
    WHEN translation_sahih IS NULL THEN NULL
    ELSE trim(replace(replace(
      CASE
        WHEN length(translation_sahih) >= 2
          AND substr(translation_sahih, 1, 1) = '"'
          AND substr(translation_sahih, -1, 1) = '"'
        THEN substr(translation_sahih, 2, length(translation_sahih) - 2)
        ELSE translation_sahih
      END,
      char(10), ' '
    ), char(13), ' '))
  END,
  translation_usmani = CASE
    WHEN translation_usmani IS NULL THEN NULL
    ELSE trim(replace(replace(
      CASE
        WHEN length(translation_usmani) >= 2
          AND substr(translation_usmani, 1, 1) = '"'
          AND substr(translation_usmani, -1, 1) = '"'
        THEN substr(translation_usmani, 2, length(translation_usmani) - 2)
        ELSE translation_usmani
      END,
      char(10), ' '
    ), char(13), ' '))
  END
WHERE translation_haleem IS NOT NULL
   OR translation_asad IS NOT NULL
   OR translation_sahih IS NOT NULL
   OR translation_usmani IS NOT NULL;
