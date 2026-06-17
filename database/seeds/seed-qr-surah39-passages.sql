-- Seed: Surah 39 (az-Zumar / The Throngs) passage analysis for km_quran.
-- Domain: QR. Database: km_quran (binding DB_QR).
--
-- Builds the full passage stack for Surah 39, segmented by the 8 ruku
-- boundaries recorded in qr_surah_ayah_meta (1-9, 10-21, 22-31, 32-41,
-- 42-52, 53-63, 64-70, 71-75). Each ruku is one thematic passage; every
-- ruku boundary was verified against the Saheeh International translation
-- in qr_translations as a genuine theme transition.
--
-- All statements are idempotent (INSERT OR REPLACE / UPDATE), keyed by
-- deterministic typed ids (QR:PSG / QR:SP / QR:FLOW / QR:SR / QR:SU /
-- QR:SYM / QR:AS / QR:AC). Re-running is safe.
--
-- Apply:
--   wrangler d1 execute km_quran --remote --config workers/quran/wrangler.toml \
--     --file database/seeds/seed-qr-surah39-passages.sql

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

-- ─── Passages (one per ruku), with per-passage diagram structure in note_md ────

INSERT OR REPLACE INTO qr_surah_passages
  (id, surah, passage_index, ayah_from, ayah_to, theme, title_ar, title_en, discourse_role, note_md, updated_at)
VALUES
('QR:PSG:39:1-9', 39, 1, 1, 9, 'revelation_and_pure_devotion',
 'تنزيل الكتاب وإخلاص الدين لله وحده',
 'Revelation and Pure Devotion to God Alone',
 'thesis',
 '{"ruku":1,"summary":"Opening thesis: the Book is sent down from the Mighty, the Wise, and religion (al-din) is owed purely to God. Refutes intercessor-deities, reads creation as sign, contrasts ingratitude in ease with distress, and closes by separating the devout night-worshipper who knows from the one who does not.","themes":["tanzil","ikhlas","tawhid","ilm-vs-jahl"],"diagram":{"type":"flow_to_contrast","nodes":[{"ayah":"1","label":"Tanzil: Book from the Mighty, Wise"},{"ayah":"2-3","label":"al-din al-khalis; intercessors refuted"},{"ayah":"4-6","label":"God free of need; signs of creation"},{"ayah":"7-8","label":"ingratitude vs gratitude; no soul bears anothers load"}],"climax_contrast":{"ayah":"9","left":"the devout knower (qanit)","right":"the ignorant","prompt":"are those who know equal to those who do not?"}},"link_next":"the demand for pure devotion becomes a direct command in passage 2"}',
 datetime('now')),

('QR:PSG:39:10-21', 39, 2, 10, 21, 'command_to_sincere_submission',
 'الأمر بالتقوى والإخلاص والبشرى للمنيبين',
 'Command to Piety, Sincerity, and Glad Tidings to the Penitent',
 'exhortation',
 '{"ruku":2,"summary":"Direct address to believing servants: fear your Lord; the patient are paid without measure. The Prophet is commanded to worship with sincere religion and be first of those who submit. The real loss is named, Fire is layered against shaded chambers, glad tidings go to those who shun false gods and follow the best of speech, and the rain-to-withering parable closes for people of understanding.","themes":["taqwa","sabr","two-destinies","taghut","ahsan-al-qawl","parable"],"diagram":{"type":"fork","stem":{"ayah":"10-15","label":"command to sincere worship; first of the muslimin"},"branches":[{"label":"deniers","ayah":"15-16,19-20","outcome":"layers of Fire"},{"label":"penitent who shun taghut and follow ahsan al-qawl","ayah":"17-18,20","outcome":"shaded upper chambers"}],"coda":{"ayah":"21","label":"rain to withering: a reminder for ulul albab"}},"link_prev":"acts on the pure devotion demanded in passage 1","link_next":"the fork of destinies sharpens into the light/hardness contrast of passage 3"}',
 datetime('now')),

