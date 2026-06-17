-- Seed: Surah 39 (az-Zumar) deeper-dive analysis layer for km_quran.
-- Domain: QR. Database: km_quran (binding DB_QR).
--
-- Companion to seed-qr-surah39-passages.sql (which builds the 8 ruku
-- passages + study passages). This file adds the surrounding analysis:
-- surah profiles, the macro topic-flow, structure reading/units/links,
-- symmetry, analysis scopes + claims, rhetorical-question nuances, the
-- topic + worldview concept map, arguments, interpretive differences,
-- Quran-by-Quran cross references, and the passage analysis cache that
-- records tafsir / i'rab source coverage.
--
-- Idempotent: surah-39-scoped rows are deleted first (child before parent
-- for FK safety), then re-inserted with deterministic typed ids. NOTE: on
-- Cloudflare D1, INSERT OR REPLACE on FK-bearing tables can trip the FK
-- check during the implicit delete, so this file uses DELETE + plain INSERT
-- throughout.
--
-- Apply:
--   wrangler d1 execute km_quran --remote --config workers/quran/wrangler.toml \
--     --file database/seeds/seed-qr-surah39-analysis.sql

-- ─── Idempotency: clear surah-39 scoped rows (child tables first) ─────────────
DELETE FROM qr_passage_analysis_cache   WHERE surah=39;
DELETE FROM qr_argument_relations       WHERE id LIKE 'QR:ARGR:39:%';
DELETE FROM qr_arguments                WHERE id LIKE 'QR:ARG:39:%';
DELETE FROM qr_worldview_edges          WHERE id LIKE 'QR:WVE:39:%';
DELETE FROM qr_worldview_nodes          WHERE id LIKE 'QR:WVN:39:%';
DELETE FROM qr_scope_topics             WHERE id LIKE 'QR:ST:39:%';
DELETE FROM qr_scope_nuances            WHERE id LIKE 'QR:NU:39:%';
DELETE FROM qr_analysis_claims          WHERE id LIKE 'QR:AC:39:%';
DELETE FROM qr_analysis_scopes          WHERE id LIKE 'QR:AS:39:%';
DELETE FROM qr_interpretive_differences WHERE id LIKE 'QR:ID:39:%';
DELETE FROM qr_quran_bil_quran_relations WHERE id LIKE 'QR:QBQ:39:%';
DELETE FROM qr_surah_structure_links    WHERE id LIKE 'QR:SL:39:%';
DELETE FROM qr_surah_structure_units    WHERE id LIKE 'QR:SU:39:%';
DELETE FROM qr_surah_structure_readings WHERE id = 'QR:SR:39:panels';
DELETE FROM qr_surah_symmetry_patterns  WHERE id LIKE 'QR:SYM:39:%';
DELETE FROM qr_surah_sequence_patterns  WHERE surah=39;
DELETE FROM qr_surah_topic_flows        WHERE surah=39;
DELETE FROM qr_surah_structural_pivots  WHERE surah=39;
DELETE FROM qr_surah_register_shifts    WHERE surah=39;
DELETE FROM qr_surah_motif_clusters     WHERE surah=39;
DELETE FROM qr_surah_coherence_signals  WHERE surah=39;

-- ─── Surah-level profiles ─────────────────────────────────────────────────────
INSERT OR REPLACE INTO qr_surah_theme_profiles (surah, primary_theme, secondary_themes, theological_axis, ethical_axis)
VALUES (39,
 'Sincere, exclusive devotion to God (ikhlas al-din) and the sorting of humanity into two final destinies',
 '["tawhid versus shirk","Gods sovereignty over life, death, sleep and provision","divine mercy and the open door of repentance","resurrection and the judgment of the throngs (zumar)","the Quran as the best and most consistent discourse (ahsan al-hadith)"]',
 'God alone deserves worship; to Him belongs all intercession, the keys of the heavens and the earth, and the judgment rendered in truth',
 'Sincerity, patience, gratitude and repentance set against arrogance, ingratitude and despair of mercy');

INSERT OR REPLACE INTO qr_surah_profiles (surah, governing_movement, central_claim, opening_force, closure_force, dominant_addressee, dominant_tone, note_md)
VALUES (39,
 'A hortatory movement from the demand for pure worship toward the sorting of humanity into two throngs at the Judgment',
 'Religion belongs purely to God: sincere servants are saved while the arrogant deniers are driven to the Fire, yet the door of mercy stays open until death',
 'Declarative revelation - the Book sent down from the Mighty, the Wise, demanding al-din al-khalis',
 'Eschatological resolution - the two throngs judged in truth, sealed with al-hamdu lillahi rabb al-alamin',
 'The Prophet, and through him the mushrikun of Mecca alongside the believing servants',
 'Majestic, admonitory and pleading, oscillating between warning and mercy',
 '{"revelation":"makki","ayahs":75,"rukus":8,"name_ar":"الزمر","name_en":"The Throngs","climax_passage":6,"inclusio":[1,75],"naming_scene":"71-74"}');

INSERT OR REPLACE INTO qr_surah_atomic_profiles (surah, atomic_center, atomic_center_ar, structural_type, structural_type_note, resolution_pattern, interpretive_lens, note_md)
VALUES (39,
 'Worship belongs purely to God, who alone holds life, death, mercy and judgment',
 'إخلاص الدين لله الواحد القهار',
 'hortatory-eschatological',
 'A sustained call-and-warning that channels every image (revelation, sleep, provision, the folded heavens) toward the single demand of sincere, exclusive worship',
 'tension-to-verdict: the dispute over who deserves worship is suspended through the surah and resolved at the Judgment when the throngs are sorted',
 'Read each panel as advancing the case for ikhlas al-din; the mercy verse (53) is the hinge that keeps the verdict from being mere threat',
 '{"name_en":"The Throngs","makki":true}');

