-- ============================================================
-- Seed: 2026-03-24 — Surah al-Rum 30:2-6 worldview clusters
-- Graph ID: WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1
-- Purpose:
-- 1. Persist the provided worldview cluster payload as wv_nodes.
-- 2. Attach each cluster node to Quran passage 30:2-6.
-- 3. Use stable passage-scoped ids so inserts do not require lookup.
-- ============================================================

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc001', 'wv_node:qs30_2_6:wvc001', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Historical Event Spine',
  'The verses present a concrete sequence: defeat, reversal, timing, divine control, believer joy.',
  'The verses present a concrete sequence: defeat, reversal, timing, divine control, believer joy.',
  'rum-30-2-6-historical-event-spine', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"quranic","sort_order":10,"source_payload_table":"wv_cluster","local_node_id":"WVC001"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"quranic","seed_kind":"wv_cluster","local_node_id":"WVC001","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc002', 'wv_node:qs30_2_6:wvc002', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Divine Sovereignty over History',
  'The passage frames history under Allah''s command rather than as autonomous material process.',
  'The passage frames history under Allah''s command rather than as autonomous material process.',
  'rum-30-2-6-divine-sovereignty-over-history', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"quranic","sort_order":20,"source_payload_table":"wv_cluster","local_node_id":"WVC002"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"quranic","seed_kind":"wv_cluster","local_node_id":"WVC002","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc003', 'wv_node:qs30_2_6:wvc003', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Revelation and Unseen Knowledge',
  'The future reversal is presented as revealed knowledge, not guesswork.',
  'The future reversal is presented as revealed knowledge, not guesswork.',
  'rum-30-2-6-revelation-and-unseen-knowledge', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"quranic","sort_order":30,"source_payload_table":"wv_cluster","local_node_id":"WVC003"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"quranic","seed_kind":"wv_cluster","local_node_id":"WVC003","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc004', 'wv_node:qs30_2_6:wvc004', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Time Constraint and Epistemic Force',
  'The phrase ''within a few years'' narrows the claim and raises evidentiary force.',
  'The phrase ''within a few years'' narrows the claim and raises evidentiary force.',
  'rum-30-2-6-time-constraint-and-epistemic-force', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"quranic","sort_order":40,"source_payload_table":"wv_cluster","local_node_id":"WVC004"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"quranic","seed_kind":"wv_cluster","local_node_id":"WVC004","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc005', 'wv_node:qs30_2_6:wvc005', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Believer Response and Sign',
  'The event carries meaning for believers and functions as a sign.',
  'The event carries meaning for believers and functions as a sign.',
  'rum-30-2-6-believer-response-and-sign', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"quranic","sort_order":50,"source_payload_table":"wv_cluster","local_node_id":"WVC005"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"quranic","seed_kind":"wv_cluster","local_node_id":"WVC005","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc006', 'wv_node:qs30_2_6:wvc006', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Naturalized Historical Reading',
  'The same verses are read as historically plausible political developments.',
  'The same verses are read as historically plausible political developments.',
  'rum-30-2-6-naturalized-historical-reading', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"secular_reading","sort_order":60,"source_payload_table":"wv_cluster","local_node_id":"WVC006"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"secular_reading","seed_kind":"wv_cluster","local_node_id":"WVC006","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc007', 'wv_node:qs30_2_6:wvc007', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Prophecy Reduced to Probability',
  'The future declaration is reduced to a probabilistic forecast rather than revelation.',
  'The future declaration is reduced to a probabilistic forecast rather than revelation.',
  'rum-30-2-6-prophecy-reduced-to-probability', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"secular_reading","sort_order":70,"source_payload_table":"wv_cluster","local_node_id":"WVC007"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"secular_reading","seed_kind":"wv_cluster","local_node_id":"WVC007","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc008', 'wv_node:qs30_2_6:wvc008', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Text as Product of Environment',
  'The text is read through surrounding historical and cultural discourse.',
  'The text is read through surrounding historical and cultural discourse.',
  'rum-30-2-6-text-as-product-of-environment', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"secular_reading","sort_order":80,"source_payload_table":"wv_cluster","local_node_id":"WVC008"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"secular_reading","seed_kind":"wv_cluster","local_node_id":"WVC008","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc009', 'wv_node:qs30_2_6:wvc009', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Transmission and Natural Sufficiency',
  'Even where channels are unclear, explanation remains within naturalistic assumptions.',
  'Even where channels are unclear, explanation remains within naturalistic assumptions.',
  'rum-30-2-6-transmission-and-natural-sufficiency', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"secular_reading","sort_order":90,"source_payload_table":"wv_cluster","local_node_id":"WVC009"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"secular_reading","seed_kind":"wv_cluster","local_node_id":"WVC009","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc010', 'wv_node:qs30_2_6:wvc010', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Secular Methodological Framework',
  'The secular reading is generated by prior rules about valid explanation.',
  'The secular reading is generated by prior rules about valid explanation.',
  'rum-30-2-6-secular-methodological-framework', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"framework","sort_order":100,"source_payload_table":"wv_cluster","local_node_id":"WVC010"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"framework","seed_kind":"wv_cluster","local_node_id":"WVC010","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc011', 'wv_node:qs30_2_6:wvc011', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Neutrality Claim vs Actual Framework',
  'The reading may present itself as neutral, but it is shaped by a prior framework.',
  'The reading may present itself as neutral, but it is shaped by a prior framework.',
  'rum-30-2-6-neutrality-claim-vs-actual-framework', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"framework","sort_order":110,"source_payload_table":"wv_cluster","local_node_id":"WVC011"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"framework","seed_kind":"wv_cluster","local_node_id":"WVC011","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_nodes (
  id, canonical_input, workspace_id, group_id, user_id,
  node_type, title, text_plain, summary, slug, status, data_json, meta_json
) VALUES (
  'wv_node_qs30_2_6_wvc012', 'wv_node:qs30_2_6:wvc012', 'ws_quran', 'grp_tafsir', 1,
  'cluster', 'Framework vs Framework',
  'The deepest disagreement is about what kinds of explanation are allowed.',
  'The deepest disagreement is about what kinds of explanation are allowed.',
  'rum-30-2-6-framework-vs-framework', 'active',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","worldview_side":"framework","sort_order":120,"source_payload_table":"wv_cluster","local_node_id":"WVC012"}',
  '{"graph_id":"WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1","passage_ref":"30:2-6","surah":30,"ayah_from":2,"ayah_to":6,"worldview_side":"framework","seed_kind":"wv_cluster","local_node_id":"WVC012","node_id_prefix":"qs30_2_6"}'
) ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_type = excluded.node_type,
  title = excluded.title,
  text_plain = excluded.text_plain,
  summary = excluded.summary,
  slug = excluded.slug,
  status = excluded.status,
  data_json = excluded.data_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

