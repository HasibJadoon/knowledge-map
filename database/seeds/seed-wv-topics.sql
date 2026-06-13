-- ─── Worldview topic seed: Said / Orientalism (km_worldview) ──────────────────
-- Adds the Edward Said "Orientalism" (1978) topics referenced by the worldview
-- document seed, so those documents group under their sub-domain → topic in the
-- Ionic worldview docs tree. The existing 13 Rumi + Arjana topics already ship.
--
-- Target database: km_worldview  (wv_topics)
--
-- Apply:
--   wrangler d1 execute km_worldview --remote \
--     --config workers/worldview/wrangler.toml \
--     --file database/seeds/seed-wv-topics.sql
--
-- Re-runnable via INSERT OR IGNORE.

INSERT OR IGNORE INTO wv_topics (id, topic_key, title, topic_domain, description_md)
VALUES
 ('wv-topic-said-orientalism-discourse','said-orientalism-discourse','Orientalism as discourse','ideological','Orientalism as a Western style for dominating, restructuring, and having authority over the Orient.'),
 ('wv-topic-said-imaginative-geography','said-imaginative-geography','Imaginative geography (Orient/Occident)','historical','The constructed Orient/Occident divide that maps difference onto space.'),
 ('wv-topic-said-latent-manifest','said-latent-manifest','Latent & manifest Orientalism','philosophical','The stable unconscious (latent) versus stated (manifest) forms of Orientalist knowledge.'),
 ('wv-topic-said-knowledge-power','said-knowledge-power','Knowledge & power','philosophical','Foucauldian reading: knowledge of the Orient as an instrument of colonial power.'),
 ('wv-topic-said-representation-other','said-representation-other','Representation & the Other','sociological','The Orient as Europe''s silent Other, spoken for rather than speaking.');
