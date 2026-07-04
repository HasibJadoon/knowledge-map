# SS Deep Task Protocol — Sentence Structure for Any Surah Passage

**Load this before any SS task.** Operational memory for a deep, full sentence-structure build on passage `{S}:{A1}-{A2}` in `km_quran` (D1 `8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba`).
Verified on 44:1–9 (`UT:C:QURAN:44:1-9:SS:300` → availability=live, 16/16 tables, zero orphans).
Reference implementations: **Surah 39** (readable IDs + readings layer) · **Surah 12** (sentence/clause note style `Mode: khabariyya…`).
Companion doc-space copy: `CM:01KSSPLAYBOOKSURAH44SS01` (km_content `c59b9640…`).

**Workflow law:** show proposed rows on screen → approval → insert. Check-before-write (run §7 counts first; UPDATE if rows exist). Never use `ar_container_unit_task`. Display Quran text from `text_uthmani_clean` only.

---

## 1. Preconditions — coverage scan

```sql
-- iʿrāb coverage
SELECT source_slug, COUNT(*) n FROM qr_irab_book_entries
WHERE surah={S} AND ayah_from<={A2} AND ayah_to>={A1} GROUP BY source_slug;

-- tafsir coverage (keys on scholar_id, NOT source_slug)
SELECT scholar_id, COUNT(*) n, MIN(ayah_from)||'-'||MAX(ayah_to) cover
FROM qr_tafsir_entries WHERE surah={S} AND ayah_from<={A2} AND ayah_to>={A1}
GROUP BY scholar_id;

-- existing SS rows (also the final verification shape)
SELECT (SELECT COUNT(*) FROM qr_ss_occ_sentence WHERE surah={S}) sent,
       (SELECT COUNT(*) FROM qr_ss_occ_clause  WHERE surah={S}) cl;

-- word anchors: fetch ONCE per passage (bare text keeps hamza: أمرا not امرا)
SELECT id, ayah, word_index, word_text_bare FROM qr_word_occurrences
WHERE surah={S} AND ayah BETWEEN {A1} AND {A2} ORDER BY ayah, word_index;
```

**Six iʿrāb sources:** `qul_irab_muyassar` (per-āya) · `qul_irab_quran_daas` (word-level, wide ayah ranges — filter by `target_text_ar`, never by range alone) · `qul_jadwal_irab_quran` (Maḥmūd Ṣāfī; clause-level + `alternative_json`) · `tibyan_ukbari_irab` (multi-wajh disputes) · `qul_irab_darwish` (combined-range) · `qul_dep_graphs` (often empty).
Text column is `irab_text_ar` / `irab_text` — **not** `text_ar`.

**Eight tafsirs, grammar roles:** Ṭabarī (Kūfan/Baṣran madhhab attributions) · Zamakhsharī (balāgha, ḥaṣr, laff-nashr) · Ibn ʿAṭiyya (minority readings) · Ālūsī (rebuttals) · Abū Ḥayyān (qirāʾāt-syntax) · Rāzī (argument structure) · Ibn Kathīr · Ibn ʿĀshūr (taʿlīl, discourse).

---

## 2. ID conventions (all 16 tables)

| Table | ID pattern | Critical notes |
|---|---|---|
| qr_ss_occ_sentence | `QR:SS:{S}:{a}:s{n}` | multiple per āya OK; `note_md` starts `Mode: …` |
| qr_ss_occ_clause | `QR:CL:{S}:{a}:c{n}` | function slugs: jawab_qasam, khabar_inna, talil, idrabiyya, istinaf_bayani… |
| qr_ss_occ_phrase | `QR:PH:{S}:{a}:p{n}` | `word_start_index`/`word_end_index` **NOT NULL** |
| qr_ss_occ_segment | `QR:SEG:{S}:{a}:{w}:{x}` | split only iʿrāb-bearing morphology (واو القسم، إنّ+اسمها، لا الجنسية، بل…) |
| qr_ss_scope_reading | `QR:SR:{S}:{a}:r{n}` | `reading_text` (EN) **NOT NULL**; `scholar_ref` semicolon-joined; `is_minority`/`is_contested` |
| qr_evidence_items | `QR:EV:{S}:{a|range}:{src}` | `content_text` (EN) **NOT NULL**; type irab_book\|tafsir |
| …reading_evidence_link | PK (reading, evidence) | `evidence_id` FK → **qr_evidence_items only**, never raw entries |
| qr_ss_ellipsis_event | `QR:EL:{S}:{n}` | elided_element + rhetorical_effect |
| qr_ss_scope_relations | `QR:SREL:{S}:{n}` | sentence↔sentence discourse edges (talil, idrab, laff_nashr…) |
| qr_ss_tree | `QR:TR:{S}:{a}:s{n}` | constituency, grounding=authored, source_ref=task id |
| qr_ss_tree_node | `QR:SSN:{tree}:$.tree.children[i]…` | JSONPath ids; `term_key`→qr_ss_term; `label_ar` |
| qr_ss_tree_edge | `QR:SSE:{node-suffix}` | mirrors parent-child; edge_label NULL |
| qr_ss_scope_member_map | `QR:SMM:{S}:{a}:{w}` | word→sentence, role=member (all words) |
| qr_ss_syntax_relations | `QR:SYN:{S}:{a}:{n}` | **consensus relations only** |
| qr_ss_term | slug | validate first; add missing with sort_order 900+ |
| step / task | `QR:STEP:{S}:{A1}-{A2}:sentence_structure` / `UT:C:QURAN:{S}:{A1}-{A2}:SS:300` | source_table=`qr_surah_study_tasks` |

