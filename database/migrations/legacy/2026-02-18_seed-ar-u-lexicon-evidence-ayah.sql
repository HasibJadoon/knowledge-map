PRAGMA foreign_keys=ON;

INSERT INTO ar_u_lexicon_evidence (
  ar_u_lexicon,
  evidence_id,
  locator_type,
  source_id,
  source_type,
  chunk_id,
  page_no,
  heading_raw,
  heading_norm,
  link_role,
  evidence_kind,
  evidence_strength,
  extract_text,
  note_md,
  meta_json
)
VALUES
  (
    'a2892f6a80e89c62b864ceb058757079827dd565c67029f51e03a9b3e062d6e3',
    'EVID:آية:تعريف:001',
    'chunk',
    'SRC:SINAI_KEY_TERMS',
    'book',
    'SRC:SINAI_KEY_TERMS:term:ayah:p:0118',
    118,
    'آية',
    'اية',
    'definition',
    'lexical',
    'primary',
    'āyah | sign; sign-pronouncement',
    'المعنى الأساسي: **علامة، دليل، إشارة**.
في السياق النصي قد تعني: وحدة وحي (sign-pronouncement).',
    json_object(
      'lemma_ar', 'آية',
      'section', 'core_gloss',
      'tags', json_array('تعريف', 'ترجمة'),
      'confidence', 'high'
    )
  ),
  (
    'a2892f6a80e89c62b864ceb058757079827dd565c67029f51e03a9b3e062d6e3',
    'EVID:آية:جاهلي:001',
    'chunk',
    'SRC:SINAI_KEY_TERMS',
    'book',
    'SRC:SINAI_KEY_TERMS:term:ayah:p:0118',
    118,
    'آية',
    'اية',
    'usage',
    'historical',
    'supporting',
    'Pre-Islamic poetry uses āyah for traces of deserted campsites pointing to former presence.',
    'الدلالة في الشعر الجاهلي:
الآية = أثر يدلّ على غائب (أطلال، آثار الديار).
دلالة سيميائية: الشيء يدل على ما وراءه.',
    json_object(
      'lemma_ar', 'آية',
      'period', 'pre_quranic',
      'semantic_field', 'علامة تدل على غائب',
      'confidence', 'high'
    )
  ),
  (
    'a2892f6a80e89c62b864ceb058757079827dd565c67029f51e03a9b3e062d6e3',
    'EVID:آية:قرآن:عام:001',
    'chunk',
    'SRC:SINAI_KEY_TERMS',
    'book',
    'SRC:SINAI_KEY_TERMS:term:ayah:p:0119',
    119,
    'آية',
    'اية',
    'usage',
    'semantic',
    'primary',
    'In the Qur’an, āyah overwhelmingly designates signs vouchsafed by God (āyāt Allāh).',
    'الاستعمال الغالب في القرآن:
آيات الله = دلائل إلهية.
غالباً تأتي مع: تُتلى، يُبيَّن، يُذكَّر بها.',
    json_object(
      'lemma_ar', 'آية',
      'quranic_pattern', 'آيات الله',
      'confidence', 'high'
    )
  ),
  (
    'a2892f6a80e89c62b864ceb058757079827dd565c67029f51e03a9b3e062d6e3',
    'EVID:آية:جدلي:001',
    'chunk',
    'SRC:SINAI_KEY_TERMS',
    'book',
    'SRC:SINAI_KEY_TERMS:term:ayah:p:0120',
    120,
    'آية',
    'اية',
    'supports',
    'semantic',
    'supporting',
    'Qur’anic āyāt are conceived as discursive, argumentative signs paired with ʿaqala.',
    'الآية ليست مجرد معجزة، بل دليل يخاطب العقل.
اقترانها بالفعل: يعقلون.
البعد الحجاجي واضح.',
    json_object(
      'lemma_ar', 'آية',
      'concept', 'حجاج عقلي',
      'related_root', 'عقل',
      'confidence', 'high'
    )
  ),
  (
    'a2892f6a80e89c62b864ceb058757079827dd565c67029f51e03a9b3e062d6e3',
    'EVID:آية:كونية:001',
    'chunk',
    'SRC:SINAI_KEY_TERMS',
    'book',
    'SRC:SINAI_KEY_TERMS:term:ayah:p:0121',
    121,
    'آية',
    'اية',
    'example',
    'thematic',
    'primary',
    'Natural phenomena such as rain, alternation of night and day, and creation are called āyāt.',
    'الآيات الكونية:
الخلق، المطر، تعاقب الليل والنهار، إحياء الأرض.
تدل على القدرة الإلهية واستمرار الفعل الإلهي.',
    json_object(
      'lemma_ar', 'آية',
      'category', 'آيات كونية',
      'confidence', 'high'
    )
  )
ON CONFLICT(ar_u_lexicon, evidence_id) DO UPDATE SET
  locator_type = excluded.locator_type,
  source_id = excluded.source_id,
  source_type = excluded.source_type,
  chunk_id = excluded.chunk_id,
  page_no = excluded.page_no,
  heading_raw = excluded.heading_raw,
  heading_norm = excluded.heading_norm,
  link_role = excluded.link_role,
  evidence_kind = excluded.evidence_kind,
  evidence_strength = excluded.evidence_strength,
  extract_text = excluded.extract_text,
  note_md = excluded.note_md,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');