('QR:PSG:39:22-31', 39, 3, 22, 31, 'expanded_breast_vs_hardened_hearts',
 'شرح الصدر للإسلام في مقابل قسوة القلوب وأحسن الحديث',
 'The Breast Opened to Islam vs Hardened Hearts; the Best Discourse',
 'contrast',
 '{"ruku":3,"summary":"Antithesis between the one whose breast God opened to Islam, upon light, and those whose hearts are hardened against remembrance. The Book is the best discourse (ahsan al-hadith), consistent and oft-repeated. The parable of the slave shared by quarreling masters versus one wholly owned dramatizes tawhid, sealed by shared mortality and the coming dispute before the Lord.","themes":["sharh-al-sadr","qaswa","ahsan-al-hadith","tawhid-parable","mawt"],"diagram":{"type":"antithesis","pole_a":{"ayah":"22-23","label":"breast opened, upon light; the best discourse"},"pole_b":{"ayah":"24-26","label":"hardened hearts; disgrace on the Day"},"pivot":{"ayah":"29","label":"parable: co-owned slave vs single-master slave"},"close":{"ayah":"30-31","label":"you will die and they will die; dispute before the Lord"}},"link_prev":"extends the two-destinies fork into a heart-state contrast","link_next":"the hardened deniers become the defendants of passage 4"}',
 datetime('now')),

('QR:PSG:39:32-41', 39, 4, 32, 41, 'truth_vs_fabrication_and_gods_sufficiency',
 'أظلم من كذب على الله وكفاية الله لعبده',
 'The Worst Wrongdoer and God Sufficiency for His Servant',
 'disputation',
 '{"ruku":4,"summary":"Forensic polemic against the one who lies against God and denies the truth. The bringer of truth and those who affirm it are the god-fearing. A rhetorical hinge asks whether God is not sufficient for His servant; the deniers own admission that God created the heavens exposes their idols. The Book was sent for mankind in truth; guidance and error fall back on the self; the Prophet is no guardian over them.","themes":["zulm","sidq-vs-kidhb","kifaya","huda","masuliyya"],"diagram":{"type":"argument","accusation":{"ayah":"32","label":"who is more unjust than the liar-denier?"},"counter":{"ayah":"33-35","label":"the truthful and the believers = the muttaqun"},"hinge":{"ayah":"36-37","label":"is not God sufficient for His servant?"},"exposure":{"ayah":"38","label":"their admission: God created the heavens"},"verdict":{"ayah":"39-41","label":"the Book in truth; guidance is for oneself; no wakil"}},"link_prev":"prosecutes the hardened hearts of passage 3","link_next":"sufficiency of God opens onto His sovereignty over souls in passage 5"}',
 datetime('now')),

('QR:PSG:39:42-52', 39, 5, 42, 52, 'souls_intercession_and_the_test',
 'توفي الأنفس وملك الشفاعة وفتنة الضراء والرزق',
 'Taking of Souls, Ownership of Intercession, and the Test of Affliction',
 'sovereignty',
 '{"ruku":5,"summary":"God takes souls at death and withholds them in sleep, a sign for those who reflect. Intercessors besides Him are rejected: to God belongs all intercession and the whole dominion. Hearts shrink at God alone yet rejoice at others, prompting the prayer to the Originator as Judge. No ransom saves the wrongdoers. Human fickleness is exposed: man calls in distress then claims merit when favored; the measure of provision is itself a sign.","themes":["tawaffi-al-anfus","sleep","shafaa","rizq","fitna"],"diagram":{"type":"signs_to_test","signs":[{"ayah":"42","label":"souls taken in death and sleep"},{"ayah":"43-44","label":"all intercession belongs to God"},{"ayah":"45","label":"hearts recoil at God alone, rejoice at others"},{"ayah":"46-48","label":"prayer to the Originator-Judge; no ransom on the Day"}],"test":{"ayah":"49-52","label":"man calls in distress then forgets; rizq expanded and restricted as a sign"}},"link_prev":"unfolds the sufficiency of God affirmed in passage 4","link_next":"sovereignty over the soul gives way to the mercy climax of passage 6"}',
 datetime('now')),

