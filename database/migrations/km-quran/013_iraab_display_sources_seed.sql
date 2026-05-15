-- 013_iraab_display_sources_seed.sql
-- Seed the 6 iʿrāb display-tier sources for qr_iraab_book_display_sources
-- (created by migration 011 but left unseeded). Mirrors the seed pattern in
-- migration 012 for tafsir. Idempotent via INSERT OR IGNORE.
--
-- These six map to the source_slug values produced by the iʿrāb parser:
--   qul_irab_muyassar          — Al-Iʿrāb al-Muyassar (per-ayah, single source)
--   qul_jadwal_irab_quran      — Al-Jadwal fī Iʿrāb al-Qurʾān (Maḥmūd Ṣāfī)
--   qul_irab_quran_daas        — Iʿrāb al-Qurʾān (Daʿās)
--   qul_irab_darwish           — Iʿrāb al-Qurʾān wa-Bayānuh (Darwīsh)
--   tibyan_ukbari_irab         — al-Tibyān (al-ʿUkbarī, d. 616 AH)
--   qul_dep_graphs             — QUL dependency-graph SVGs (one per ayah)

INSERT OR IGNORE INTO qr_iraab_book_display_sources
  (id, source_slug, book_title_ar, book_title_en, author_name_ar, author_name_en,
   author_period, badge_color, badge_glyph, short_description, long_description,
   display_order, is_visible)
VALUES
  ('QR:WORK:QUL:MUYASSAR_IRAB', 'qul_irab_muyassar',
   'الإعراب الميسر', 'Al-Iʿrāb al-Muyassar', NULL, NULL,
   'Modern', '#4A6E8A', '⊤',
   'مصدر إعراب مبسّط — إعراب لكل آية مع علامات بنية واضحة لكل كلمة.',
   'Per-ayah simplified iʿrāb. Each row is a single ayah with inline (TOKEN) anchors. Best for quick lookup.',
   1, 1),

  ('QR:WORK:QUL:JADWAL_IRAB', 'qul_jadwal_irab_quran',
   'الجدول في إعراب القرآن', 'Al-Jadwal fī Iʿrāb al-Qurʾān', 'محمود صافي', 'Maḥmūd Ṣāfī',
   'Modern', '#8B6E2F', 'ج',
   'إعراب القرآن مع أبواب اللغة والإعراب والصرف والبلاغة لكل مجموعة آيات.',
   'Comprehensive modern iʿrāb with iʿrāb / ṣarf / balāgha / fawāʾid sections per anchor group.',
   2, 1),

  ('QR:WORK:QUL:DAAS_IRAB', 'qul_irab_quran_daas',
   'إعراب القرآن لداعس', 'Iʿrāb al-Qurʾān (Daʿās)', 'أحمد عبيد الدعاس', 'Aḥmad ʿUbayd al-Daʿās',
   'Modern', '#6E588E', 'د',
   'مصدر إعراب على نمط الرموز داخل النص — تحليل دقيق لكل كلمة.',
   'Inline-token style iʿrāb. Granular per-word entries — the densest source in the corpus (59,160 entries).',
   3, 1),

  ('QR:WORK:QUL:DARWISH:IRAB', 'qul_irab_darwish',
   'إعراب القرآن الكريم وبيانه', 'Iʿrāb al-Qurʾān wa-Bayānuh', 'محيي الدين درويش', 'Muḥyī al-Dīn Darwīsh',
   'Modern (d. 1985 CE)', '#B0533A', 'ش',
   'إعراب وبيان مع أبواب اللغة والبلاغة — استخدام واسع للمراجع الثانوية.',
   'Iʿrāb with extensive language/balāgha sections. Heavy use of multi-ayah anchor groups (avg 4.5 ayāt/group).',
   4, 1),

  ('QR:WORK:QUL:TIBYAN:UKBARI', 'tibyan_ukbari_irab',
   'التبيان في إعراب القرآن', 'al-Tibyān fī Iʿrāb al-Qurʾān', 'أبو البقاء العكبري', 'Abū al-Baqāʾ al-ʿUkbarī',
   'Classical (d. 616 AH)', '#2F6E4F', 'ع',
   'أحد أوائل المصادر الكلاسيكية لعلم إعراب القرآن.',
   'Foundational classical iʿrāb commentary, transcribed from OpenITI Shamela. Parenthetical (token) entry markers.',
   5, 1),

  ('QR:WORK:QUL:DEP_GRAPHS', 'qul_dep_graphs',
   'الشجرة الإعرابية', 'Dependency Trees (QUL Treebank)', NULL, 'QUL Project',
   'Modern', '#6E665A', '⊕',
   'أشجار الإعراب البصرية لكل آية من مشروع QUL — رسوم SVG.',
   'Visual dependency trees from the QUL Quranic treebank. One SVG per ayah, served via /qr/irab/dep-graph.',
   6, 1);