INSERT OR REPLACE INTO qr_surah_theology_profiles (surah, divine_attributes, prophethood_aspects, eschatology_aspects, cosmology_aspects, note_md)
VALUES (39,
 'al-Aziz, al-Hakim (1); al-Wahid al-Qahhar (4); al-Ghafur al-Rahim (53); holder of the keys (maqalid) of the heavens and earth (63); the One who takes souls in death and sleep (42); sole owner of all intercession (44)',
 'The Prophet is commanded to pure worship and to be first of those who submit (11-12); he is a warner, not a guardian over them (41); revelation descends in truth for all mankind (41)',
 'Sleep as a minor death and the soul withheld (42); the trumpet, swoon and resurrection (68); the illumined earth, the open record and witnesses (69); the two throngs driven to Fire and Garden (71-74); judgment sealed in truth with universal praise (75)',
 'The heavens folded in His right hand and the earth in His grasp (67); rain channeled into springs then crops then debris (21); night and day wrapped over one another (5)',
 '{"kalam_note":"v.67 (the folded heavens / qabda) is a classic locus of the tashbih-tanzih debate"}');

INSERT OR REPLACE INTO qr_surah_worldview_profiles (surah, anthropology_notes, value_architecture, moral_universe, divine_human_rel, worldview_tensions, note_md)
VALUES (39,
 'The human is volatile: ungrateful in ease and prayerful in distress (8,49), yet capable of a breast opened to light (22) or a heart hardened to stone (22); humanity finally divides not by tribe but by the object of its worship',
 'Sincerity (ikhlas), patience (sabr), gratitude (shukr) and hope-without-despair are ranked above wealth, which cannot ransom a soul (47)',
 'A two-outcome universe in which every soul is repaid in full (70), but whose moral arc bends toward mercy: all sins are forgivable to those who turn back before death (53)',
 'God is sovereign owner of soul, sleep, provision and intercession; the human stands as servant (abd) summoned to recognise that ownership and worship accordingly',
 'Mercy versus justice (the all-forgiving God who still drives the throngs to Fire); divine transcendence versus the vivid image of the folded heavens; human freedom versus the decree that takes the soul at its appointed term',
 '{"key_pairing":"despair(qunut) vs hope(rahma)"}');

INSERT OR REPLACE INTO qr_surah_rhetoric_profiles (surah, dominant_mode, clause_density, emphasis_patterns, suspension_use, contrast_patterns, rhetorical_devices, note_md)
VALUES (39,
 'admonition and disputation driven by the imperative qul (Say) and the rhetorical question (istifham)',
 'medium-high, with frequent inna/innama emphasis and conditional fa-clauses',
 'innama yatadhakkaru ulul albab (9); inna Allaha yaghfir al-dhunuba jamian (53); repeated innama and the vocative ya ibadi (10,53)',
 'The verdict of worship is suspended across the surah and released only at the throngs scene (71-75); several rhetorical questions open without stated answer (amman, afaman)',
 'knower vs ignorant (9); opened breast vs hardened heart (22); the co-owned slave vs the single-master slave (29); Hell-bound throngs vs Garden-bound throngs (71-73)',
 'istifham inkari (rhetorical denial), darb al-mathal (parable), iltifat (address shift between Prophet, deniers and servants), taqdim for emphasis, the qul refrain, and the framing inclusio of praise',
 '{"signature_device":"istifham (the surah turns on unanswered rhetorical questions)"}');

INSERT OR REPLACE INTO qr_surah_clause_patterns (surah, dominant_clause_type, nominal_clause_pct, verbal_clause_pct, conditional_count, oath_count, interrogative_count, dominant_mood, note_md)
VALUES (39, 'mixed, leaning verbal with strong nominal theological declaratives', 0.42, 0.58, 6, 0, 9,
 'imperative-admonitory (qul) interlaced with declarative theology',
 '{"note":"counts are analytic estimates over the 75 ayat, highlighting the heavy interrogative load (istifham) and the qul imperatives rather than exhaustive parse"}');

INSERT OR REPLACE INTO qr_surah_openings (surah, ayah_from, ayah_to, opening_type, rhetorical_force, sets_up_md, note_md)
VALUES (39, 1, 4, 'revelation_declaration',
 'Begins not with an oath or letters but with the bare fact of descent: tanzil al-kitab min Allah al-Aziz al-Hakim, grounding authority in the Sender before any command',
 'The opening fixes two attributes (Might and Wisdom) and the demand for al-din al-khalis that the whole surah will defend, and previews al-Wahid al-Qahhar who will judge the throngs at the close',
 '{"opening_words":"تنزيل الكتاب من الله العزيز الحكيم"}');

INSERT OR REPLACE INTO qr_surah_closures (surah, ayah_from, ayah_to, closure_type, echo_of_opening, rhetorical_force, note_md)
VALUES (39, 71, 75, 'eschatological_resolution', 1,
 'The suspended dispute over worship is settled in court: the two throngs are sorted, angels encircle the Throne, and the surah ends on al-hamd lillahi rabb al-alamin, answering the opening tanzil with closing praise',
 '{"inclusio":"revelation(1) -> praise(75)","names_surah":"zumar (71,73)"}');

-- ─── Macro topic-flow diagram (8 nodes) ───────────────────────────────────────
INSERT INTO qr_surah_topic_flows (id, surah, flow_index, ayah_from, ayah_to, topic_label, topic_label_ar, flow_direction, transitions_from_id, note_md) VALUES
('QR:FLOW:39:1',39,1,1,9,'Revelation and the demand for pure devotion','تنزيل الكتاب وإخلاص الدين','opening',NULL,'{"node":1,"role":"thesis"}'),
('QR:FLOW:39:2',39,2,10,21,'Command to sincere submission; the two destinies foreshadowed','الأمر بالإخلاص والمصيرين','development','QR:FLOW:39:1','{"node":2,"role":"exhortation","fork":["fire layers","shaded chambers"]}'),
('QR:FLOW:39:3',39,3,22,31,'Open breast versus hardened hearts; the best discourse','شرح الصدر مقابل قسوة القلوب','contrast','QR:FLOW:39:2','{"node":3,"role":"antithesis"}'),
('QR:FLOW:39:4',39,4,32,41,'Truth versus fabrication; the sufficiency of God','الصدق مقابل الكذب وكفاية الله','disputation','QR:FLOW:39:3','{"node":4,"role":"forensic"}'),
('QR:FLOW:39:5',39,5,42,52,'Sovereignty over souls and provision; the test','توفي الأنفس وبسط الرزق والفتنة','development','QR:FLOW:39:4','{"node":5,"role":"sovereignty-signs"}'),
('QR:FLOW:39:6',39,6,53,63,'Do not despair of mercy; repent before the punishment','لا تقنطوا من رحمة الله','climax','QR:FLOW:39:5','{"node":6,"role":"emotional-climax","center":true}'),
('QR:FLOW:39:7',39,7,64,70,'Tawhid demanded; divine majesty; judgment begins','إنكار الشرك وعظمة الله ومشهد القيامة','ascent','QR:FLOW:39:6','{"node":7,"role":"ascent-to-court"}'),
('QR:FLOW:39:8',39,8,71,75,'The throngs driven to Fire and Garden; closing praise','سوق الزمر وختام الحمد','resolution','QR:FLOW:39:7','{"node":8,"role":"finale","inclusio_with":1}');

