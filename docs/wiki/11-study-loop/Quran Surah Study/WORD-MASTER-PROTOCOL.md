# K-MAPS · WORD MASTER PROTOCOL (v1) — "Word Backbone 360"
**Doc:** WMP twin of `PASSAGE-MASTER-PROTOCOL-v2.md` (CM:01KMASTERPASSAGEPROTOCOL01).
**Invocation:** user passes a **word** — surface (`زُلْفَىٰٓ`), location (`{S}:{a}:{w}`), lemma, or root — → this protocol populates the ENTIRE per-word schema meticulously: every ring, every modality, every source consulted.
**Benchmark exemplar:** root **زلف** @ 39:3 — the one fully-realized word globally: `root_vocab` hook+senses+examples live · `vocab_depth` · `kmaps_five_lens` entry `re_kmaps_zlf_zumar_3` (5 lens sections) · illustration `ILL:زلف:ascent-courtier` · diagram `DIAG:زلف:constellation`.
**Mission:** the system is a **merger of Classical scholarship and the Membean method** (membean.com/how-it-works), passage by passage — Quranic ⊕ Classical ⊕ MSA. One canonical word modal; all morphological & vocabulary learning is based on it.

**Doctrines (inherited verbatim from PMP-v2):** check-before-write · staging `status='raw'` → human gate → `live` · EXTEND-DON'T-DUPLICATE · Arabic-first labels via `qr_ss_term` · dispute-lives-in-readings · every citation FK-resolves · registers kept distinct (linguistic ≠ tafsīr ≠ modern; Quranic ≠ Classical ≠ MSA — *linked, never merged*) · never fake a link (unlinkable stays unlinked with reason).

---
## 1 · REGISTRY

**DBs:** km_quran `8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba` · km_arabic_linguistic `192f4792-deb3-4f2e-9204-532cf484ecd2` · km_content `c59b9640-6e68-4068-8034-33a2fd66cd00` (MORPH playbook `CM:01KMORPLAYBOOKSURAH44M01` — fetch before W-tasks).

**Source registry (the consultation universe):**
- **16 lexicons** (`ar_ling_lexicon_root_entries.source_slug`, canonical order): `saaid_maqayis_al_lugha` → `thahabi_al_khalil_kitab_al_ayn` → `ketabonline_ibn_duraid_jamharat_al_lugha` → `ketabonline_al_jawhari_al_sihah` → `ketabonline_al_fayyumi_misbah_munir` → `qomra_al_qamus_al_muhit` → `qomra_al_ubab_al_zakhir` → `ketabonline_ibn_manzur_lisan_al_arab` → `ketabonline_al_zabidi_taj_al_arus` → `ketabonline_al_raghib_mufradat` → `lane_lexicon` → `sinai_key_terms` (349, MODERN register) → `kmaps_five_lens` (K-Maps synthesis).
- **8 tafsīrs** (`qr_tafsir_entries.scholar_id`): TABARI · ZAMAKHSHARI · IBN_ATIYYA · RAZI · IBN_KATHIR · ABU_HAYYAN · IBN_ASHUR · ALUSI.
- **5 iʿrāb books** (`qr_irab_book_entries.source_slug`): darwish · muyassar · daas · jadwal · tibyan_ukbari.
- **Idiom corpus:** `ar_ling_expressions` × `ar_ling_expression_types` (14 types; `verbal_idiom` = **Mir**; 2,204 rows).
- **Modern scholarship** (`ar_ling_root_scholarship` / `ar_ling_vocab_scholarship`): **Al-Jallad** (seeded: *Excavating the Quran*, `reading_kind='qur_anic_hermeneutic'`, comparanda_json/inscriptions_json/body_html) · **Marijn van Putten** (orthography/phonology — NOT yet in `ar_ling_sources`; register on first citation) · Sinai (source row exists) · any other contemporary work (register: author_name, period_label, source_type='modern_scholarship').

**ID grammar (reuse existing; new rows needing ids → `WMP:{root}:{layer}:{n}`):**
```
word-hash = qr_word_occurrences.id (scope_id in SML/readings — NEVER filter scope_id LIKE)
QR:SML:{S}:{a}:{n} iʿrāb card · QR:SEG:{S}:{a}:{w}:{x} segment · QR:SR reading
ALQL:RV:{S}:{root} quran↔vocab link · AREX:KM{S}:{n} expression · NS:{...} synonym set
ILL:{root}:{key} illustration · DIAG:{root}:{key} diagram · re_kmaps_{root}_{ref} five-lens entry
qr_ss_term keys: role-slug | AL:nahw:{slug}→strip prefix | rel:{type} | src:{slug}
```