('QR:PSG:39:53-63', 39, 6, 53, 63, 'mercy_and_the_call_to_repent',
 'لا تقنطوا من رحمة الله والإنابة قبل العذاب',
 'Do Not Despair of God Mercy; Repent Before the Punishment',
 'mercy_appeal',
 '{"ruku":6,"summary":"The surahs rhetorical heart: do not despair of the mercy of God, for He forgives all sins. The call is to turn back and submit before the punishment comes suddenly, lest a soul cry alas for my neglect. Guidance had been offered and refused. On the Day the faces of liars are blackened while the god-fearing are delivered, and God, holder of the keys of the heavens and earth, names the deniers as the losers.","themes":["rahma","tawba","qunut","hasra","maqalid"],"is_surah_center":true,"diagram":{"type":"appeal_center","center":true,"call":{"ayah":"53","label":"do not despair; God forgives all sins"},"imperative":{"ayah":"54-55","label":"turn and submit before sudden punishment"},"regrets":{"ayah":"56-58","label":"three voices of regret"},"offer":{"ayah":"59","label":"guidance came but was belied"},"outcome":{"ayah":"60-61","label":"blackened faces vs the saved muttaqun"},"seal":{"ayah":"62-63","label":"God holds the keys; deniers are the losers"}},"link_prev":"answers the test of passage 5 with the open door of mercy","link_next":"mercy refused turns to the tawhid demand and Judgment of passage 7"}',
 datetime('now')),

('QR:PSG:39:64-70', 39, 7, 64, 70, 'tawhid_demand_and_divine_majesty',
 'إنكار الشرك وعظمة الله ومشهد القيامة',
 'Rejecting Shirk, God Majesty, and the Onset of Judgment',
 'tawhid_demand',
 '{"ruku":7,"summary":"A pointed demand: do you bid me worship other than God, O ignorant ones? Revelation warns that shirk nullifies all works, so be among the grateful. They did not appraise God truly: the whole earth is in His grasp and the heavens folded in His right hand. The trumpet sounds, all swoon then rise; the earth shines with its Lords light, the record is laid open, prophets and witnesses are brought, and every soul is repaid in full.","themes":["shirk-nullifies","azama","qabda","sur","hisab"],"diagram":{"type":"ascent","steps":[{"ayah":"64","label":"do you order me to worship other than God?"},{"ayah":"65-66","label":"shirk nullifies deeds; be grateful"},{"ayah":"67","label":"earth in His grasp; heavens folded in His right hand"},{"ayah":"68","label":"the trumpet: swoon then rising"},{"ayah":"69-70","label":"earth lit by its Lords light; record and witnesses; every soul repaid"}]},"link_prev":"follows the refusal of mercy in passage 6","link_next":"the convened court resolves into the throngs of passage 8"}',
 datetime('now')),

('QR:PSG:39:71-75', 39, 8, 71, 75, 'the_throngs_two_processions',
 'سوق الزمر إلى النار والجنة وختام التسبيح',
 'The Throngs Driven to Fire and Garden; Closing Praise',
 'eschatological_finale',
 '{"ruku":8,"summary":"The eponymous scene that names the surah (al-Zumar): deniers are driven to Hell in throngs, its gates opened, its keepers rebuking them for ignoring the messengers; the god-fearing are led to Paradise in throngs, greeted with peace and given the Garden as inheritance. Angels encircle the Throne in glorification, judgment is sealed in truth, and the surah closes on praise: all praise belongs to God, Lord of the worlds, echoing the opening tanzil.","themes":["zumar","jahannam","janna","salam","hamd","inclusio"],"names_surah":true,"diagram":{"type":"diptych","left_panel":{"ayah":"71-72","label":"deniers driven to Hell in zumar; gates opened; keepers rebuke"},"right_panel":{"ayah":"73-74","label":"god-fearing led to the Garden in zumar; greeting of peace; inheritance"},"coda":{"ayah":"75","label":"angels round the Throne; judgment in truth; al-hamd lillahi rabb al-alamin"},"inclusio_with":1},"link_prev":"completes the courtroom opened in passage 7","link_back":"the closing praise mirrors the revelation that opened passage 1"}',
 datetime('now'));