-- ─── Structure reading + 8 panel units + links ────────────────────────────────
INSERT INTO qr_surah_structure_readings (id, surah, reading_label, structure_type, scholar_ref, paradigm_ref, confidence, summary_md, note_md)
VALUES ('QR:SR:39:panels', 39,
 'Eight-panel hortatory movement (by ruku)',
 'thematic_panels', NULL, 'thematic-coherence', 'proposed',
 'Surah az-Zumar unfolds as eight thematic panels that coincide with its eight ruku divisions, framed by a praise-inclusio (tanzil at 1 / al-hamd at 75) and turning on the mercy panel (53-63) as rhetorical center.',
 '{"basis":"ruku","panels":8,"climax_panel":6,"inclusio":[1,75]}');

INSERT INTO qr_surah_structure_units (id, surah, unit_index, ayah_from, ayah_to, unit_role, label, reading_id, note_md) VALUES
('QR:SU:39:1',39,1,1,9,'opening','Revelation and pure devotion','QR:SR:39:panels','{"shape":"declaration-to-contrast"}'),
('QR:SU:39:2',39,2,10,21,'exhortation','Command to sincere submission','QR:SR:39:panels','{"shape":"fork"}'),
('QR:SU:39:3',39,3,22,31,'contrast','Light of Islam vs hardened hearts','QR:SR:39:panels','{"shape":"antithesis"}'),
('QR:SU:39:4',39,4,32,41,'disputation','Truth vs fabrication; Gods sufficiency','QR:SR:39:panels','{"shape":"argument"}'),
('QR:SU:39:5',39,5,42,52,'sovereignty','Souls, intercession and the test','QR:SR:39:panels','{"shape":"signs-to-test"}'),
('QR:SU:39:6',39,6,53,63,'climax','Mercy and the call to repent','QR:SR:39:panels','{"shape":"appeal","center":true}'),
('QR:SU:39:7',39,7,64,70,'ascent','Tawhid demand and divine majesty','QR:SR:39:panels','{"shape":"ascent"}'),
('QR:SU:39:8',39,8,71,75,'finale','The throngs; closing praise','QR:SR:39:panels','{"shape":"diptych+coda"}');

INSERT INTO qr_surah_structure_links (id, surah, from_unit_id, to_unit_id, link_type, link_evidence, note_md) VALUES
('QR:SL:39:inclusio',39,'QR:SU:39:1','QR:SU:39:8','inclusio','Opening tanzil and the Mighty/Wise (1) answered by the closing al-hamd and judgment in truth (75)','{}'),
('QR:SL:39:worship-verdict',39,'QR:SU:39:1','QR:SU:39:8','thesis_resolution','The demand for al-din al-khalis (2-3) is adjudicated when the throngs are sorted by what they worshipped (71-74)','{}'),
('QR:SL:39:ignorant-echo',39,'QR:SU:39:1','QR:SU:39:7','lexical_echo','hal yastawi alladhina yalamun (9) echoed by ayyuha al-jahilun (64)','{}'),
('QR:SL:39:mercy-axis',39,'QR:SU:39:6','QR:SU:39:8','climax_to_resolution','The open door of mercy (53) frames why the final sorting is just','{}');

-- ─── Symmetry: praise inclusio with a central mercy axis ──────────────────────
INSERT INTO qr_surah_symmetry_patterns (id, surah, structure_reading_id, pattern_type, center_ayah_from, center_ayah_to, pattern_notation, pairs_json, summary_md, note_md)
VALUES ('QR:SYM:39:inclusio', 39, 'QR:SR:39:panels', 'inclusio_with_central_axis', 53, 63,
 'A … X(mercy) … A-prime',
 '[{"label":"A / A-prime — praise frame","left":{"ayah":1,"theme":"tanzil from the Mighty, the Wise"},"right":{"ayah":75,"theme":"al-hamd lillahi rabb al-alamin"}},{"label":"B / B-prime — worship demanded vs throngs sorted","left":{"ayah":"2-3","theme":"al-din al-khalis is demanded"},"right":{"ayah":"71-74","theme":"the zumar driven to Fire and to the Garden"}},{"label":"C / C-prime — knowers vs ignorant","left":{"ayah":9,"theme":"are those who know equal to those who do not?"},"right":{"ayah":64,"theme":"do you bid me worship others, O ignorant ones?"}},{"center":{"ayah":"53-63","theme":"do not despair of the mercy of God"}}]',
 'The surah is framed by an inclusio of praise and turns on a central axis of mercy (53-63); around it the worship-demand near the opening answers the sorting of the throngs near the end, and v.9 (knowers vs ignorant) echoes v.64 (rebuke of the ignorant).',
 '{"confidence":"proposed","type":"inclusio","axis":"mercy(53)"}');