---
## 2 · CONCEPT — 4 RINGS × 12 MODALITIES

```
RING 1 · OCCURRENCE  this word in this ayah        (km_quran)
RING 2 · LEMMA/WORD  the dictionary word           (km_quran + AL)
RING 3 · ROOT        the etymological family       (AL)
RING 4 · LEARNING    memory · review · mastery     (AL + km_core user, P2)
```

| # | Modality | Origin | Tables |
|---|---|---|---|
| 1 | Sarf backbone | Classical | `qr_word_occurrences.morphology_tag_json` (QAC 77,427 full-Quran) · `ar_ling_morphology`+`form_paradigms`+`conjugation_templates` |
| 2 | Iʿrāb card | Classical | `qr_ss_scope_morph_link` × `qr_ss_term` · `qr_ss_occ_segment` |
| 3 | Root & etymology | Classical | `ar_ling_roots` (letters/type/weak_pattern/freq/meaning_core_ar,en/buckwalter) |
| 4 | Comparative-Semitic/epigraphic | Modern | `ar_ling_root_scholarship` (comparanda/inscriptions/**body_html**) · `ar_ling_vocab_scholarship` |
| 5 | Five lenses مقاييس·مفردات·Lane·Sinai·Mir | Both | `lexicon_root_entries`+`entry_sections` (5 `section_type='lens'`: صرف/إعراب/دلالة/بلاغة/ترجمة) |
| 6 | Memory hook | Membean | `root_vocab.membean_hook` · `vocab_memory_hooks` (sound/image/story) |
| 7 | Constellation word-web | Membean | `near_synonym_sets`(746)+`members`(3,269; nuance/contrast/usage_rule/quran_usage_pattern, AR/EN/**UR**) · `root_antonyms` · `root_relations` · `root_semantic_fields` |
| 8 | Senses grid (polysemy) | Classical | `ar_ling_senses` · `unique_senses_json` · `vocab_depth.nuance_gems_json` (attributed) |
| 9 | Image/visual | Membean | `vocab_illustrations` (svg_inline/palette) · `vocab_diagrams` (spec_json, constellation-v1) |
| 10 | Context: Qurʾān+idiom+tafsīr | Both | `examples_json` · `expressions` (Mir) · `qr_tafsir_entries` · `lexicon_quran_refs` (7,496) |
| 11 | Register bridge Quranic/Classical/MSA | Merger | `ar_ling_lemmas` (78,886) · `lemma_registers` (4,826) · `lemma_variants` · freq_quran/hadith |
| 12 | Exercises + SRS (in-app **and Anki**) | Membean | `vocab_exercises` · `vocab_srs` (**SM-2/Anki-native**: ease 2.5/interval_days/reps/lapses/due_at/last_grade/status) |

---
## 3 · W000 — RESOLVE + COVERAGE AUDIT (read-only)

```sql
-- surface → occurrence(s)
SELECT id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag_json
FROM qr_word_occurrences WHERE word_text='{w}' OR word_text_bare='{bare}' OR (surah={S} AND ayah={a} AND word_index={i});
-- lemma chain
SELECT lo.lemma_id, l.lemma_text, l.total_occurrences, l.lx_lemma_ref FROM qr_lemma_occurrences lo JOIN qr_lemmas l ON l.id=lo.lemma_id WHERE lo.word_occurrence_id='{word-hash}';
-- AL home
SELECT id, part_of_speech, verb_form, is_quran_word, frequency_quran FROM ar_ling_lemmas WHERE lemma_text='{lemma}' OR lemma_text_bare='{bare}';
SELECT id, root_letters, root_type, weak_pattern, frequency_quran, meaning_core_ar, meaning_core_en FROM ar_ling_roots WHERE root_text='{r}' OR root_normalized='{r}';
```
Emit **identity card** `{word_id, lemma_id(QR+AL), root_id, root_norm, all_occurrence_locations}` + **coverage audit** — one COUNT per layer (SML, segments, five_lens, root_vocab, depth, senses, NS membership, illustrations, scholarship, registers, exercises, srs) → per-layer verdict EXTEND / SKIP / BUILD.

---
## 4 · W050 — MANDATORY SOURCE CONSULTATION SWEEP (no authoring before this completes)

Fetch and READ every source layer; record absences honestly ("no entry in X") — never skip silently:

1. **All 16 lexicons:** `SELECT source_slug, raw_text, entry_text_ar, page_start, volume_no FROM ar_ling_lexicon_root_entries WHERE root_norm='{r}'` + sections (`entry_sections` by root+slug, ordered) + `lexicon_quran_refs` for شواهد. Lane hygiene: Arabic-ratio check → dirty = raw panel only.
2. **All 8 tafsīrs**, per occurrence ayah: `SELECT scholar_id, content_ar FROM qr_tafsir_entries WHERE surah={S} AND ayah_from<={a} AND ayah_to>={a}`.
3. **All 5 iʿrāb books**, per ayah: `SELECT source_slug, irab_text_ar, source_quote_ar, grammar_role_ar, alternative_json FROM qr_irab_book_entries WHERE ayah_key='{S}:{a}' ORDER BY source_slug, entry_order` (filter ayah_key EARLY — 125k-row join cost).
4. **Mir verbal idioms:** probe `ar_ling_expressions` by pipe-tokens of the word/lemma/root AND quoted refs `qr_refs_json LIKE '%"{S}:{a}"%'`, join `expression_types` (type_key='verbal_idiom' + all 14 types).
5. **Sinai Key Terms:** `… WHERE root_norm='{r}' AND source_slug='sinai_key_terms'` — MODERN register card, never merged with classical.
6. **Modern scholarship:** `SELECT * FROM ar_ling_root_scholarship WHERE root_norm='{r}'` + `ar_ling_vocab_scholarship WHERE lemma_norm/root_norm` — Al-Jallad (seeded), **Van Putten** (register `ar_ling_sources` row on first citation), others. New sources: author_name, period_label, source_type='modern_scholarship', staged raw.

**Output = SOURCE MATRIX** (source × has-entry ✓/∅ × consulted ✓), persisted into downstream `sources_json`/`note_md`. Evidence discipline: every gem/lens/nuance cites a matrix source; textual vs interpretive vs inferred kept distinct; no claim without source.

---
## 5 · W100 — OCCURRENCE CARD (km_quran)

Per occurrence in scope: ① ensure `qr_ss_scope_morph_link` row (scope_id=word-hash, `lx_morph_ref='AL:nahw:{slug}'`, irab_position ∈ rafa/nasb/jarr/jazm/mabni[_mahall], irab_sign ∈ damma/fatha/kasra/ya/thubut_nun/muqaddara, syntactic_function slug, is_disputed+dispute_note→QR:SR, note_md `{"sources":[…]}` from W050 matrix) — grounded in the 5 iʿrāb books, disputes get one row per position in `qr_ss_scope_reading`, NOT prose. ② segments in `qr_ss_occ_segment` — split ONLY function-particle+clitic & nāqiṣ+ism (فيها، إنّا، كنتم); never conjunction-wāw, never noun/ẓarf+pronoun. ③ register every new slug in `qr_ss_term` (label_ar + category + color; sarf #93b8d6, حرف #c6a5da, اسم #93b8d6, فعل #d8a35d).
**Verify:** SML exists per occurrence · every slug resolves in qr_ss_term · disputed ⇒ ≥2 readings.

## 6 · W200 — LEMMA + REGISTERS + MORPHOLOGY GRID (the MSA bridge)

① `ar_ling_lemmas` row (pos, verb_form, is_quran_word, frequency_quran). ② `ar_ling_lemma_registers` — one row per register the lemma lives in: `quranic` / `classical` / `msa` (+frequency_note e.g. "MSA: high, journalism"); this IS the Quranic↔Classical↔MSA bridge — linked, never merged. ③ `ar_ling_lemma_variants` (orthographic/dialectal/MSA-variant). ④ sarf generation: `ar_ling_morphology` rows (form_ar, stem_type, pattern فِعَال etc., tags) + link via `lemma_morphology`; verbs → `form_paradigms`+`conjugation_templates` grid (person×tense×voice). ⑤ `ar_ling_vocab_scholarship` lemma-level readings from W050.
**Verify:** ≥1 register row; Quran word ⇒ 'quranic' present; verb ⇒ paradigm resolvable.

## 7 · W300 — ROOT + ETYMOLOGY + MODERN DEPTH

① `ar_ling_roots` — ensure/curate: root_letters, root_type, weak_pattern, freq, **meaning_core_ar/en (curate if null — never AI-blind; from Maqāyīs core)**. ② `ar_ling_root_scholarship` — comparative-Semitic panel: comparanda_json (cognates), inscriptions_json (epigraphy), body_md/**body_html**, citations_json; Al-Jallad pattern; Van Putten & others same shape. ③ `root_semantic_fields` + `root_relations` (probe first). ④ `ar_ling_quran_links` ALQL:RV attests row per root per new surah scope.
**Verify:** meaning_core non-null post-run; every scholarship row FK→sources.

## 8 · W400 — FIVE-LENS SYNTHESIS + SENSES

① Probe `kmaps_five_lens`: `SELECT id FROM ar_ling_lexicon_root_entries WHERE root_norm='{r}' AND source_slug='kmaps_five_lens'` — EXTEND if exists. ② Author entry `re_kmaps_{r}_{ref}` — raw_text = the synthesis (exemplar shape, زلف): *word (Q ref) — root, pattern فُعْلَىٰ. SARF: … IRAB: … DALALA: (Ibn Fāris thrust-forward core; Rāghib gloss) BALAGHA: … TARJAMA: what standard renderings lose.* ③ 5 section rows in `entry_sections` (`section_type='lens'`, heading_ar صَرْف/إعراب/دلالة/بلاغة/ترجمة). ④ `ar_ling_senses` grid per lexicon_entry (sense_number, gloss_ar/en, qr_ref). ⑤ Every lens claim cites the W050 matrix.
**Verify:** 5 lens sections exist; senses ≥1 for anchor roots; 0 uncited claims.

## 9 · W500 — CONSTELLATION (word-web)

① Probe NS sets by lemma AND by semantic field (`near_synonym_sets` 746 — never duplicate a set; probe slug/canonical). ② Extend `near_synonym_members` with FULL nuance block: nuance_note, basic_gloss, contrast_note, usage_rule, quran_usage_pattern (+ _ur fields where feasible). ③ `root_antonyms` (relation_kind antonym/contrast). ④ `root_semantic_fields` placement. ⑤ diagram spec → W600.
**Verify:** word belongs to ≥1 set with a real contrast_note vs its nearest synonym; 0 duplicate sets.

## 10 · W600 — MEMORY SUITE (Membean modalities)

① `root_vocab` — EXTEND-DON'T-DUPLICATE by root_norm: **membean_hook** style = ONE sentence; English resonance word with *asterisks*; ends with the Arabic kernel (exemplar: زلف "Hear zulfā in *zeal*ous: an eager advance into nearness — a courtier brought near into rank, not merely standing close."); membean_anchors_json {NS: ids, sinai_key_term}; unique_senses_json (AR array); examples_json 2–4 cross-Quran refs incl. current; **first_surah/ayah = encounter point** (passage-by-passage build order). ② `vocab_memory_hooks` extra hooks (hook_kind sound/image/story, anchor_word). ③ `vocab_illustrations` (ILL:{root}:{key}, caption_md, palette, svg_inline when authored). ④ `vocab_diagrams` (DIAG:{root}:constellation, renderer_key constellation-v1, spec_json {center, senses[{id,label,ref}], near_synonyms[], antonyms[]}). ⑤ `vocab_depth` gems for flagship roots — concrete, attributed (Maqāyīs/Mufradāt/Sinai/Mir/tafsīr via sources_json), theologically load-bearing.
**Verify:** hook matches style-guide; 0 dup root_vocab per root_norm; gems all attributed.

## 11 · W700 — CONTEXT (shawāhid + idioms + tafsīr links)

① examples_json already carries cross-Quran refs (W600) — each ref must EXIST in qr_ayah. ② Mir/idioms: probe-before-insert `ar_ling_expressions` (pipe tokens + quoted qr_refs); new = AREX:KM{S}:{n}, [kmaps,status=raw], tokenize `expression_tokens`; idiom on this root → also `quran_links` + mention in depth gem. ③ tafsīr: surface per-ayah snippets (no new rows; the modal reads `qr_tafsir_entries` live, register-tagged). ④ `lexicon_quran_refs` inside scope → mirror `ar_ling_quran_links`.
**Verify:** every ref FK-resolves; 0 dup AREX.

## 12 · W800 — EXERCISES · W900 — SRS SEED + ANKI CONTRACT

**W800:** ≥3 `vocab_exercises` kinds per word (cloze-in-ayah [qr_ref], MCQ sense-discrimination vs near-synonyms, root-family mapping, pattern/wazn drill for verbs); options_json + answer_key; difficulty 1–5; status raw.
**W900:** `vocab_srs` seed `INSERT OR IGNORE (id, workspace_id, root_norm, status='new', due_at=now)`. **In-app engine:** grade again/hard/good/easy → SM-2 update (ease_factor, interval_days, reps, lapses, due_at, last_grade). **Anki feed (1:1 field map):** Front = surface + ayah cloze; Back = membean_hook + senses + lens summary + constellation thumb + gloss; scheduling state (interval/ease/reps/lapses) maps natively → genanki `.apkg` / CSV export or AnkiConnect push. P2: user-scoping via km_core (today workspace-scoped).
**Verify:** exercises answer_key ∈ options; srs row unique per (workspace, root).

---
## 13 · MODAL RENDER CONTRACT (GSAP; RTL dir=rtl + flex row NEVER row-reverse; Arabic-first labels via qr_ss_term)

```
HEADER   surface (hero) · lemma · root chips · pos/iʿrāb color chip · ayah ref + translation line
TAB ص    الصرف والإعراب — QAC feature grid · segments ribbon (term colors) · SML card
         (position/sign/function/sources; dispute ⇒ مجلس الخلاف) · conjugation grid (verbs)
TAB ج    الجذر والاشتقاق — root letters animated · type/weak_pattern · meaning_core ·
         freq Qurʾān/ḥadīth · comparative-Semitic panel (body_html, inscriptions, comparanda)
TAB ع    العدسات الخمس — مقاييس/مفردات/Lane/Sinai/Mir tabs; kmaps_five_lens synthesis first
         (صرف/إعراب/دلالة/بلاغة/ترجمة), else raw entries; Sinai visually distinct; Lane dirty→raw panel
TAB ك    الكوكبة — constellation (spec_json renderer) · NS members w/ nuance+contrast+usage_rule+
         quran_usage_pattern (AR/EN/UR) · antonyms · semantic fields
TAB م    الذاكرة — membean hook (*starred* resonance) · memory hooks · illustration · senses chips
TAB ش    الشواهد والسياق — cross-Quran examples (tap→ayah) · Mir idioms · tafsīr snippets (8, register-tagged)
TAB س    السجلّات — Quranic/Classical/MSA bridge (lemma_registers + variants + freq notes)
FOOTER   تمرين ومراجعة — inline exercises · SRS grade bar → SM-2 · «أضِف إلى Anki» ·
         coverage flags (honest «لم تُحرَّر بعد» per missing curated layer — never blank)
```
GSAP: overlay fade + card scale/translate, staggered section reveal; Esc + focus-trap; `prefers-reduced-motion` respected. API: `GET /qr/study/surahs/:s/passages/:p/morphology` (word list) + AL `word-analysis` batch by roots — ALL shaping server-side, zero UI normalization.

---
## 14 · MASTER VERIFICATION + CURRENT GAP INVENTORY

```sql
-- 1 identity: word→lemma→root chain resolves (0 orphans)
-- 2 source matrix persisted; 0 uncited gems/lenses
-- 3 SML per occurrence; slugs resolve; disputed⇒≥2 readings
-- 4 registers ≥1/lemma; five-lens 5 sections; hook style check
-- 5 FK: examples/qr_refs/quran_links/anki fields all EXISTS
-- 6 dup guards: root_vocab per root_norm · AREX · NS sets · srs (workspace,root)
-- 7 staging report raw counts → human gate → promote → 0 raw
```
**Gap inventory (2026-07-04 audit, 44:1–9 = 52 words/27 roots):** QR ring 100% (QAC 52/52, SML 52/52, tafsir 21, lemma-links 48/52) · hooks 56/56 seeded roots · lexicons ~80% roots (Lane 23, Maqāyīs 22, Rāghib 21, Sinai 19 of 27) · **five_lens 1 root globally (زلف)** · depth 6 · meaning_core_en 7/27 · illustrations/diagrams 2 · `ar_ling_morphology` 0 (!) · paradigms 5 / conj 13 · senses 8 · registers 4,826/78,886 lemmas · root_scholarship 11 · exercises 12 · srs 6. → The pipeline/UI renders everything that exists and flags the rest; W-runs close the gaps word by word, passage by passage.

**D1 gotchas:** batch UPDATE may 500 transiently → retry per-statement · compound SELECT ≤ ~6 terms · filter irab joins by ayah_key early · INSERT OR IGNORE everywhere · idempotent guards.

---
*v1 · 2026-07-04 · grounded in live remote-D1 inventories (this session) · exemplar زلف end-to-end · twin of PASSAGE-MASTER-PROTOCOL v2*