-- ─── Macro topic-flow diagram (8 nodes) ───────────────────────────────────────

INSERT OR REPLACE INTO qr_surah_topic_flows (id, surah, flow_index, ayah_from, ayah_to, topic_label, topic_label_ar, flow_direction, transitions_from_id, note_md) VALUES
('QR:FLOW:39:1',39,1,1,9,'Revelation and the demand for pure devotion','تنزيل الكتاب وإخلاص الدين','opening',NULL,'{"node":1,"role":"thesis","leads_to":"the call to act on that devotion"}'),
('QR:FLOW:39:2',39,2,10,21,'Command to sincere submission; the two destinies foreshadowed','الأمر بالإخلاص والمصيرين','development','QR:FLOW:39:1','{"node":2,"role":"exhortation","fork":["fire layers","shaded chambers"]}'),
('QR:FLOW:39:3',39,3,22,31,'Open breast versus hardened hearts; the best discourse','شرح الصدر مقابل قسوة القلوب','contrast','QR:FLOW:39:2','{"node":3,"role":"antithesis","pivot":"co-owned slave parable (29)"}'),
('QR:FLOW:39:4',39,4,32,41,'Truth versus fabrication; the sufficiency of God','الصدق مقابل الكذب وكفاية الله','disputation','QR:FLOW:39:3','{"node":4,"role":"forensic","hinge":"is not God sufficient for His servant? (36)"}'),
('QR:FLOW:39:5',39,5,42,52,'Sovereignty over souls and provision; the test','توفي الأنفس وبسط الرزق والفتنة','development','QR:FLOW:39:4','{"node":5,"role":"sovereignty-signs","converges_on":"human fickleness under trial"}'),
('QR:FLOW:39:6',39,6,53,63,'Do not despair of mercy; repent before the punishment','لا تقنطوا من رحمة الله','climax','QR:FLOW:39:5','{"node":6,"role":"emotional-climax","center":true}'),
('QR:FLOW:39:7',39,7,64,70,'Tawhid demanded; divine majesty; judgment begins','إنكار الشرك وعظمة الله ومشهد القيامة','ascent','QR:FLOW:39:6','{"node":7,"role":"ascent-to-court","image":"heavens folded in His right hand (67)"}'),
('QR:FLOW:39:8',39,8,71,75,'The throngs driven to Fire and Garden; closing praise','سوق الزمر وختام الحمد','resolution','QR:FLOW:39:7','{"node":8,"role":"finale","diptych":["Hell-bound zumar (71-72)","Garden-bound zumar (73-74)"],"inclusio_with":1}');

-- ─── Structure reading + 8 panel units ────────────────────────────────────────

INSERT OR REPLACE INTO qr_surah_structure_readings (id, surah, reading_label, structure_type, scholar_ref, paradigm_ref, confidence, summary_md, note_md)
VALUES ('QR:SR:39:panels', 39,
 'Eight-panel hortatory movement (by ruku)',
 'thematic_panels', NULL, 'thematic-coherence', 'proposed',
 'Surah az-Zumar unfolds as eight thematic panels that coincide with its eight ruku divisions. It opens with revelation and the demand for al-din al-khalis (1-9), commands sincere submission while foreshadowing the two destinies (10-21), sets the breast opened to Islam against hardened hearts (22-31), prosecutes fabrication versus truth and affirms Gods sufficiency (32-41), displays sovereignty over souls and provision through the test (42-52), reaches its emotional climax in the call not to despair of mercy (53-63), ascends through tawhid and divine majesty into the onset of Judgment (64-70), and resolves in the two throngs driven to Fire and Garden, sealed by universal praise (71-75). A praise-inclusio frames the whole (tanzil at 1 / al-hamd at 75), with the mercy panel as rhetorical center.',
 '{"basis":"ruku","panels":8,"climax_panel":6,"inclusio":[1,75]}');