-- ─── Structural pivots / register shifts / motifs / coherence / sequence ──────
INSERT INTO qr_surah_structural_pivots (id, surah, pivot_index, ayah, pivot_type, description, note_md) VALUES
('QR:PIV:39:1',39,1,9,'rhetorical_question','The first great istifham (amman huwa qanit ... hal yastawi) pivots from declaration to the surahs governing knower/ignorant contrast','{}'),
('QR:PIV:39:2',39,2,23,'meta_textual','The Book describes itself as ahsan al-hadith, kitaban mutashabihan mathani','{}'),
('QR:PIV:39:3',39,3,53,'tonal_reversal','The hinge from warning to mercy: ya ibadiya alladhina asrafu ... la taqnatu','{"center":true}'),
('QR:PIV:39:4',39,4,68,'scene_change','The trumpet blast switches from argument to eschatological narration','{}');

INSERT INTO qr_surah_register_shifts (id, surah, ayah_shift, shift_axis, from_state, to_state, note_md) VALUES
('QR:RS:39:1',39,10,'addressee','address to the Prophet and the deniers','direct call to the believing servants (qul ya ibadi)','{}'),
('QR:RS:39:2',39,53,'tone','threat and admonition','consolation and mercy (do not despair)','{"pivotal":true}'),
('QR:RS:39:3',39,64,'addressee','consoling the believers','sharp challenge to the mushrikun (ayyuha al-jahilun)','{}'),
('QR:RS:39:4',39,68,'mode','disputation in the present','eschatological narration of the Day','{}');

INSERT INTO qr_surah_motif_clusters (id, surah, cluster_label, cluster_label_ar, motif_keys, ayah_range_json, semantic_role, note_md) VALUES
('QR:MOT:39:zumar',39,'Throngs / groups','الزمر','["zumar","driven (siqa)","gates","keepers"]','[{"from":71,"to":74}]','The naming motif: humanity moves in crowds toward two opposite gates','{"hapax":"zumar is the surahs signature word"}'),
('QR:MOT:39:light',39,'Light and illumination','النور','["nur min rabbih (22)","ashraqat al-ard bi nur rabbiha (69)"]','[{"from":22,"to":22},{"from":69,"to":69}]','Light marks both the opened breast in this life and the illumined earth at Judgment','{}'),
('QR:MOT:39:heart',39,'States of the heart','القلوب','["sharh al-sadr (22)","qasiya qulubuhum (22)","wajilat qulubuhum (45)"]','[{"from":22,"to":23},{"from":45,"to":45}]','The heart as the organ that opens to light or hardens against remembrance','{}'),
('QR:MOT:39:soul-death',39,'Soul, sleep and death','النفس والموت','["yatawaffa al-anfus (42)","manam (42)","ajal musamma (42)"]','[{"from":42,"to":42}]','Sleep as a nightly death dramatizes Gods grip on the soul','{}'),
('QR:MOT:39:servants',39,'My servants (ibadi)','عبادي','["ya ibadi (10)","ya ibadiya alladhina asrafu (53)","kafin abdahu (36)"]','[{"from":10,"to":10},{"from":36,"to":36},{"from":53,"to":53}]','The vocative ibadi binds command, sufficiency and mercy','{}'),
('QR:MOT:39:say',39,'The Say (qul) refrain','قل','["qul (9,10,11,13,14,15,43,46,53,64,66)"]','[{"from":9,"to":66}]','The imperative qul structures the surah as a relayed proclamation','{}');

INSERT INTO qr_surah_coherence_signals (id, surah, signal_type, description, ayahs_json, note_md) VALUES
('QR:CS:39:qul',39,'refrain','The imperative qul (Say) recurs as a proclamation refrain','[9,10,11,13,14,15,43,46,53,64,66]','{}'),
('QR:CS:39:ibad',39,'lexical_repetition','The vocative/possessive ibad threads command (10), sufficiency (36) and mercy (53)','[10,16,36,53]','{}'),
('QR:CS:39:istifham',39,'rhetorical_pattern','A chain of unanswered rhetorical questions carries the argument','[9,19,21,22,24,32,36,38,52,64]','{}'),
('QR:CS:39:zumar',39,'keyword_pair','zumar appears at 71 and 73 to pair the two processions','[71,73]','{}'),
('QR:CS:39:hamd-inclusio',39,'ring_inclusio','Revelation (1) and closing al-hamd (75) frame the surah','[1,75]','{}'),
('QR:CS:39:ulul-albab',39,'lexical_repetition','ulul albab marks the reflective ideal','[9,18,21]','{}');

INSERT INTO qr_surah_sequence_patterns (id, surah, sequence_type, stages_json, description, note_md)
VALUES ('QR:SEQ:39:judgment', 39, 'judgment_procession',
 '[{"stage":1,"ayah":"68","label":"the trumpet: all swoon, then a second blast and they rise"},{"stage":2,"ayah":"69","label":"the earth shines with its Lords light; the record laid down"},{"stage":3,"ayah":"69","label":"prophets and witnesses brought"},{"stage":4,"ayah":"69-70","label":"judgment in truth; every soul repaid"},{"stage":5,"ayah":"71-72","label":"deniers driven to Hell in throngs; keepers rebuke"},{"stage":6,"ayah":"73-74","label":"the god-fearing led to the Garden in throngs; peace; inheritance"},{"stage":7,"ayah":"75","label":"angels encircle the Throne; judgment sealed; universal praise"}]',
 'A seven-stage eschatological procession from the trumpet to the final praise',
 '{"spans_passages":[7,8]}');