Terms already added (900-series): `damir_fasl, la_nafiya_lil_jins, harf_qasam, jawab_al_qasam, harf_idrab, ism_la, maful_lahu`.

---

## 3. FK-safe insert order

1. New `qr_ss_term` rows
2. Sentences → 3. Clauses → 4. Readings
5. **Evidence items** — INSERT-SELECT aggregates (no token cost, no transcription errors):

```sql
INSERT INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, source_ref, note_md)
SELECT 'QR:EV:{S}:'||ayah_from||':muyassar','irab_book','الإعراب الميسر','{S}:'||ayah_from,
  'Aggregated Muyassar entries', substr(group_concat(irab_text_ar,' ‖ '),1,600),
  'qul_irab_muyassar','{"slug":"qul_irab_muyassar"}'
FROM qr_irab_book_entries
WHERE surah={S} AND source_slug='qul_irab_muyassar' AND ayah_from BETWEEN {A1} AND {A2}
GROUP BY ayah_from;
-- tafsir EV: INSERT-SELECT by known QR:TE id with substr(content_ar,1,500)
```

6. Evidence links (VALUES; deterministic EV ids; `support_type` supports|contests)
7. Ellipsis + scope_relations + phrases (with word indices)
8. Trees → nodes → **edges via mirror**:

```sql
INSERT INTO qr_ss_tree_edge (id, tree_id, parent_node_id, child_node_id, edge_label)
SELECT 'QR:SSE:'||substr(id,8), tree_id, parent_node_id, id, NULL
FROM qr_ss_tree_node
WHERE tree_id LIKE 'QR:TR:{S}:%' AND parent_node_id IS NOT NULL
  AND id NOT IN (SELECT child_node_id FROM qr_ss_tree_edge);
```

9. Segments + **member map server-side** (CASE split for multi-sentence āyāt):

```sql
INSERT INTO qr_ss_scope_member_map (id, word_occurrence_id, scope_type, scope_id, member_role)
SELECT 'QR:SMM:{S}:'||ayah||':'||word_index, id, 'sentence',
  CASE WHEN word_index<={split} THEN 'QR:SS:{S}:{a}:s1' ELSE 'QR:SS:{S}:{a}:s2' END, 'member'
FROM qr_word_occurrences WHERE surah={S} AND ayah={a};
```

10. Syntax relations (consensus word pairs, VALUES with fetched word ids)
11. Step + task rows; availability honest.

---

## 4. Dispute doctrine (core design rule)

- Every wajh = its own `qr_ss_scope_reading` row. **Never flatten** into clause notes or syntax edges.
- `scholar_ref`: semicolon-joined source slugs + `QR:WORK:`/`QR:SCH:` refs + `jumhur`.
- Madhhab framing (Kūfan/Baṣran) via Ṭabarī evidence.
- Minority views `is_minority=1`; rebuttals linked `support_type='contests'` (pattern: Ibn ʿAṭiyya jawāb reading vs Ālūsī → `QR:SR:44:3:r3`).
- Qirāʾa-driven parses: separate reading rows per reader group (ربِّ jarr = ʿĀṣim/Ḥamza/Kisāʾī vs rafʿ = the rest).
- `qr_ss_syntax_relations` stores ONLY consensus (naat, mudaf_ilayh, mutaalliq, naib_fail, atf, majrur). Disputed attachments (أمرا-type) stay in readings.
- Cross-reference in notes: `انظر QR:SR:{S}:{a}:r1–r6`.