INSERT INTO wv_node_quran_links (
  id, canonical_input, workspace_id, group_id, user_id,
  node_id, target_type, target_ref, relation, quran_evidence_json, note
) VALUES
(
  'wql_rum_30_2_6_wvc001', 'wv_node_quran_link:qs30_2_6:wvc001',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc001', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Historical Event Spine'
),
(
  'wql_rum_30_2_6_wvc002', 'wv_node_quran_link:qs30_2_6:wvc002',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc002', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Divine Sovereignty over History'
),
(
  'wql_rum_30_2_6_wvc003', 'wv_node_quran_link:qs30_2_6:wvc003',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc003', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Revelation and Unseen Knowledge'
),
(
  'wql_rum_30_2_6_wvc004', 'wv_node_quran_link:qs30_2_6:wvc004',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc004', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Time Constraint and Epistemic Force'
),
(
  'wql_rum_30_2_6_wvc005', 'wv_node_quran_link:qs30_2_6:wvc005',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc005', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Believer Response and Sign'
),
(
  'wql_rum_30_2_6_wvc006', 'wv_node_quran_link:qs30_2_6:wvc006',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc006', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Naturalized Historical Reading'
),
(
  'wql_rum_30_2_6_wvc007', 'wv_node_quran_link:qs30_2_6:wvc007',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc007', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Prophecy Reduced to Probability'
),
(
  'wql_rum_30_2_6_wvc008', 'wv_node_quran_link:qs30_2_6:wvc008',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc008', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Text as Product of Environment'
),
(
  'wql_rum_30_2_6_wvc009', 'wv_node_quran_link:qs30_2_6:wvc009',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc009', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Transmission and Natural Sufficiency'
),
(
  'wql_rum_30_2_6_wvc010', 'wv_node_quran_link:qs30_2_6:wvc010',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc010', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Secular Methodological Framework'
),
(
  'wql_rum_30_2_6_wvc011', 'wv_node_quran_link:qs30_2_6:wvc011',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc011', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Neutrality Claim vs Actual Framework'
),
(
  'wql_rum_30_2_6_wvc012', 'wv_node_quran_link:qs30_2_6:wvc012',
  'ws_quran', 'grp_tafsir', 1, 'wv_node_qs30_2_6_wvc012', 'ayah', '30:2-6', 'about',
  '{"surah":30,"ayah_from":2,"ayah_to":6,"passage_ref":"30:2-6","node_id_prefix":"qs30_2_6"}',
  'Framework vs Framework'
)
ON CONFLICT(id) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  workspace_id = excluded.workspace_id,
  group_id = excluded.group_id,
  user_id = excluded.user_id,
  node_id = excluded.node_id,
  target_type = excluded.target_type,
  target_ref = excluded.target_ref,
  relation = excluded.relation,
  quran_evidence_json = excluded.quran_evidence_json,
  note = excluded.note,
  updated_at = datetime('now');