-- ─── Analysis scopes + claims ─────────────────────────────────────────────────
INSERT INTO qr_analysis_scopes (id, scope_type, surah, ayah_from, ayah_to, ref_id, label, note_md) VALUES
('QR:AS:39:1','passage',39,1,9,'QR:PSG:39:1-9','Revelation and Pure Devotion to God Alone','{"ruku":1}'),
('QR:AS:39:2','passage',39,10,21,'QR:PSG:39:10-21','Command to Piety, Sincerity, and Glad Tidings','{"ruku":2}'),
('QR:AS:39:3','passage',39,22,31,'QR:PSG:39:22-31','The Breast Opened to Islam vs Hardened Hearts','{"ruku":3}'),
('QR:AS:39:4','passage',39,32,41,'QR:PSG:39:32-41','The Worst Wrongdoer and Gods Sufficiency','{"ruku":4}'),
('QR:AS:39:5','passage',39,42,52,'QR:PSG:39:42-52','Taking of Souls, Intercession, and the Test','{"ruku":5}'),
('QR:AS:39:6','passage',39,53,63,'QR:PSG:39:53-63','Do Not Despair of Gods Mercy','{"ruku":6,"center":true}'),
('QR:AS:39:7','passage',39,64,70,'QR:PSG:39:64-70','Rejecting Shirk, Gods Majesty, Onset of Judgment','{"ruku":7}'),
('QR:AS:39:8','passage',39,71,75,'QR:PSG:39:71-75','The Throngs to Fire and Garden; Closing Praise','{"ruku":8}');

INSERT INTO qr_analysis_claims (id, scope_id, claim_type, claim_text, claim_text_ar, confidence, note_md) VALUES
('QR:AC:39:1a','QR:AS:39:1','theology','The surah grounds worship in the nature of the revelation itself: because the Book descends from the Mighty and Wise, devotion is owed purely to God.','إخلاص الدين لله','proposed','{}'),
('QR:AC:39:1b','QR:AS:39:1','rhetoric','The panel closes on a rhetorical question contrasting the devout knower with the ignorant.','هل يستوي الذين يعلمون','proposed','{}'),
('QR:AC:39:2a','QR:AS:39:2','theme','Sincere submission is framed by reward for the patient without measure and glad tidings to those who shun false gods and follow the best of speech.','البشرى لمن اجتنب الطاغوت','proposed','{}'),
('QR:AC:39:2b','QR:AS:39:2','structure','The two destinies appear as a fork (layers of Fire vs shaded chambers), previewing the throngs of the finale.','النار مقابل الغرف','proposed','{}'),
('QR:AC:39:3a','QR:AS:39:3','rhetoric','The passage is an antithesis between the breast opened upon light and hearts hardened against remembrance.','شرح الصدر مقابل قسوة القلب','proposed','{}'),
('QR:AC:39:3b','QR:AS:39:3','theology','The co-owned, quarreled-over slave versus the slave of one master is a parable for tawhid against shirk.','مثل العبد والشركاء','proposed','{}'),
('QR:AC:39:4a','QR:AS:39:4','theology','God is declared sufficient for His servant, exposing the futility of intercessor-deities.','أليس الله بكاف عبده','proposed','{}'),
('QR:AC:39:4b','QR:AS:39:4','theme','Guidance and error rebound on the self; the Prophet is a warner, not a guardian.','وما أنت عليهم بوكيل','proposed','{}'),
('QR:AC:39:5a','QR:AS:39:5','theology','Taking souls in death and withholding them in sleep evidences total divine sovereignty; all intercession belongs to God.','الله يتوفى الأنفس','proposed','{}'),
('QR:AC:39:5b','QR:AS:39:5','theme','The expansion and restriction of provision is a test exposing human fickleness.','بسط الرزق فتنة','proposed','{}'),
('QR:AC:39:6a','QR:AS:39:6','theology','The rhetorical center is the assurance that God forgives all sins for those who turn back.','إن الله يغفر الذنوب جميعا','proposed','{"center":true}'),
('QR:AC:39:6b','QR:AS:39:6','rhetoric','The triad of regrets dramatizes the cost of delaying repentance.','يا حسرتى على ما فرطت','proposed','{}'),
('QR:AC:39:7a','QR:AS:39:7','theology','Shirk nullifies all deeds; true appraisal of God is imaged by the earth in His grasp and the heavens folded in His right hand.','والأرض جميعا قبضته','proposed','{}'),
('QR:AC:39:7b','QR:AS:39:7','structure','The trumpet and the illumined earth open the courtroom scene the finale completes.','ونفخ في الصور','proposed','{}'),
('QR:AC:39:8a','QR:AS:39:8','structure','The finale is a diptych of the two throngs, giving the surah its name al-Zumar.','سيق الذين كفروا زمرا','proposed','{}'),
('QR:AC:39:8b','QR:AS:39:8','rhetoric','The closing al-hamd forms an inclusio with the opening revelation.','وقيل الحمد لله رب العالمين','proposed','{"inclusio_with":1}');

-- ─── Rhetorical-question nuances (the surahs signature istifham) ──────────────
INSERT INTO qr_scope_nuances (id, scope_id, nuance_type, nuance_text, nuance_text_ar, discourse_force, note_md) VALUES
('QR:NU:39:1a','QR:AS:39:1','rhetorical_question','Is the one devoutly obedient through the night like one who is not?','أمَّن هو قانت آناء الليل','istifham inkari','{"ayah":9}'),
('QR:NU:39:1b','QR:AS:39:1','rhetorical_question','Are those who know equal to those who do not know?','هل يستوي الذين يعلمون والذين لا يعلمون','istifham inkari','{"ayah":9}'),
('QR:NU:39:3a','QR:AS:39:3','rhetorical_question','Is one whose breast God opened to Islam like one whose heart is hardened?','أفمن شرح الله صدره للإسلام','istifham inkari','{"ayah":22}'),
('QR:NU:39:3b','QR:AS:39:3','rhetorical_question','Are the two (slaves) alike as a parable?','هل يستويان مثلا','istifham taswiya','{"ayah":"24,29"}'),
('QR:NU:39:4a','QR:AS:39:4','rhetorical_question','Who is more unjust than one who lies against God and denies the truth?','فمن أظلم ممن كذب على الله','istifham inkari','{"ayah":32}'),
('QR:NU:39:4b','QR:AS:39:4','rhetorical_question','Is there not in Hell a residence for the disbelievers?','أليس في جهنم مثوى للكافرين','istifham taqriri','{"ayah":32}'),
('QR:NU:39:4c','QR:AS:39:4','rhetorical_question','Is God not sufficient for His servant?','أليس الله بكاف عبده','istifham taqriri','{"ayah":36}'),
('QR:NU:39:2a','QR:AS:39:2','rhetorical_question','Can you save the one in the Fire?','أفأنت تنقذ من في النار','istifham inkari','{"ayah":19}'),
('QR:NU:39:2b','QR:AS:39:2','rhetorical_question','Do you not see that God sends down water from the sky?','ألم تر أن الله أنزل من السماء ماء','istifham taqriri','{"ayah":21}'),
('QR:NU:39:5a','QR:AS:39:5','rhetorical_question','Do they not know that God extends and restricts provision?','أولم يعلموا أن الله يبسط الرزق','istifham taqriri','{"ayah":52}'),
('QR:NU:39:7a','QR:AS:39:7','rhetorical_question','Say: Is it other than God you order me to worship, O ignorant ones?','قل أفغير الله تأمروني أعبد أيها الجاهلون','istifham inkari','{"ayah":64}');