INSERT OR REPLACE INTO qr_surah_structure_units (id, surah, unit_index, ayah_from, ayah_to, unit_role, label, reading_id, note_md) VALUES
('QR:SU:39:1',39,1,1,9,'opening','Revelation and pure devotion','QR:SR:39:panels','{"shape":"declaration-to-contrast","ends_on":"knowers vs ignorant (9)"}'),
('QR:SU:39:2',39,2,10,21,'exhortation','Command to sincere submission','QR:SR:39:panels','{"shape":"fork","branches":["Fire (16,20)","chambers (20)"],"closes":"rain parable (21)"}'),
('QR:SU:39:3',39,3,22,31,'contrast','Light of Islam vs hardened hearts','QR:SR:39:panels','{"shape":"antithesis","pivot":"co-owned slave parable (29)"}'),
('QR:SU:39:4',39,4,32,41,'disputation','Truth vs fabrication; Gods sufficiency','QR:SR:39:panels','{"shape":"argument","hinge":"is not God sufficient? (36)"}'),
('QR:SU:39:5',39,5,42,52,'sovereignty','Souls, intercession and the test','QR:SR:39:panels','{"shape":"signs-to-test","sign":"souls in death and sleep (42)"}'),
('QR:SU:39:6',39,6,53,63,'climax','Mercy and the call to repent','QR:SR:39:panels','{"shape":"appeal","center":true,"key":"do not despair of mercy (53)"}'),
('QR:SU:39:7',39,7,64,70,'ascent','Tawhid demand and divine majesty','QR:SR:39:panels','{"shape":"ascent","image":"heavens folded in the right hand (67)"}'),
('QR:SU:39:8',39,8,71,75,'finale','The throngs; closing praise','QR:SR:39:panels','{"shape":"diptych+coda","panels":["Hell zumar (71-72)","Garden zumar (73-74)"],"coda":"al-hamd (75)"}');

-- ─── Symmetry: praise inclusio with a central mercy axis ──────────────────────

INSERT OR REPLACE INTO qr_surah_symmetry_patterns (id, surah, structure_reading_id, pattern_type, center_ayah_from, center_ayah_to, pattern_notation, pairs_json, summary_md, note_md)
VALUES ('QR:SYM:39:inclusio', 39, 'QR:SR:39:panels', 'inclusio_with_central_axis', 53, 63,
 'A … X(mercy) … A-prime',
 '[{"label":"A / A-prime — praise frame","left":{"ayah":1,"theme":"tanzil from the Mighty, the Wise"},"right":{"ayah":75,"theme":"al-hamd lillahi rabb al-alamin"}},{"label":"B / B-prime — worship demanded vs throngs sorted","left":{"ayah":"2-3","theme":"al-din al-khalis is demanded"},"right":{"ayah":"71-74","theme":"the zumar driven to Fire and to the Garden"}},{"label":"C / C-prime — knowers vs ignorant","left":{"ayah":9,"theme":"are those who know equal to those who do not?"},"right":{"ayah":64,"theme":"do you bid me worship others, O ignorant ones?"}},{"center":{"ayah":"53-63","theme":"do not despair of the mercy of God — the open door of repentance"}}]',
 'The surah is framed by an inclusio of praise (revelation/tanzil at the head, al-hamd at the close) and turns on a central axis of mercy (53-63). Around that axis the demand for pure worship near the opening answers the sorting of the throngs near the end, and the contrast of knowers versus the ignorant at v.9 echoes the rebuke of the ignorant at v.64.',
 '{"confidence":"proposed","type":"inclusio","axis":"mercy(53)"}');

-- ─── Analysis scopes (one per passage) ────────────────────────────────────────

