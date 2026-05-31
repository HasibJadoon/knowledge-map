-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_worldview — Arjana Ch.1 reading sessions (content + illustration links)
-- File : database/seeds/seed-wv-arjana-mwi-reading-sessions.sql
-- DB   : km_worldview   (binding: DB_WV)
-- Run  : wrangler d1 execute km_worldview --file=... --remote
--
-- Chapter 1 (sru-arjana-mwi-ch1) is split into two reading sessions. Each gets a
-- clean title and an executive summary that covers all of its concepts, plus a
-- major_points list (the concept titles). The chapter's 13 concept illustrations
-- are linked to their session: orders 1-7 → Session 1, orders 8-13 → Session 2.
-- ═══════════════════════════════════════════════════════════════════════════

-- Session 1 — Orientalism / the theoretical apparatus (concepts 1-7)
UPDATE wv_reading_sessions
   SET title = 'Session 1 · The Orientalist Apparatus',
       summary_md = 'How the Western imagination manufactures the Muslim monster. Orientalism is not one idea but five overlapping registers — a colonial language, a classification system, an artistic movement, an academic discipline, and an attitude — that together authenticate the fantasy rather than invent it. The discourse works in three layers and migrates from open polemic into the authority of scholarship: philology hardens cultural difference into a quasi-biological subspecies placed outside modernity. The imagined Muslim is then split into a gendered double image — the threatening male and the eroticised female — an ambivalence in which revulsion and desire for the monster coexist.',
       meta_json = '{"blocks":52,"nodes":44,"edges":81,"clusters":3,"timeline_events":10,"evidence":6,"questions":4,"claims":5,"highlights":3,"notes":1,"body_text":"pending_pdf_ingest","major_points":["Orientalism is five things at once","It authenticates — it does not invent","Three layers, not one","From polemic to “scholarship”","Philology → subspecies → outside modernity","The gendered double image","Desiring the monster"]}',
       updated_at = '2026-05-31T00:00:00Z'
 WHERE id = 'rs-arjana-mwi-ch1';

-- Session 2 — teratology / the logic of the monster (concepts 8-13)
UPDATE wv_reading_sessions
   SET title = 'Session 2 · The Logic of the Monster',
       summary_md = 'From Orientalism to teratology — the logic of monsters themselves. Monsters police the boundary of the human: naming what is not-human is how a culture defines what counts as human. Arjana ranges the threatening other along a spectrum from the almost-human, through the monster, to the alien, and reads monster-making as scapegoating that discharges collective anxiety onto a single figure. She traces the classical and medieval roots of the trope — including the recurring conflation of Jew and Muslim — and the shift from a pre-modern world of fixed monstrous races to the mobile, shape-shifting Gothic monster. It closes by defining the monster with and beyond David Gilmore: a culturally made embodiment of dread.',
       meta_json = '{"intent":"First read-through; capture highlights and notes on the Muslim-monster trope and Orientalism.","major_points":["Teratology: monsters draw the human boundary","The almost human, the monster, the alien","Monster-making as scapegoating","Classical roots & the Jewish-Muslim conflation","Pre-modern fixity → Gothic mobility","Defining the monster: Gilmore and beyond"]}',
       updated_at = '2026-05-31T00:00:00Z'
 WHERE id = 'wvrs-arjana-mwi-001';

-- Link concept illustrations to their reading session.
UPDATE wv_source_unit_illustrations
   SET reading_session_id = 'rs-arjana-mwi-ch1', updated_at = '2026-05-31T00:00:00Z'
 WHERE source_unit_id = 'sru-arjana-mwi-ch1' AND order_index BETWEEN 1 AND 7;

UPDATE wv_source_unit_illustrations
   SET reading_session_id = 'wvrs-arjana-mwi-001', updated_at = '2026-05-31T00:00:00Z'
 WHERE source_unit_id = 'sru-arjana-mwi-ch1' AND order_index BETWEEN 8 AND 13;