-- ─── Concept map: topic registry + scope topics ───────────────────────────────
INSERT OR REPLACE INTO qr_topic_registry (id, topic_key, topic_label_en, topic_label_ar, topic_domain, note_md) VALUES
('QR:TOP:tawhid','tawhid','Oneness and exclusive worship of God','التوحيد','theology','{}'),
('QR:TOP:ikhlas','ikhlas-al-din','Sincere, pure religion for God','إخلاص الدين','theology','{}'),
('QR:TOP:shirk','shirk','Associating partners; false intercessors','الشرك','theology','{}'),
('QR:TOP:shafaah','intercession','Intercession belongs wholly to God','الشفاعة','theology','{}'),
('QR:TOP:rahma','divine-mercy','Divine mercy and forgiveness of sins','الرحمة والمغفرة','theology','{}'),
('QR:TOP:tawba','repentance','Repentance and turning back before death','التوبة والإنابة','ethics','{}'),
('QR:TOP:qiyama','resurrection','Resurrection, trumpet and judgment','القيامة والبعث','eschatology','{}'),
('QR:TOP:nafs','soul-death-sleep','The soul taken in death and in sleep','توفي النفس','theology','{}'),
('QR:TOP:rizq','provision-test','Provision expanded and restricted as a test','الرزق والابتلاء','ethics','{}'),
('QR:TOP:kitab','the-book','The Quran as the best, consistent discourse','الكتاب وأحسن الحديث','textuality','{}'),
('QR:TOP:sabr','patience-gratitude','Patience and gratitude versus ingratitude','الصبر والشكر','ethics','{}'),
('QR:TOP:zumar','the-throngs','The throngs driven to Fire and Garden','الزمر والمصير','eschatology','{}');

INSERT INTO qr_scope_topics (id, topic_id, scope_type, surah, ayah_from, ayah_to, prominence, note_md) VALUES
('QR:ST:39:1','QR:TOP:ikhlas','passage',39,1,9,'primary','{}'),
('QR:ST:39:2','QR:TOP:kitab','passage',39,1,9,'secondary','{}'),
('QR:ST:39:3','QR:TOP:sabr','passage',39,10,21,'primary','{}'),
('QR:ST:39:4','QR:TOP:shirk','passage',39,10,21,'secondary','{}'),
('QR:ST:39:5','QR:TOP:kitab','passage',39,22,31,'primary','{}'),
('QR:ST:39:6','QR:TOP:tawhid','passage',39,22,31,'secondary','{}'),
('QR:ST:39:7','QR:TOP:tawhid','passage',39,32,41,'primary','{}'),
('QR:ST:39:8','QR:TOP:shirk','passage',39,32,41,'secondary','{}'),
('QR:ST:39:9','QR:TOP:nafs','passage',39,42,52,'primary','{}'),
('QR:ST:39:10','QR:TOP:shafaah','passage',39,42,52,'secondary','{}'),
('QR:ST:39:11','QR:TOP:rizq','passage',39,42,52,'secondary','{}'),
('QR:ST:39:12','QR:TOP:rahma','passage',39,53,63,'primary','{}'),
('QR:ST:39:13','QR:TOP:tawba','passage',39,53,63,'primary','{}'),
('QR:ST:39:14','QR:TOP:tawhid','passage',39,64,70,'primary','{}'),
('QR:ST:39:15','QR:TOP:qiyama','passage',39,64,70,'secondary','{}'),
('QR:ST:39:16','QR:TOP:zumar','passage',39,71,75,'primary','{}'),
('QR:ST:39:17','QR:TOP:qiyama','passage',39,71,75,'secondary','{}');

-- ─── Concept map: worldview nodes + edges ─────────────────────────────────────
INSERT INTO qr_worldview_nodes (id, surah, node_type, label_en, label_ar, summary_md, wv_node_ref) VALUES
('QR:WVN:39:god',39,'divine','God — al-Aziz, al-Hakim, al-Wahid al-Qahhar','الله','The sole Sender, Sovereign and Judge; holder of the keys of the heavens and earth',NULL),
('QR:WVN:39:book',39,'text','The Book / Revelation','الكتاب','Sent down in truth as the best, consistent discourse',NULL),
('QR:WVN:39:tawhid',39,'concept','Pure, exclusive worship (ikhlas al-din)','إخلاص الدين','The central demand: religion owed to God alone',NULL),
('QR:WVN:39:shirk',39,'concept','Shirk and false intercessors','الشرك والشفعاء','Relying on deities that did not create and cannot save',NULL),
('QR:WVN:39:shafaah',39,'concept','Intercession belongs to God','لله الشفاعة جميعا','All intercession and dominion are Gods alone',NULL),
('QR:WVN:39:nafs',39,'concept','Soul, death and sleep','توفي النفس','God takes souls at death and withholds them in sleep',NULL),
('QR:WVN:39:rizq',39,'concept','Provision as test','الرزق فتنة','Expansion and restriction of provision tests gratitude',NULL),
('QR:WVN:39:mercy',39,'attribute','Divine mercy and forgiveness','الرحمة والمغفرة','God forgives all sins for those who turn back',NULL),
('QR:WVN:39:tawba',39,'concept','Repentance / turning back','الإنابة والتوبة','Submitting and returning to God before sudden punishment',NULL),
('QR:WVN:39:qunut',39,'concept','Despair of mercy','القنوط','The forbidden response the surah explicitly bars',NULL),
('QR:WVN:39:qiyama',39,'event','Resurrection and the trumpet','البعث والصور','The trumpet, the illumined earth, the record and witnesses',NULL),
('QR:WVN:39:zumar',39,'event','The two throngs','الزمر','Humanity driven in crowds to Fire or Garden by what it worshipped',NULL),
('QR:WVN:39:knower',39,'human-type','The devout knower (qanit)','القانت العالم','Worships through the night, knows, and heeds',NULL),
('QR:WVN:39:ignorant',39,'human-type','The ignorant / hardened heart','الجاهل قاسي القلب','Hardened against remembrance, bidden to shirk',NULL);

