-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: first-class questions + topics for the Introduction of
--       "Muslims in the Western Imagination" (Arjana).
-- DB     : km_worldview   (wv_topics, wv_questions)
-- Idempotent via INSERT OR REPLACE on stable ids / unique keys.
-- Applied: live km_worldview on 2026-05-31.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Topics ────────────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO wv_topics (id, topic_key, title, topic_domain, description_md) VALUES
  ('wv-topic-arjana-muslim-monster',          'arjana-muslim-monster',          'Muslim monster',                'ideological',  'The recurring imaginative figure of the Muslim as monster across Western cultural production.'),
  ('wv-topic-arjana-islamophobia-imaginaire', 'arjana-islamophobia-imaginaire', 'Islamophobia vs. imaginaire',   'ideological',  'Distinguishing present-day Islamophobia from the long-running Western imaginaire that produces it.'),
  ('wv-topic-arjana-dehumanization-biopower', 'arjana-dehumanization-biopower', 'Dehumanization & biopower',     'philosophical','Dehumanization, bare life, and biopower as analytic frame for the monster trope.'),
  ('wv-topic-arjana-sexualization',           'arjana-sexualization',           'Sexualization',                 'sociological', 'Sexualized fantasies projected onto Muslim bodies.'),
  ('wv-topic-arjana-racialization',           'arjana-racialization',           'Racialization',                 'sociological', 'Racial coding of Muslims, fused with fantasies about Jewish and African bodies.'),
  ('wv-topic-arjana-genealogy-method',        'arjana-genealogy-method',        'Genealogy method',              'philosophical','The genealogical method tracing a continuous lineage of the figure rather than discrete events.'),
  ('wv-topic-arjana-monster-typology',        'arjana-monster-typology',        'Monster typology',              'historical',   'Typology of monster figures across eras (Saracen, Turk, Barbary, alien).'),
  ('wv-topic-arjana-real-bodies-stake',       'arjana-real-bodies-stake',       'The real-bodies stake',         'ethical',      'The central stake: how imaginary figures license harm against real human beings.');

-- ── Questions ─────────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO wv_questions (id, question_text, question_type, topic_id, status, meta_json) VALUES
  ('wv-q-arjana-root',     'How did the West arrive at hijab bans, Abu Ghraib, and Guantanamo?',                 'root',     'wv-topic-arjana-muslim-monster',          'open', json('{"role":"root","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}')),
  ('wv-q-arjana-pivot',    'Not "why do they hate us?" but "why do we fear them?"',                              'pivot',    'wv-topic-arjana-islamophobia-imaginaire', 'open', json('{"role":"pivot","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}')),
  ('wv-q-arjana-central',  'What is the relationship between imaginary characters and real human beings?',       'central',  'wv-topic-arjana-real-bodies-stake',       'open', json('{"role":"central","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}')),
  ('wv-q-arjana-setup',    'Why did medieval Christians create Muslim monsters?',                                'setup',    'wv-topic-arjana-muslim-monster',          'open', json('{"role":"setup","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}')),
  ('wv-q-arjana-obj1',     'Do positive figures like Salahuddin refute the thesis?',                             'objection','wv-topic-arjana-monster-typology',        'open', json('{"role":"objection","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}')),
  ('wv-q-arjana-obj2',     'Have these images reached enough people to matter?',                                 'objection','wv-topic-arjana-genealogy-method',        'open', json('{"role":"objection","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}'));