INSERT OR REPLACE INTO qr_analysis_scopes (id, scope_type, surah, ayah_from, ayah_to, ref_id, label, note_md) VALUES
('QR:AS:39:1',  'passage', 39, 1, 9,  'QR:PSG:39:1-9',   'Revelation and Pure Devotion to God Alone', '{"ruku":1}'),
('QR:AS:39:2',  'passage', 39, 10,21, 'QR:PSG:39:10-21', 'Command to Piety, Sincerity, and Glad Tidings', '{"ruku":2}'),
('QR:AS:39:3',  'passage', 39, 22,31, 'QR:PSG:39:22-31', 'The Breast Opened to Islam vs Hardened Hearts', '{"ruku":3}'),
('QR:AS:39:4',  'passage', 39, 32,41, 'QR:PSG:39:32-41', 'The Worst Wrongdoer and Gods Sufficiency', '{"ruku":4}'),
('QR:AS:39:5',  'passage', 39, 42,52, 'QR:PSG:39:42-52', 'Taking of Souls, Intercession, and the Test', '{"ruku":5}'),
('QR:AS:39:6',  'passage', 39, 53,63, 'QR:PSG:39:53-63', 'Do Not Despair of Gods Mercy', '{"ruku":6,"center":true}'),
('QR:AS:39:7',  'passage', 39, 64,70, 'QR:PSG:39:64-70', 'Rejecting Shirk, Gods Majesty, Onset of Judgment', '{"ruku":7}'),
('QR:AS:39:8',  'passage', 39, 71,75, 'QR:PSG:39:71-75', 'The Throngs to Fire and Garden; Closing Praise', '{"ruku":8}');

-- ─── Analysis claims (theme / theology / rhetoric / structure) ────────────────

INSERT OR REPLACE INTO qr_analysis_claims (id, scope_id, claim_type, claim_text, claim_text_ar, confidence, note_md) VALUES
('QR:AC:39:1a','QR:AS:39:1','theology','The surah grounds worship in the nature of the revelation itself: because the Book descends from the Mighty and Wise, devotion (al-din) is owed purely to God.','إخلاص الدين لله','proposed','{}'),
('QR:AC:39:1b','QR:AS:39:1','rhetoric','The panel closes on a rhetorical question contrasting the devout knower with the ignorant, establishing knowledge-with-worship as the surahs ideal posture.','هل يستوي الذين يعلمون','proposed','{}'),
('QR:AC:39:2a','QR:AS:39:2','theme','Sincere submission is framed by reward for the patient without measure and by glad tidings to those who shun false gods and follow the best of speech.','البشرى لمن اجتنب الطاغوت','proposed','{}'),
('QR:AC:39:2b','QR:AS:39:2','structure','The two destinies appear here as a fork (layers of Fire vs shaded upper chambers), previewing the throngs of the finale.','النار مقابل الغرف','proposed','{}'),
('QR:AC:39:3a','QR:AS:39:3','rhetoric','The passage is built as an antithesis between the breast opened to Islam upon light and hearts hardened against remembrance.','شرح الصدر مقابل قسوة القلب','proposed','{}'),
('QR:AC:39:3b','QR:AS:39:3','theology','The co-owned, quarreled-over slave versus the slave of one master is a parable for tawhid against shirk.','مثل العبد والشركاء','proposed','{}'),
('QR:AC:39:4a','QR:AS:39:4','theology','God is declared sufficient for His servant, exposing the futility of intercessor-deities the deniers themselves admit could not create the heavens.','أليس الله بكاف عبده','proposed','{}'),
('QR:AC:39:4b','QR:AS:39:4','theme','Guidance and error each rebound on the self; the Prophet is a warner, not a guardian over them.','وما أنت عليهم بوكيل','proposed','{}'),
('QR:AC:39:5a','QR:AS:39:5','theology','Taking souls in death and withholding them in sleep evidences total divine sovereignty; all intercession belongs to God.','الله يتوفى الأنفس','proposed','{}'),
('QR:AC:39:5b','QR:AS:39:5','theme','The expansion and restriction of provision is a test that exposes human fickleness in calling on God only under distress.','بسط الرزق فتنة','proposed','{}'),
('QR:AC:39:6a','QR:AS:39:6','theology','The surahs rhetorical center is the assurance that God forgives all sins for those who turn back, defining mercy as the open door before punishment falls.','إن الله يغفر الذنوب جميعا','proposed','{"center":true}'),
('QR:AC:39:6b','QR:AS:39:6','rhetoric','The triad of regrets (lest a soul say: alas for my neglect) dramatizes the cost of delaying repentance.','يا حسرتى على ما فرطت','proposed','{}'),
('QR:AC:39:7a','QR:AS:39:7','theology','Shirk nullifies all deeds; true appraisal of God is imaged by the earth in His grasp and the heavens folded in His right hand.','والأرض جميعا قبضته','proposed','{}'),
('QR:AC:39:7b','QR:AS:39:7','structure','The trumpet and the illumined earth open the courtroom scene that the finale completes.','ونفخ في الصور','proposed','{}'),
('QR:AC:39:8a','QR:AS:39:8','structure','The finale is a diptych: deniers driven to Hell in throngs and the godfearing led to the Garden in throngs, giving the surah its name al-Zumar.','سيق الذين كفروا زمرا','proposed','{}'),
('QR:AC:39:8b','QR:AS:39:8','rhetoric','The closing al-hamd lillahi rabb al-alamin forms an inclusio with the opening revelation, sealing judgment with praise.','وقيل الحمد لله رب العالمين','proposed','{"inclusio_with":1}');