INSERT INTO qr_worldview_edges (id, from_node_id, to_node_id, relation_type, note_md) VALUES
('QR:WVE:39:1','QR:WVN:39:god','QR:WVN:39:book','reveals','{"ayah":"1-2"}'),
('QR:WVE:39:2','QR:WVN:39:book','QR:WVN:39:tawhid','demands','{"ayah":"2-3"}'),
('QR:WVE:39:3','QR:WVN:39:tawhid','QR:WVN:39:shirk','opposes','{"ayah":"3,64-65"}'),
('QR:WVE:39:4','QR:WVN:39:god','QR:WVN:39:shafaah','owns','{"ayah":"44"}'),
('QR:WVE:39:5','QR:WVN:39:shafaah','QR:WVN:39:shirk','refutes','{"ayah":"43-44"}'),
('QR:WVE:39:6','QR:WVN:39:god','QR:WVN:39:nafs','controls','{"ayah":"42"}'),
('QR:WVE:39:7','QR:WVN:39:god','QR:WVN:39:rizq','apportions','{"ayah":"52"}'),
('QR:WVE:39:8','QR:WVN:39:god','QR:WVN:39:mercy','exercises','{"ayah":"53"}'),
('QR:WVE:39:9','QR:WVN:39:mercy','QR:WVN:39:tawba','invites','{"ayah":"53-54"}'),
('QR:WVE:39:10','QR:WVN:39:tawba','QR:WVN:39:qunut','dispels','{"ayah":"53"}'),
('QR:WVE:39:11','QR:WVN:39:nafs','QR:WVN:39:tawba','motivates','{"ayah":"42,54"}'),
('QR:WVE:39:12','QR:WVN:39:qiyama','QR:WVN:39:zumar','culminates_in','{"ayah":"68-71"}'),
('QR:WVE:39:13','QR:WVN:39:tawhid','QR:WVN:39:zumar','leads_to_garden','{"ayah":"73"}'),
('QR:WVE:39:14','QR:WVN:39:shirk','QR:WVN:39:zumar','leads_to_fire','{"ayah":"71"}'),
('QR:WVE:39:15','QR:WVN:39:knower','QR:WVN:39:tawhid','embodies','{"ayah":"9"}'),
('QR:WVE:39:16','QR:WVN:39:ignorant','QR:WVN:39:shirk','embodies','{"ayah":"64"}');

-- ─── Arguments + relations ────────────────────────────────────────────────────
INSERT INTO qr_arguments (id, surah, title, title_ar, argument_type, summary_md, claims_json, confidence) VALUES
('QR:ARG:39:worship',39,'Worship is owed to God alone','العبادة لله وحده','theological','Because the Book descends from the Mighty and Wise and God is al-Wahid al-Qahhar, sincere religion is owed to Him alone; taking intercessors is illegitimate.','["QR:AC:39:1a","QR:AC:39:3b"]','asserted'),
('QR:ARG:39:intercessors',39,'The intercessor-deities are powerless','بطلان الشفعاء من دون الله','theological','The deniers admit God created the heavens, and all intercession and dominion belong to Him; therefore their deities can neither create nor intercede.','["QR:AC:39:4a","QR:AC:39:5a"]','asserted'),
('QR:ARG:39:sufficiency',39,'God is sufficient for His servant','كفاية الله لعبده','theological','Sovereignty over soul, sleep, provision and intercession shows God alone suffices the servant.','["QR:AC:39:4a","QR:AC:39:5a","QR:AC:39:5b"]','asserted'),
('QR:ARG:39:mercy',39,'Mercy stays open until death','باب الرحمة مفتوح حتى الموت','ethical','God forgives all sins for those who turn back; despair is forbidden, but repentance must precede the sudden punishment.','["QR:AC:39:6a","QR:AC:39:6b"]','asserted'),
('QR:ARG:39:vindication',39,'The Resurrection vindicates true worship','القيامة تحقق العدل في العبادة','theological','The suspended dispute over worship is settled at the Judgment, where every soul is repaid and the throngs are sorted by what they served.','["QR:AC:39:7a","QR:AC:39:8a"]','asserted');

INSERT INTO qr_argument_relations (id, from_argument_id, to_argument_id, relation_type, note_md) VALUES
('QR:ARGR:39:1','QR:ARG:39:intercessors','QR:ARG:39:worship','supports','{}'),
('QR:ARGR:39:2','QR:ARG:39:sufficiency','QR:ARG:39:worship','supports','{}'),
('QR:ARGR:39:3','QR:ARG:39:mercy','QR:ARG:39:worship','qualifies','{"note":"keeps the worship-demand from being mere threat"}'),
('QR:ARGR:39:4','QR:ARG:39:vindication','QR:ARG:39:worship','culminates','{}'),
('QR:ARGR:39:5','QR:ARG:39:intercessors','QR:ARG:39:sufficiency','reinforces','{}');