---

## 5. Depth levels

**L1 Baseline** (= 44:1–9 state): sentences, clauses, readings+evidence+links, ellipsis, scope_relations, phrases, complete trees, segments, member map, consensus syntax relations, step+task.

**L2 Deeper — add:**
- `qr_ss_scope_balagha_link` (`lx_balagha_ref`, balagha_category, rhetorical_effect): taqdīm (فيها), ḥaṣr (لا…إلا / ضمير الفصل), iẓhār (ربك), laff-nashr, iltifāt.
- `qr_ss_scope_grammar_link` (`lx_grammar_ref` → km_arabic_linguistic `192f4792` concepts; dual-DB rule).
- `qr_ss_scope_nuance`: parse-meaning flips (يلعبون خبر ثانٍ vs حال).
- Phrase-scope readings; qirāʾāt rows for every variant in Abū Ḥayyān / Ibn ʿAṭiyya (incl. shādhdh, attributed).

**L3 Fullest — add:**
- Full dependency graph: syntax_relations for every word, disputed edges carrying dispute pointer in `note_md`.
- `qr_ss_tree_layout_cache` when UI requests.
- Promote contested readings into `qr_interpretive_differences` / `qr_scholar_positions` (feeds scholarship task 700).
- AL cross-links via `qr_irab_book_entries.al_mapping_*` + `AL.ar_ling_quran_links`.

---

## 6. D1 gotchas (hard-won)

- Multi-statement batches **roll back entirely** on any statement error — verify counts after failures.
- Compound SELECT ≤ ~4–5 UNION ALL terms.
- NOT NULL traps: `reading_text`, `content_text`, phrase word indices.
- `evidence_id` FK → qr_evidence_items (never raw iʿrāb/tafsir entries).
- `qr_tafsir_entries` keys on `scholar_id`; iʿrāb text col is `irab_text_ar`.
- Daʿʿās rows span wide āya ranges — filter by `target_text_ar`.
- Full DB UUID required for the D1 MCP tool.

---

## 7. Verification suite (must be 0 / full coverage)

```sql
SELECT
 (SELECT COUNT(*) FROM qr_ss_occ_sentence s WHERE s.surah={S}
   AND NOT EXISTS (SELECT 1 FROM qr_ss_occ_clause c WHERE c.sentence_id=s.id)) sent_no_clause,
 (SELECT COUNT(*) FROM qr_ss_tree t WHERE t.id LIKE 'QR:TR:{S}%'
   AND NOT EXISTS (SELECT 1 FROM qr_ss_tree_node n WHERE n.tree_id=t.id)) tree_no_nodes,
 (SELECT COUNT(*) FROM qr_ss_scope_reading r WHERE r.id LIKE 'QR:SR:{S}%'
   AND NOT EXISTS (SELECT 1 FROM qr_ss_scope_reading_evidence_link l WHERE l.reading_id=r.id)) rdg_no_evidence,
 (SELECT COUNT(DISTINCT ayah_from) FROM qr_ss_occ_sentence WHERE surah={S}) ayat_covered,
 (SELECT COUNT(*) FROM qr_ss_tree_edge e WHERE e.tree_id LIKE 'QR:TR:{S}%'
   AND e.child_node_id NOT IN (SELECT id FROM qr_ss_tree_node)) edge_orphans;
```

Set `task_json.availability` honestly (`pending` → `partial` → `live`) with explicit `pending[]`; `live` only when empty.

---

## 8. Task row template

```json
{"task_key":"sentence_structure","unit_id":"U:C:QURAN:{S}:{A1}-{A2}","surah":{S},
 "ayah_from":{A1},"ayah_to":{A2},
 "sources":["qr_ss_occ_sentence","qr_ss_occ_clause","qr_ss_scope_reading","qr_ss_occ_phrase","qr_ss_tree","qr_ss_ellipsis_event","qr_ss_scope_relations"],
 "mapped_from":["qr_irab_book_entries","qr_tafsir_entries"],
 "evidence_layer":"qr_evidence_items+qr_ss_scope_reading_evidence_link",
 "resolve":"by_ayah_range","availability":"live","pending":[]}
```

**Benchmark (44:1–9, 9 āyāt):** sent 11 · clause 20 · reading 20 · ev 22 · link 50 · ellipsis 5 · screl 5 · phrase 14 · tree 11 · node 62 · edge 51 · seg 19 · smm 52 · syn 17 · terms +7 ≈ **310 rows**. Scale by verse count × dispute density.