-- ─── Study passages (public unit ids + meta_json: structure / ui / tasks) ──────

INSERT OR REPLACE INTO qr_surah_study_passages
 (id, surah, passage_no, ayah_from, ayah_to, public_unit_id, public_surah_unit_id, label, title_en, title_ar, subtitle, theme, summary_md, start_ref, end_ref, status, meta_json)
VALUES
('QR:SP:39:1-9',39,1,1,9,'U:C:QURAN:39:1-9','U:C:QURAN:39','Passage 1','Revelation and Pure Devotion','تنزيل الكتاب وإخلاص الدين','The Book Sent Down; Religion for God Alone','revelation_and_pure_devotion','The Book descends from the Mighty and Wise, so devotion is owed purely to God; it ends contrasting the devout knower with the ignorant.','39:1','39:9','draft','{"source":"surah-analysis","unit_type":"passage","order_index":1,"label":"Passage 1","title":"Revelation and Pure Devotion","subtitle":"The Book Sent Down; Religion for God Alone","ayah_range":{"from":1,"to":9,"display":"1-9"},"theme":"revelation_and_pure_devotion","structure":{"type":"flow_to_contrast","ref":"QR:PSG:39:1-9"},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:10-21',39,2,10,21,'U:C:QURAN:39:10-21','U:C:QURAN:39','Passage 2','Command to Sincere Submission','الأمر بالإخلاص','Piety, Patience, and the Two Destinies','command_to_sincere_submission','Believing servants are called to piety and patience; the Fire is set against shaded chambers and glad tidings go to those who follow the best of speech.','39:10','39:21','draft','{"source":"surah-analysis","unit_type":"passage","order_index":2,"label":"Passage 2","title":"Command to Sincere Submission","subtitle":"Piety, Patience, and the Two Destinies","ayah_range":{"from":10,"to":21,"display":"10-21"},"theme":"command_to_sincere_submission","structure":{"type":"fork","ref":"QR:PSG:39:10-21"},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:22-31',39,3,22,31,'U:C:QURAN:39:22-31','U:C:QURAN:39','Passage 3','Light vs Hardened Hearts','شرح الصدر مقابل القسوة','The Best Discourse and the Parable of Masters','expanded_breast_vs_hardened_hearts','The breast opened to Islam upon light is set against hardened hearts; the best discourse and the parable of the co-owned slave dramatize tawhid.','39:22','39:31','draft','{"source":"surah-analysis","unit_type":"passage","order_index":3,"label":"Passage 3","title":"Light vs Hardened Hearts","subtitle":"The Best Discourse and the Parable of Masters","ayah_range":{"from":22,"to":31,"display":"22-31"},"theme":"expanded_breast_vs_hardened_hearts","structure":{"type":"antithesis","ref":"QR:PSG:39:22-31"},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:32-41',39,4,32,41,'U:C:QURAN:39:32-41','U:C:QURAN:39','Passage 4','Truth vs Fabrication','الصدق مقابل الكذب','Is God Not Sufficient for His Servant?','truth_vs_fabrication_and_gods_sufficiency','A forensic case against the liar-denier turns on the hinge: is not God sufficient for His servant? Guidance and error rebound on the self.','39:32','39:41','draft','{"source":"surah-analysis","unit_type":"passage","order_index":4,"label":"Passage 4","title":"Truth vs Fabrication","subtitle":"Is God Not Sufficient for His Servant?","ayah_range":{"from":32,"to":41,"display":"32-41"},"theme":"truth_vs_fabrication_and_gods_sufficiency","structure":{"type":"argument","ref":"QR:PSG:39:32-41"},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:42-52',39,5,42,52,'U:C:QURAN:39:42-52','U:C:QURAN:39','Passage 5','Souls, Intercession, and the Test','توفي الأنفس والشفاعة','Sovereignty over Life, Death, and Provision','souls_intercession_and_the_test','God takes souls in death and sleep and owns all intercession; the measure of provision becomes a test that exposes human fickleness.','39:42','39:52','draft','{"source":"surah-analysis","unit_type":"passage","order_index":5,"label":"Passage 5","title":"Souls, Intercession, and the Test","subtitle":"Sovereignty over Life, Death, and Provision","ayah_range":{"from":42,"to":52,"display":"42-52"},"theme":"souls_intercession_and_the_test","structure":{"type":"signs_to_test","ref":"QR:PSG:39:42-52"},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:53-63',39,6,53,63,'U:C:QURAN:39:53-63','U:C:QURAN:39','Passage 6','Do Not Despair of Mercy','لا تقنطوا من رحمة الله','The Open Door of Repentance','mercy_and_the_call_to_repent','The surahs rhetorical heart: God forgives all sins for those who turn back; repent before the punishment falls suddenly.','39:53','39:63','draft','{"source":"surah-analysis","unit_type":"passage","order_index":6,"label":"Passage 6","title":"Do Not Despair of Mercy","subtitle":"The Open Door of Repentance","ayah_range":{"from":53,"to":63,"display":"53-63"},"theme":"mercy_and_the_call_to_repent","is_surah_center":true,"structure":{"type":"appeal_center","center":true,"ref":"QR:PSG:39:53-63"},"ui":{"highlight_color":"emerald","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:64-70',39,7,64,70,'U:C:QURAN:39:64-70','U:C:QURAN:39','Passage 7','Tawhid and Divine Majesty','التوحيد وعظمة الله','The Trumpet and the Onset of Judgment','tawhid_demand_and_divine_majesty','Worship is demanded for God alone; His majesty is imaged by the folded heavens, and the trumpet opens the courtroom of Judgment.','39:64','39:70','draft','{"source":"surah-analysis","unit_type":"passage","order_index":7,"label":"Passage 7","title":"Tawhid and Divine Majesty","subtitle":"The Trumpet and the Onset of Judgment","ayah_range":{"from":64,"to":70,"display":"64-70"},"theme":"tawhid_demand_and_divine_majesty","structure":{"type":"ascent","ref":"QR:PSG:39:64-70"},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}'),
('QR:SP:39:71-75',39,8,71,75,'U:C:QURAN:39:71-75','U:C:QURAN:39','Passage 8','The Throngs','الزمر','Two Processions and the Closing Praise','the_throngs_two_processions','The scene that names the surah: deniers driven to Hell in throngs and the god-fearing to the Garden in throngs, sealed by universal praise.','39:71','39:75','draft','{"source":"surah-analysis","unit_type":"passage","order_index":8,"label":"Passage 8","title":"The Throngs","subtitle":"Two Processions and the Closing Praise","ayah_range":{"from":71,"to":75,"display":"71-75"},"theme":"the_throngs_two_processions","names_surah":true,"structure":{"type":"diptych","ref":"QR:PSG:39:71-75","inclusio_with":1},"ui":{"highlight_color":"gold","show_theme":true,"show_summary":true,"show_ayah_range":true,"title_mode":"passage-focus"},"tasks":{"reading":true,"vocabulary":true,"sentence_structure":true,"expressions":true,"passage_structure":true,"notes":true,"worldview":true}}');
