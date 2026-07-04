-- ─── Root بين @ 44:2 (الْمُبِينِ) — WMP word run ───────────────────────────────
-- Mirrors the D1 writes made on 2026-07-04 (km_arabic_linguistic).
-- Sources consulted (W050): Maqāyīs p.33 · Rāghib Mufradāt p.156 · Sinai key-terms
-- · QAC morphology_tag_json (44:2:2) · al-Muyassar iʿrāb 44:2.
-- Staging doctrine: five-lens entry lands as status='raw' pending the human gate.

-- W300 — curated root core (from Maqāyīs: «بُعْدُ الشيء وانكشافُه»)
UPDATE ar_ling_roots SET
  meaning_core_ar = 'بُعْدُ الشيءِ وانكشافُه: الفراقُ والانفصال، ومنه الظهورُ والوضوح (مقاييس اللغة)',
  meaning_core_en = 'separation and disclosure — what parts and stands apart becomes clear and manifest (Maqāyīs)'
WHERE root_text='بين' OR root_normalized='بين' OR root_text='ب-ي-ن';

-- W600 — root_vocab core sense (fills nulls only; hook/senses/examples pre-existed)
UPDATE ar_ling_root_vocab SET
  core_sense_ar = 'انفصالٌ يُظهِر: ما بانَ انكشف واتّضح، فالمُبين بيِّنٌ في نفسه مُبينٌ لغيره',
  core_sense_en = 'clarity through separation — what stands apart shows itself; mubīn is clear in itself and clarity-giving'
WHERE root_norm='بين' AND core_sense_en IS NULL;

-- W400 — kmaps_five_lens synthesis entry
INSERT OR IGNORE INTO ar_ling_lexicon_root_entries
  (id, source_id, source_slug, root_id, root_text, root_norm, entry_text_ar, entry_text_en, raw_text, status, created_at, updated_at)
VALUES (
  're_kmaps_byn_dukhan_2', 'SRC:KMAPS:FIVE_LENS', 'kmaps_five_lens',
  'a30d6f8ea317824c7b2d71a0c0', 'بين', 'بين', 'الْمُبِينِ', 'mubīn',
  'mubīn (Q 44:2) — root ب ي ن, pattern مُفْعِل. SARF: ism fāʿil (active participle) of Form IV abāna–yubīnu, ajwaf yāʾī; mubyin resolves to mubīn by iʿlāl bi-l-naql. Form IV is both lāzim and mutaʿaddī: abāna = became clear AND made clear. IRAB: majrūr — naʿt of al-kitāb in the oath wa-l-kitābi l-mubīn (al-Muyassar: al-kitāb majrūr bi-wāw al-qasam, wa-l-mubīn naʿt li-l-kitāb). DALALA: Ibn Fāris — the single core is buʿd al-shayʾ wa-inkishāfuh: parting and disclosure; al-Rāghib — bāna = infaṣala wa-ẓahara mā kāna mustatiran, and bayn also names the interval between two things; hence mubīn: bayyin fī nafsih, mubīn li-ghayrih. Sinai key-terms for the root: bayān, mubayyin, mustabīn. BALAGHA: the oath is sworn BY the Book itself, and its ṣifa mubīn carries the argument — the muqsam bihi is itself the evidence for the muqsam ʿalayh (its revelation); the Form IV participle compresses two claims: clear in itself, clarity-giving to others. TARJAMA: rendering only ''the clear Book'' keeps the intransitive half; mubīn is also causative — the Book that makes things clear (bayyin AND mubayyin).',
  'raw', datetime('now'), datetime('now')
);

-- W400 — the five lens sections
INSERT OR IGNORE INTO ar_ling_lexicon_entry_sections (id, root_entry_id, source_slug, root_text, root_norm, section_seq, heading_ar, heading_norm, heading_bare, section_type, text_en, has_gaps, created_at) VALUES
('sec_kmaps_byn_1','re_kmaps_byn_dukhan_2','kmaps_five_lens','بين','بين',1,'صَرْف','صرف','صرف','lens','Ism fāʿil (active participle) of Form IV abāna–yubīnu, pattern muf''il (مُفْعِل). The root is ajwaf yāʾī (Sinai: ajwaf_ya): the theoretical mubyin undergoes iʿlāl bi-l-naql — the yāʾ''s kasra moves to the bāʾ and the yāʾ rests as a long vowel: mubīn. Form IV here is used both lāzim (abāna = became clear) and mutaʿaddī (abāna = made clear), so the participle carries both readings. Qurʾānic family of the same root: bāna/tabayyana (V), istabāna (X), bayyana (II), bayān, tibyān, bayyina, mubayyina, mustabīn.',0,datetime('now')),
('sec_kmaps_byn_2','re_kmaps_byn_dukhan_2','kmaps_five_lens','بين','بين',2,'إعراب','اعراب','اعراب','lens','Majrūr, with kasra. Naʿt (adjective) of al-kitāb inside the oath: al-Muyassar — the wāw is wāw al-qasam, al-kitāb is majrūr by it (attached to an elided uqsimu), and al-mubīn is naʿt li-l-kitāb. No recorded dispute for this position in the iʿrāb books consulted.',0,datetime('now')),
('sec_kmaps_byn_3','re_kmaps_byn_dukhan_2','kmaps_five_lens','بين','بين',3,'دلالة','دلالة','دلالة','lens','Ibn Fāris (Maqāyīs): the bāʾ-yāʾ-nūn core is one — buʿd al-shayʾ wa-inkishāfuh, parting and disclosure; al-bayn is separation, and bāna al-shayʾ wa-abāna idhā ittaḍaḥa wa-inkashafa. al-Rāghib (Mufradāt): bayn names the interval between two things; bāna = infaṣala wa-ẓahara mā kāna mustatiran — separation and manifestation, each usable alone (bāna l-ṣubḥ = the dawn showed). So mubīn of the Book: bayyin fī nafsih (distinct, set apart) and mubīn li-ghayrih (making truth distinct). Sinai key-terms for the root: bayān, mubayyin, mustabīn.',0,datetime('now')),
('sec_kmaps_byn_4','re_kmaps_byn_dukhan_2','kmaps_five_lens','بين','بين',4,'بلاغة','بلاغة','بلاغة','lens','The oath swears BY the Book about the Book: the muqsam bihi is itself the proof of the muqsam ʿalayh (innā anzalnāhu, 44:3). Its single ṣifa mubīn does the argumentative work — a Form IV participle that compresses two claims at once: the Book is clear in itself and gives clarity about everything else. The same epithet opens the sister ḥawāmīm (43:2) and the Meccan openings 12:1, 26:2, 27:1, 28:2 — a formulaic pairing kitāb + mubīn that binds revelation to intelligibility.',0,datetime('now')),
('sec_kmaps_byn_5','re_kmaps_byn_dukhan_2','kmaps_five_lens','بين','بين',5,'ترجمة','ترجمة','ترجمة','lens','Standard renderings give ''the clear Book'' — only the intransitive half. Because abāna is both lāzim and mutaʿaddī, mubīn is simultaneously bayyin (clear) and mubayyin (clarity-giving): ''the Book that is clear and makes clear.'' Controlled loss if one word must be chosen: ''clarifying Book'' preserves the causative force that the formula kitāb mubīn is claiming.',0,datetime('now'));