-- ─── Interpretive differences ─────────────────────────────────────────────────
INSERT INTO qr_interpretive_differences (id, scope_type, surah, ayah_from, ayah_to, question_ar, question_en, difference_type, positions_summary, majority_view, minority_view, resolution_note, is_doctrinally_significant, note_md) VALUES
('QR:ID:39:53','passage',39,53,53,'هل تشمل مغفرة جميع الذنوب الشرك؟','Does the promise that God forgives all sins (53) include shirk?','scope','The verse promises forgiveness of all sins; scholars debate whether this is unconditional and whether it covers shirk.','With sincere repentance before death God forgives all sins, including shirk; the verse reassures even grave sinners','Read absolutely it might suggest forgiveness without repentance, harmonised with 4:48','39:53 addresses the repentant; 4:48 addresses the one who dies upon shirk',1,'{"asbab":"reported re: grave sinners who feared no forgiveness"}'),
('QR:ID:39:67','phrase',39,67,67,'كيف تفهم قبضته والسماوات مطويات بيمينه؟','How is the earth in His grasp and the heavens folded in His right hand (67) to be understood?','theological','A classic locus of the tashbih versus tanzih debate over the divine attributes.','Affirm the text while negating likeness to creation (bila kayf / tafwid)','Some interpret figuratively (qabda = total power; yamin = might)','Both streams reject anthropomorphism; difference is ithbat with tafwid versus tawil',1,'{}'),
('QR:ID:39:42','phrase',39,42,42,'ما حقيقة توفي النفس في المنام؟','What is the reality of the soul taken in sleep (42)?','meaning','How literally the soul is taken in sleep, and its relation to death.','Sleep involves a real partial seizing of the soul, distinct from the full seizing at death','Some read it as a metaphor for suspended consciousness','Most tafsir affirm a genuine but lesser tawaffi in sleep, the soul returned on waking',0,'{}');

-- ─── Quran-by-Quran cross references ──────────────────────────────────────────
INSERT INTO qr_quran_bil_quran_relations (id, from_surah, from_ayah, to_surah, to_ayah, relation_type, scholar_ref, note_md) VALUES
('QR:QBQ:39:53-12:87',39,53,12,87,'thematic_echo',NULL,'{"link":"do not despair of the mercy/rawh of God"}'),
('QR:QBQ:39:53-4:48',39,53,4,48,'qualifies',NULL,'{"link":"all sins forgiven (with repentance) vs shirk not forgiven for the unrepentant"}'),
('QR:QBQ:39:42-6:60',39,42,6,60,'parallel',NULL,'{"link":"God takes you by night (sleep) and knows your deeds by day"}'),
('QR:QBQ:39:67-21:104',39,67,21,104,'parallel',NULL,'{"link":"the heavens rolled up / folded on the Day"}'),
('QR:QBQ:39:71-19:85',39,71,19,86,'parallel',NULL,'{"link":"the criminals driven to Hell vs the righteous gathered to the Most Merciful"}'),
('QR:QBQ:39:9-58:11',39,9,58,11,'thematic_echo',NULL,'{"link":"the rank of those who know / are given knowledge"}');

-- ─── Passage analysis cache (records tafsir / i'rab source coverage) ──────────
INSERT INTO qr_passage_analysis_cache (id, surah, passage_id, cache_version, cache_generated_at, payload_json) VALUES
('QR:PAC:39:1',39,'QR:PSG:39:1-9',1,datetime('now'),'{"passage":1,"ayah_range":"1-9","theme":"revelation_and_pure_devotion","diagram":"flow_to_contrast","topics":["ikhlas-al-din","the-book"],"tafsir":{"entries":46,"scholars":8},"irab":{"entries":340,"sources":5},"scholars":["Tabari","Zamakhshari","Razi","Ibn Atiyya","Ibn Kathir","Abu Hayyan","Alusi","Ibn Ashur"],"irab_sources":["Daas","Jadwal","Muyassar","Darwish","Ukbari-Tibyan"]}'),
('QR:PAC:39:2',39,'QR:PSG:39:10-21',1,datetime('now'),'{"passage":2,"ayah_range":"10-21","theme":"command_to_sincere_submission","diagram":"fork","topics":["patience-gratitude","shirk"],"tafsir":{"entries":46,"scholars":8},"irab":{"entries":289,"sources":5}}'),
('QR:PAC:39:3',39,'QR:PSG:39:22-31',1,datetime('now'),'{"passage":3,"ayah_range":"22-31","theme":"expanded_breast_vs_hardened_hearts","diagram":"antithesis","topics":["the-book","tawhid"],"tafsir":{"entries":38,"scholars":8},"irab":{"entries":206,"sources":5}}'),
('QR:PAC:39:4',39,'QR:PSG:39:32-41',1,datetime('now'),'{"passage":4,"ayah_range":"32-41","theme":"truth_vs_fabrication_and_gods_sufficiency","diagram":"argument","topics":["tawhid","shirk"],"tafsir":{"entries":39,"scholars":8},"irab":{"entries":234,"sources":5}}'),
('QR:PAC:39:5',39,'QR:PSG:39:42-52',1,datetime('now'),'{"passage":5,"ayah_range":"42-52","theme":"souls_intercession_and_the_test","diagram":"signs_to_test","topics":["soul-death-sleep","intercession","provision-test"],"tafsir":{"entries":44,"scholars":8},"irab":{"entries":290,"sources":5}}'),
('QR:PAC:39:6',39,'QR:PSG:39:53-63',1,datetime('now'),'{"passage":6,"ayah_range":"53-63","theme":"mercy_and_the_call_to_repent","diagram":"appeal_center","is_surah_center":true,"topics":["divine-mercy","repentance"],"tafsir":{"entries":44,"scholars":8},"irab":{"entries":244,"sources":5}}'),
('QR:PAC:39:7',39,'QR:PSG:39:64-70',1,datetime('now'),'{"passage":7,"ayah_range":"64-70","theme":"tawhid_demand_and_divine_majesty","diagram":"ascent","topics":["tawhid","resurrection"],"tafsir":{"entries":30,"scholars":8},"irab":{"entries":142,"sources":5}}'),
('QR:PAC:39:8',39,'QR:PSG:39:71-75',1,datetime('now'),'{"passage":8,"ayah_range":"71-75","theme":"the_throngs_two_processions","diagram":"diptych","names_surah":true,"topics":["the-throngs","resurrection"],"tafsir":{"entries":23,"scholars":8},"irab":{"entries":148,"sources":4}}');
