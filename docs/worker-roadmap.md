# K-MAPS v2 — Cloudflare Workers Roadmap

> Last updated: 2026-04-19
> Full route inventory, file structure, implementation patterns, and DB table
> dependencies for every Worker in the K-MAPS platform.

---

## 1. Overview

All Workers live under `functions/` and are deployed as Cloudflare Pages Functions.
Each file maps directly to a route: `functions/qr/surahs.ts` → `GET /qr/surahs`.

### Shared Conventions

```
functions/
├── _middleware.ts          ← CORS, auth token check, D1 binding inject
├── _shared/
│   ├── db.ts               ← D1 helper (query, queryOne, execute, paginate)
│   ├── auth.ts             ← JWT / API key validation
│   ├── response.ts         ← ok(), err(), paginated() response helpers
│   ├── ulid.ts             ← ULID generator
│   ├── validate.ts         ← Zod-based request body validation
│   └── types.ts            ← shared TS types (PaginatedResult, ApiError, etc.)
```

### Response Shape (all routes)

```typescript
// Success
{ ok: true, data: T }
{ ok: true, data: T[], meta: { total, page, per_page, has_more } }

// Error
{ ok: false, error: { code: string, message: string } }
```

### Authentication
- Public read routes: no auth
- Write routes: `Authorization: Bearer <token>` checked in `_middleware.ts`
- Admin routes: additional admin role check

### D1 Binding
Available as `env.DB` (type `D1Database`) on every Worker via wrangler.toml:
```toml
[[d1_databases]]
binding = "DB"
database_name = "knowledgemap"
database_id = "<uuid>"
```

---

## 2. Module QR — Quran Corpus (`functions/qr/`)

### 2.1 `surahs.ts`  →  `/qr/surahs`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/surahs` | List all 114 surahs |
| GET | `/qr/surahs/:id` | Single surah metadata |
| PATCH | `/qr/surahs/:id` | Update surah metadata (admin) |

**Tables**: `qr_surahs`

```typescript
// GET /qr/surahs
SELECT id, name_ar, name_en, name_transliteration, revelation_type,
       ayah_count, juz_start, page_start
FROM qr_surahs
ORDER BY id;
```

---

### 2.2 `ayahs.ts`  →  `/qr/ayahs`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/ayahs?surah=1` | All ayahs of a surah |
| GET | `/qr/ayahs?surah=1&from=1&to=7` | Range of ayahs |
| GET | `/qr/ayahs/:surah/:ayah` | Single ayah |
| PATCH | `/qr/ayahs/:surah/:ayah` | Update verse mark / translation (admin) |

**Tables**: `qr_ayah`, `qr_surahs`

```typescript
// GET /qr/ayahs?surah=2&from=1&to=10
SELECT surah, ayah,
       COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text_display,
       text_uthmani_clean, text_uthmani, translation, verse_mark, page_number
FROM qr_ayah
WHERE surah = ?1 AND ayah BETWEEN ?2 AND ?3
ORDER BY ayah;
```

---

### 2.3 `passages.ts`  →  `/qr/passages`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/passages?surah=18` | All passages of a surah |
| GET | `/qr/passages/:id` | Single passage with ayah range |
| POST | `/qr/passages` | Create passage (admin) |
| PATCH | `/qr/passages/:id` | Update passage |
| DELETE | `/qr/passages/:id` | Delete passage |

**Tables**: `qr_surah_passages`, `qr_ayah`

---

### 2.4 `translations.ts`  →  `/qr/translations`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/translations` | List available translation sources |
| GET | `/qr/translations/:source_id/ayahs?surah=1` | All ayah translations from a source |
| GET | `/qr/translations/:source_id/passages?surah=18` | Passage-level translations |
| POST | `/qr/translations` | Add translation source (admin) |

**Tables**: `qr_translation_sources`, `qr_translations`, `qr_translation_passages`

---

### 2.5 `word-occurrences.ts`  →  `/qr/word-occurrences`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/word-occurrences?surah=1&ayah=1` | All word occurrences for an ayah |
| GET | `/qr/word-occurrences?root=كتب` | All occurrences of a root |
| GET | `/qr/word-occurrences?lemma_id=<id>` | All occurrences of a lemma |

**Tables**: `qr_word_occurrences`, `qr_lemmas`, `qr_lemma_occurrences`

```typescript
// GET /qr/word-occurrences?root=كتب
SELECT wo.surah, wo.ayah, wo.word_index, wo.word_text,
       wo.root, wo.lemma, wo.pos,
       COALESCE(a.text_uthmani_clean, a.text_uthmani) AS ayah_text
FROM qr_word_occurrences wo
JOIN qr_ayah a ON wo.surah = a.surah AND wo.ayah = a.ayah
WHERE wo.root = ?1
ORDER BY wo.surah, wo.ayah, wo.word_index;
```

---

### 2.6 `lemmas.ts`  →  `/qr/lemmas`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/lemmas?surah=1` | Lemmas occurring in surah |
| GET | `/qr/lemmas/:id` | Single lemma details |
| GET | `/qr/lemmas/:id/occurrences` | All Quran occurrences of lemma |

**Tables**: `qr_lemmas`, `qr_lemma_occurrences`, `qr_word_occurrences`

---

### 2.7 `motifs.ts`  →  `/qr/motifs`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/motifs` | List all motifs (paginated) |
| GET | `/qr/motifs?surah=18` | Motifs in a surah |
| GET | `/qr/motifs/:id` | Single motif + occurrences |
| POST | `/qr/motifs` | Create motif (admin) |
| POST | `/qr/motifs/:id/occurrences` | Add occurrence |
| DELETE | `/qr/motifs/:id/occurrences/:occ_id` | Remove occurrence |

**Tables**: `qr_motif_index`, `qr_motif_occurrences`

---

### 2.8 `tafsir.ts`  →  `/qr/tafsir`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/tafsir?surah=1&ayah=1` | Tafsir entries for an ayah |
| GET | `/qr/tafsir?surah=1` | All tafsir entries for surah |
| POST | `/qr/tafsir` | Create tafsir entry (admin) |
| PATCH | `/qr/tafsir/:id` | Update entry |

**Tables**: `qr_tafsir_entries`, `qr_surahs`

---

### 2.9 `surah-analysis.ts`  →  `/qr/surah-analysis`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/surah-analysis/:surah` | Cached surah analysis |
| PUT | `/qr/surah-analysis/:surah` | Upsert analysis (pipeline) |

**Tables**: `qr_surah_analysis_cache`

---

### 2.10 `passage-analysis.ts`  →  `/qr/passage-analysis`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/passage-analysis?surah=18&passage=2` | Passage analysis |
| PUT | `/qr/passage-analysis/:id` | Upsert |

**Tables**: `qr_passage_analysis_cache`, `qr_surah_passages`

---

### 2.11 `surah-relations.ts`  →  `/qr/surah-relations`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/surah-relations?surah=1` | All relations involving a surah |
| POST | `/qr/surah-relations` | Create relation (admin) |
| DELETE | `/qr/surah-relations/:id` | Remove |

**Tables**: `qr_surah_relations`

---

### 2.12 `synonym-topics.ts`  →  `/qr/synonym-topics`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/synonym-topics` | All synonym topic groups |
| GET | `/qr/synonym-topics/:id/words` | Words in a topic group |
| POST | `/qr/synonym-topics` | Create topic (admin) |
| POST | `/qr/synonym-topics/:id/words` | Add word |

**Tables**: `qr_synonym_topics`, `qr_synonym_topic_words`

---

### 2.13 `token-morphology.ts`  →  `/qr/tokens`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/tokens?surah=1&ayah=1` | All token morphology for an ayah |
| GET | `/qr/tokens/:id` | Single token with irab and relations |
| GET | `/qr/tokens/:id/irab` | Token irab detail |
| GET | `/qr/tokens/:id/relations` | Dependency arcs for token |
| POST | `/qr/tokens` | Create token analysis (pipeline) |
| PUT | `/qr/tokens/:id` | Update token analysis |

**Tables**: `qr_token_morphology`, `qr_token_irab`, `qr_token_relations`

```typescript
// GET /qr/tokens?surah=1&ayah=1  (deep join)
SELECT tm.*,
       ti.irab_position, ti.irab_sign, ti.syntactic_function,
       ti.is_disputed
FROM qr_token_morphology tm
LEFT JOIN qr_token_irab ti ON ti.token_morphology_id = tm.id
WHERE tm.surah = ?1 AND tm.ayah = ?2
ORDER BY tm.token_index;
```

---

### 2.14 `prepositions.ts`  →  `/qr/prepositions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/prepositions?surah=1` | All preposition uses in surah |
| GET | `/qr/prepositions?preposition=في` | All uses of a specific preposition |
| GET | `/qr/prepositions?semantic_role=location` | By semantic role |
| POST | `/qr/prepositions` | Create record (pipeline) |

**Tables**: `qr_preposition_uses`, `qr_token_morphology`

---

### 2.15 `particles.ts`  →  `/qr/particles`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/particles?surah=1&ayah=1` | Particle uses in ayah |
| GET | `/qr/particles?category=conditional` | By category |
| POST | `/qr/particles` | Create (pipeline) |

**Tables**: `qr_particle_uses`, `qr_token_morphology`

---

### 2.16 `sentences.ts`  →  `/qr/sentences`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/sentences?surah=1&ayah=1` | Sentence units touching an ayah |
| GET | `/qr/sentences/:id` | Single sentence + clauses + phrases |
| GET | `/qr/sentences/:id/clauses` | Clause tree for sentence |
| POST | `/qr/sentences` | Create (pipeline / admin) |

**Tables**: `qr_sentence_units`, `qr_clause_units`, `qr_phrase_units`

---

### 2.17 `discourse.ts`  →  `/qr/discourse`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/discourse?surah=1` | Discourse units + shifts for surah |
| GET | `/qr/discourse/iltifat?surah=1` | All التفات events in surah |
| POST | `/qr/discourse/units` | Create discourse unit |
| POST | `/qr/discourse/shifts` | Create discourse shift |
| POST | `/qr/discourse/iltifat` | Create iltifat event |

**Tables**: `qr_surah_discourse_units`, `qr_surah_discourse_shifts`, `qr_surah_iltifat_events`

---

### 2.18 `prosody.ts`  →  `/qr/prosody`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/prosody/rhyme/:surah` | Rhyme profile for surah |
| GET | `/qr/prosody/fawasil/:surah` | All fawasil for surah |
| GET | `/qr/prosody/sonic-groups/:surah` | Sonic groups |
| PUT | `/qr/prosody/rhyme/:surah` | Upsert rhyme profile |
| POST | `/qr/prosody/fawasil` | Bulk upsert fawasil |

**Tables**: `qr_surah_rhyme_profiles`, `qr_surah_fawasil_patterns`, `qr_surah_sonic_groups`

---

### 2.19 `scholars.ts`  →  `/qr/scholars`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/scholars` | List scholars (paginated) |
| GET | `/qr/scholars/:id` | Scholar profile + works |
| GET | `/qr/scholars/:id/positions?surah=1` | Scholar's positions on a surah |
| POST | `/qr/scholars` | Create scholar profile |
| POST | `/qr/scholars/:id/works` | Add a work |
| PATCH | `/qr/scholars/:id` | Update profile |

**Tables**: `qr_scholar_profiles`, `qr_scholar_works`, `qr_scholarly_paradigms`, `qr_scholar_paradigm_links`

---

### 2.20 `scholar-positions.ts`  →  `/qr/scholar-positions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/scholar-positions?surah=1&ayah=1` | All positions on an ayah |
| GET | `/qr/scholar-positions?surah=1&type=meaning` | Filtered by type |
| GET | `/qr/scholar-positions/:id` | Single position + evidences |
| POST | `/qr/scholar-positions` | Create position (admin/pipeline) |
| PATCH | `/qr/scholar-positions/:id` | Update |

**Tables**: `qr_scholar_positions`, `qr_scholar_position_evidences`

---

### 2.21 `interpretive-differences.ts`  →  `/qr/interpretive-differences`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/interpretive-differences?surah=1` | Differences for surah |
| GET | `/qr/interpretive-differences/:id` | Single difference + linked positions |
| POST | `/qr/interpretive-differences` | Create |
| PATCH | `/qr/interpretive-differences/:id` | Update |

**Tables**: `qr_interpretive_differences`, `qr_difference_positions`, `qr_debate_clusters`

---

### 2.22 `surah-readings.ts`  →  `/qr/surah-readings`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/surah-readings/:surah` | All scholar readings for surah |
| GET | `/qr/surah-readings/:surah?scholar_id=<id>` | One scholar's reading |
| POST | `/qr/surah-readings` | Create reading |
| PATCH | `/qr/surah-readings/:id` | Update |

**Tables**: `qr_surah_scholar_readings`

---

### 2.23 `reception.ts`  →  `/qr/reception`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/reception/:surah` | Reception history across all eras |
| GET | `/qr/reception/trends` | Era-level interpretive trends |
| POST | `/qr/reception` | Create reception history entry |

**Tables**: `qr_surah_reception_histories`, `qr_era_interpretive_trends`

---

### 2.24 `search.ts`  →  `/qr/search`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/search?q=رحمة&type=ayah` | Full-text search across ayahs |
| GET | `/qr/search?q=كتب&type=token` | Token/morphology FTS |
| GET | `/qr/search?q=Ibn Kathir&type=scholar` | Scholar search |
| GET | `/qr/search?q=fate&type=position` | Scholar position FTS |

**Tables**: FTS virtual tables — `qr_token_morphology_fts`, `qr_scholar_profiles_fts`, `qr_scholar_positions_fts`, `qr_linguistic_notes_fts`

---

### 2.25 `containers.ts`  →  `/qr/containers`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/qr/containers?type=unit_set` | List containers |
| GET | `/qr/containers/:id/units` | Units inside container |
| POST | `/qr/containers` | Create container |
| POST | `/qr/containers/:id/units` | Add unit |
| PATCH | `/qr/containers/:id` | Update |

**Tables**: `qr_containers`, `qr_container_units`, `qr_container_unit_tasks`

---

## 3. Module LING — Arabic Linguistic (`functions/ling/`)

### 3.1 `roots.ts`  →  `/ling/roots`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/roots` | Paginated root list |
| GET | `/ling/roots/:id` | Root + related lemmas |
| GET | `/ling/roots/search?q=كتب` | Search by root letters |
| POST | `/ling/roots` | Create root |
| PATCH | `/ling/roots/:id` | Update |

**Tables**: `ar_ling_roots`

---

### 3.2 `lemmas.ts`  →  `/ling/lemmas`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/lemmas` | Paginated lemma list |
| GET | `/ling/lemmas/:id` | Lemma + morphology + lexicon entries |
| GET | `/ling/lemmas/by-root/:root_id` | Lemmas of a root |
| POST | `/ling/lemmas` | Create |
| PATCH | `/ling/lemmas/:id` | Update |

**Tables**: `ar_ling_lemmas`, `ar_ling_lemma_morphology`, `ar_ling_roots`

---

### 3.3 `morphology.ts`  →  `/ling/morphology`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/morphology?lemma_id=<id>` | Morphological forms of a lemma |
| GET | `/ling/morphology/:id` | Single morphology record |
| POST | `/ling/morphology` | Create form |
| PATCH | `/ling/morphology/:id` | Update |

**Tables**: `ar_ling_morphology`, `ar_ling_lemma_morphology`

---

### 3.4 `lexicon.ts`  →  `/ling/lexicon`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/lexicon` | Paginated lexicon entries |
| GET | `/ling/lexicon/:id` | Entry + evidence + morphology |
| GET | `/ling/lexicon/search?q=رحمة` | FTS search |
| POST | `/ling/lexicon` | Create entry |
| PATCH | `/ling/lexicon/:id` | Update |

**Tables**: `ar_ling_lexicon_entries`, `ar_ling_lexicon_evidence`, `ar_ling_lexicon_morphology`

```typescript
// GET /ling/lexicon/search?q=رحمة
SELECT le.*, GROUP_CONCAT(le2.evidence_text, ' | ') AS evidence_sample
FROM ar_ling_lexicon_entries le
JOIN ar_ling_lexicon_evidence_fts fts ON fts.ar_u_lexicon = le.id
LEFT JOIN ar_ling_lexicon_evidence le2 ON le2.ar_u_lexicon = le.id
WHERE ar_ling_lexicon_evidence_fts MATCH ?1
GROUP BY le.id
LIMIT 20;
```

---

### 3.5 `lexicon-evidence.ts`  →  `/ling/lexicon-evidence`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/lexicon-evidence?lexicon_id=<id>` | Evidence items for a lexicon entry |
| POST | `/ling/lexicon-evidence` | Add evidence (pipeline / admin) |
| DELETE | `/ling/lexicon-evidence/:id` | Remove |

**Tables**: `ar_ling_lexicon_evidence`

---

### 3.6 `expressions.ts`  →  `/ling/expressions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/expressions` | Paginated idioms / set expressions |
| GET | `/ling/expressions/:id` | Single expression |
| GET | `/ling/expressions/search?q=<term>` | FTS |
| POST | `/ling/expressions` | Create |
| PATCH | `/ling/expressions/:id` | Update |

**Tables**: `ar_ling_expressions`

---

### 3.7 `nahw.ts`  →  `/ling/nahw`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/nahw/concepts` | All nahw concepts |
| GET | `/ling/nahw/concepts/:id` | Concept + relations |
| GET | `/ling/nahw/concepts/:id/children` | Sub-concepts |
| GET | `/ling/nahw/relations?from_id=<id>` | Relations from a concept |
| POST | `/ling/nahw/concepts` | Create concept |
| POST | `/ling/nahw/relations` | Create relation |

**Tables**: `ar_ling_nahw_concepts`, `ar_ling_nahw_concepts_raw`, `ar_ling_nahw_relations`

---

### 3.8 `tokens.ts`  →  `/ling/tokens`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/tokens/search?q=<text>` | Token lookup by surface form |
| GET | `/ling/tokens/:id` | Token + lexicon links |
| POST | `/ling/tokens` | Create (pipeline) |

**Tables**: `ar_ling_tokens`, `ar_ling_token_lexicon_link`

---

### 3.9 `sentences.ts`  →  `/ling/sentences`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/sentences?source_code=<src>` | Sentences from a source |
| GET | `/ling/sentences/:id` | Single sentence |
| POST | `/ling/sentences` | Create (pipeline) |

**Tables**: `ar_ling_sentences`, `ar_ling_tokens`

---

### 3.10 `sources.ts`  →  `/ling/sources`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/sources` | All ingested linguistic sources |
| GET | `/ling/sources/:id` | Source + TOC |
| GET | `/ling/sources/:id/chunks` | Source chunks (paginated) |
| GET | `/ling/sources/:id/toc` | Table of contents |
| POST | `/ling/sources` | Register new source |
| PATCH | `/ling/sources/:id` | Update |

**Tables**: `ar_ling_sources`, `ar_ling_source_chunks`, `ar_ling_source_index`, `ar_ling_source_toc`

```typescript
// GET /ling/sources/:id/chunks?embedded=0&limit=50
SELECT chunk_id, source_code, heading_norm,
       LEFT(text_search, 200) AS text_preview,
       is_embedded, chunk_type
FROM ar_ling_source_chunks
WHERE ar_u_source = ?1
  AND (?2 IS NULL OR is_embedded = ?2)
ORDER BY chunk_id
LIMIT ?3 OFFSET ?4;
```

---

### 3.11 `source-chunks.ts`  →  `/ling/source-chunks`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ling/source-chunks/search?q=<text>` | FTS chunk search |
| GET | `/ling/source-chunks/:id` | Single chunk |
| PATCH | `/ling/source-chunks/:id` | Update embedding status |

**Tables**: `ar_ling_source_chunks`, `ar_ling_source_chunks_fts`

---

## 4. Module AR — Arabic Learning (`functions/ar/`)

### 4.1 `vocabulary.ts`  →  `/ar/vocabulary`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/vocabulary` | All vocabulary (paginated) |
| GET | `/ar/vocabulary/:id` | Single word |
| GET | `/ar/vocabulary/search?q=<term>` | Search |
| POST | `/ar/vocabulary` | Create (admin) |
| PATCH | `/ar/vocabulary/:id` | Update |
| DELETE | `/ar/vocabulary/:id` | Delete |

**Tables**: `ar_vocabulary`, `ar_ling_lemmas`, `ar_ling_roots`

---

### 4.2 `grammar.ts`  →  `/ar/grammar`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/grammar` | Grammar rules (paginated) |
| GET | `/ar/grammar/:id` | Single rule + examples |
| POST | `/ar/grammar` | Create |
| PATCH | `/ar/grammar/:id` | Update |

**Tables**: `ar_grammar_units`, `ar_grammar_unit_items`, `ar_ling_nahw_concepts`

---

### 4.3 `lessons.ts`  →  `/ar/lessons`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/lessons` | All lessons |
| GET | `/ar/lessons/:id` | Lesson + items + exercises |
| POST | `/ar/lessons` | Create lesson |
| PATCH | `/ar/lessons/:id` | Update |

**Tables**: `ar_lessons`, `ar_lesson_items`, `ar_lesson_exercises`

---

### 4.4 `srs.ts`  →  `/ar/srs`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/srs/due` | Cards due for review |
| GET | `/ar/srs/stats` | User SRS statistics |
| POST | `/ar/srs/review` | Submit a review (grade 0–5) |
| POST | `/ar/srs/schedule` | Schedule a batch of cards |

**Tables**: `ar_srs`, `ar_reviews`

```typescript
// GET /ar/srs/due  — SM-2 algorithm: due = next_review <= now
SELECT s.*, v.word_ar, v.meaning_en
FROM ar_srs s
JOIN ar_vocabulary v ON v.id = s.item_id
WHERE s.user_id = ?1
  AND s.next_review <= datetime('now')
  AND s.item_type = 'vocabulary'
ORDER BY s.next_review
LIMIT 20;
```

---

### 4.5 `occurrences.ts`  →  `/ar/occurrences`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/occurrences?vocab_id=<id>` | Quran occurrences of a vocab word |
| GET | `/ar/occurrences?lesson_id=<id>` | Occurrences covered by a lesson |

**Tables**: `ar_occ_vocab`, `ar_occ_grammar`, `qr_word_occurrences`

---

### 4.6 `balagha.ts`  →  `/ar/balagha`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/balagha` | All balagha concepts (paginated) |
| GET | `/ar/balagha/:id` | Concept + examples |
| GET | `/ar/balagha/search?q=<term>` | FTS |
| POST | `/ar/balagha` | Create |
| PATCH | `/ar/balagha/:id` | Update |

**Tables**: `ar_balagha`, `ar_balagha_fts`

---

### 4.7 `domains.ts`  →  `/ar/domains`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/domains` | Semantic domains |
| GET | `/ar/domains/:id/phrases` | Domain phrases |
| GET | `/ar/domains/phrases/search?q=<term>` | Phrase FTS |
| POST | `/ar/domains` | Create domain |
| POST | `/ar/domains/:id/phrases` | Add phrase |

**Tables**: `ar_domains`, `ar_domain_phrases`, `ar_domain_phrase_fts`

---

### 4.8 `notes.ts`  →  `/ar/notes`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/ar/notes?item_id=<id>` | Notes on an item |
| POST | `/ar/notes` | Create note |
| PATCH | `/ar/notes/:id` | Update |
| DELETE | `/ar/notes/:id` | Delete |

**Tables**: `ar_notes`

---

## 5. Module WV — Worldview (`functions/wv/`)

### 5.1 `sources.ts`  →  `/wv/sources`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/sources` | All sources (paginated) |
| GET | `/wv/sources/:id` | Source + units |
| GET | `/wv/sources/:id/units` | Source units / chapters |
| GET | `/wv/sources/search?q=<term>` | FTS |
| POST | `/wv/sources` | Create source |
| PATCH | `/wv/sources/:id` | Update |

**Tables**: `wv_sources`, `wv_source_units`

---

### 5.2 `people.ts`  →  `/wv/people`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/people` | People list (respects visibility) |
| GET | `/wv/people/:id` | Person profile |
| GET | `/wv/people/search?q=<name>` | Name search |
| POST | `/wv/people` | Create person |
| PATCH | `/wv/people/:id` | Update |

**Tables**: `wv_people`, `wv_worldviews`

```typescript
// CRITICAL: visibility filter
SELECT * FROM wv_people
WHERE (visibility = 'workspace' OR owner_id = ?USER_ID)
  AND (?q IS NULL OR name_en LIKE '%' || ?q || '%' OR name_ar LIKE '%' || ?q || '%')
ORDER BY name_en;
```

---

### 5.3 `worldviews.ts`  →  `/wv/worldviews`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/worldviews` | All worldviews |
| GET | `/wv/worldviews/:id` | Worldview + topics |
| POST | `/wv/worldviews` | Create |
| PATCH | `/wv/worldviews/:id` | Update |

**Tables**: `wv_worldviews`, `wv_topics`

---

### 5.4 `topics.ts`  →  `/wv/topics`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/topics?worldview_id=<id>` | Topics by worldview |
| GET | `/wv/topics/:id` | Topic + nodes |
| GET | `/wv/topics/search?q=<term>` | FTS |
| POST | `/wv/topics` | Create |
| PATCH | `/wv/topics/:id` | Update |

**Tables**: `wv_topics`, `wv_topic_fts`

---

### 5.5 `nodes.ts`  →  `/wv/nodes`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/nodes?topic_id=<id>` | Nodes in a topic |
| GET | `/wv/nodes/:id` | Node + edges |
| GET | `/wv/nodes/search?q=<term>` | Full-text search |
| POST | `/wv/nodes` | Create (pipeline / admin) |
| PATCH | `/wv/nodes/:id` | Update |

**Tables**: `wv_nodes`, `wv_node_edges`

---

### 5.6 `highlights.ts`  →  `/wv/highlights`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/highlights?source_id=<id>` | Highlights on a source |
| GET | `/wv/highlights?topic_id=<id>` | Highlights tagged to a topic |
| POST | `/wv/highlights` | Create highlight |
| PATCH | `/wv/highlights/:id` | Update |
| DELETE | `/wv/highlights/:id` | Delete |

**Tables**: `wv_highlights`

---

### 5.7 `notes.ts`  →  `/wv/notes`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/notes?target_id=<id>` | Notes on any target |
| POST | `/wv/notes` | Create |
| PATCH | `/wv/notes/:id` | Update |
| DELETE | `/wv/notes/:id` | Delete |

**Tables**: `wv_notes`

---

### 5.8 `distillations.ts`  →  `/wv/distillations`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/distillations?topic_id=<id>` | Distillations for topic |
| GET | `/wv/distillations/:id` | Single distillation |
| POST | `/wv/distillations` | Create |
| PATCH | `/wv/distillations/:id` | Update |

**Tables**: `wv_distillations`, `wv_distill_batches`

---

### 5.9 `brainstorm.ts`  →  `/wv/brainstorm`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/brainstorm` | All brainstorm sessions |
| GET | `/wv/brainstorm/:id` | Session + content |
| GET | `/wv/brainstorm/search?q=<term>` | FTS |
| POST | `/wv/brainstorm` | Create session |
| PATCH | `/wv/brainstorm/:id` | Update |

**Tables**: `wv_brainstorm_sessions`, `wv_brainstorm_fts`

---

### 5.10 `comparisons.ts`  →  `/wv/comparisons`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/comparisons` | All comparisons |
| GET | `/wv/comparisons/:id` | Comparison + cells |
| POST | `/wv/comparisons` | Create |
| POST | `/wv/comparisons/:id/cells` | Add comparison cell |
| PATCH | `/wv/comparisons/:id` | Update |
| PATCH | `/wv/comparisons/cells/:id` | Update cell |

**Tables**: `wv_comparisons`, `wv_comparison_cells`

---

### 5.11 `quran-links.ts`  →  `/wv/quran-links`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/quran-links?topic_id=<id>` | Quran links for a topic |
| GET | `/wv/quran-links?surah=1&ayah=1` | Topics linked to an ayah |
| POST | `/wv/quran-links` | Create link |
| DELETE | `/wv/quran-links/:id` | Remove |

**Tables**: `wv_quran_links`

---

### 5.12 `evidence-links.ts`  →  `/wv/evidence-links`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/evidence-links?node_id=<id>` | Evidence for a node |
| POST | `/wv/evidence-links` | Create link (pipeline) |
| DELETE | `/wv/evidence-links/:id` | Remove |

**Tables**: `wv_evidence_links`

---

### 5.13 `insight-suggestions.ts`  →  `/wv/insight-suggestions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wv/insight-suggestions?status=suggested` | Pipeline suggestions queue |
| GET | `/wv/insight-suggestions?batch_id=<id>` | By batch |
| GET | `/wv/insight-suggestions/:id` | Single suggestion |
| POST | `/wv/insight-suggestions` | Create (pipeline) |
| PATCH | `/wv/insight-suggestions/:id` | Update status (approve/reject) |

**Tables**: `wv_insight_suggestions`, `wv_distill_batches`, `wv_insight_decisions`

```typescript
// PATCH /wv/insight-suggestions/:id  — approve
// This triggers writing payload_json to target tables
const suggestion = await db.queryOne('SELECT * FROM wv_insight_suggestions WHERE id = ?', [id]);
if (body.status === 'approved') {
  await applyInsightPayload(env.DB, suggestion);  // writes wv_nodes, wv_node_edges, etc.
}
await db.execute(
  'UPDATE wv_insight_suggestions SET status = ?, reviewed_at = datetime("now") WHERE id = ?',
  [body.status, id]
);
```

---

## 6. Module CM — Content Management (`functions/cm/`)

### 6.1 `documents.ts`  →  `/cm/documents`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/cm/documents` | All documents (paginated) |
| GET | `/cm/documents/:id` | Document + blocks |
| GET | `/cm/documents/:id/blocks` | Block list |
| GET | `/cm/documents/:id/versions` | Version history |
| POST | `/cm/documents` | Create |
| PATCH | `/cm/documents/:id` | Update metadata |
| DELETE | `/cm/documents/:id` | Soft-delete |

**Tables**: `cm_documents`, `cm_document_blocks`, `cm_document_versions`

---

### 6.2 `notes.ts`  →  `/cm/notes`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/cm/notes?target_type=ayah&target_id=<ref>` | Notes on a target |
| POST | `/cm/notes` | Create |
| PATCH | `/cm/notes/:id` | Update |
| DELETE | `/cm/notes/:id` | Delete |

**Tables**: `cm_notes`, `cm_note_targets`

---

### 6.3 `media.ts`  →  `/cm/media`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/cm/media` | Media asset list |
| GET | `/cm/media/:id` | Single asset |
| POST | `/cm/media` | Register asset (after R2 upload) |
| DELETE | `/cm/media/:id` | Delete metadata |

**Tables**: `cm_media_assets`

---

### 6.4 `publications.ts`  →  `/cm/publications`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/cm/publications` | All publications |
| GET | `/cm/publications/:id` | Publication + authors |
| POST | `/cm/publications` | Create |
| PATCH | `/cm/publications/:id` | Update |

**Tables**: `cm_publications`

---

## 7. Module CORE — Identity & Auth (`functions/core/`)

### 7.1 `auth.ts`  →  `/core/auth`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/core/auth/login` | Password/magic-link login → JWT |
| POST | `/core/auth/refresh` | Refresh JWT |
| POST | `/core/auth/logout` | Invalidate session |

**Tables**: `core_users`

---

### 7.2 `users.ts`  →  `/core/users`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/core/users/me` | Current user profile |
| PATCH | `/core/users/me` | Update profile |
| GET | `/core/users/:id` | User profile (admin) |

**Tables**: `core_users`

---

### 7.3 `workspaces.ts`  →  `/core/workspaces`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/core/workspaces` | User's workspaces |
| GET | `/core/workspaces/:id` | Workspace details + members |
| POST | `/core/workspaces` | Create workspace |
| PATCH | `/core/workspaces/:id` | Update |

**Tables**: `core_workspaces`, `core_workspace_policies`

---

### 7.4 `policies.ts`  →  `/core/policies`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/core/policies/workspace/:id` | Workspace-level policies |
| GET | `/core/policies/resource/:type/:id` | Resource-level policy |
| POST | `/core/policies/resource` | Set resource policy |
| DELETE | `/core/policies/resource/:id` | Remove |

**Tables**: `core_resource_policies`, `core_resource_grants`

---

### 7.5 `external-refs.ts`  →  `/core/external-refs`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/core/external-refs?module=QR&id=<id>` | External IDs for a resource |
| POST | `/core/external-refs` | Register external ref |

**Tables**: `core_external_refs`

---

## 8. Module PL — Planner (`functions/pl/`)

### 8.1 `plans.ts`  →  `/pl/plans`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pl/plans` | All plans for current user |
| GET | `/pl/plans/:id` | Plan + items |
| POST | `/pl/plans` | Create plan |
| PATCH | `/pl/plans/:id` | Update |
| DELETE | `/pl/plans/:id` | Delete |

**Tables**: `pl_plans`, `pl_plan_items`

---

### 8.2 `sessions.ts`  →  `/pl/sessions`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pl/sessions?plan_id=<id>` | Sessions for a plan |
| GET | `/pl/sessions?date=2026-04-19` | Sessions on a date |
| GET | `/pl/sessions/:id` | Session details |
| POST | `/pl/sessions` | Create session |
| PATCH | `/pl/sessions/:id` | Update (log duration, notes) |

**Tables**: `pl_sessions`

---

### 8.3 `goals.ts`  →  `/pl/goals`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pl/goals` | Reading goals |
| GET | `/pl/goals/progress` | Progress summary |
| POST | `/pl/goals` | Create goal |
| PATCH | `/pl/goals/:id` | Update |

**Tables**: `pl_goals`, `pl_goal_progress`

---

### 8.4 `kanban.ts`  →  `/pl/kanban`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pl/kanban?plan_id=<id>` | Kanban board state |
| PATCH | `/pl/kanban/:item_id/status` | Move card to column |

**Tables**: `pl_plan_items` (status field)

---

### 8.5 `calendar.ts`  →  `/pl/calendar`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pl/calendar?month=2026-04` | Calendar view (sessions + goals) |
| GET | `/pl/calendar?week=2026-04-14` | Weekly view |

**Tables**: `pl_sessions`, `pl_plan_items`

```typescript
// GET /pl/calendar?month=2026-04
SELECT s.id, s.plan_id, s.date, s.duration_min,
       s.title, s.status,
       p.title AS plan_title, p.source_type
FROM pl_sessions s
JOIN pl_plans p ON p.id = s.plan_id
WHERE s.user_id = ?1
  AND strftime('%Y-%m', s.date) = ?2
ORDER BY s.date;
```

---

## 9. Workspace Module (`functions/workspace/`)

### 9.1 `workspaces.ts`  →  `/workspace/`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspace/:id` | Workspace dashboard data |
| GET | `/workspace/:id/members` | Member list |
| POST | `/workspace/:id/members` | Invite member |
| DELETE | `/workspace/:id/members/:user_id` | Remove member |

**Tables**: `wv_workspaces`, `wv_workspace_members` (or `core_workspaces`)

---

### 9.2 `podcasts.ts`  →  `/workspace/podcasts`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspace/:id/podcasts` | Podcasts in workspace |
| GET | `/workspace/:id/podcasts/:pod_id` | Podcast + participants + talking points |
| POST | `/workspace/:id/podcasts` | Create |
| PATCH | `/workspace/:id/podcasts/:pod_id` | Update |

**Tables**: `wv_podcasts`, `wv_podcast_participants`, `wv_talking_points`

---

## 10. Implementation Patterns

### 10.1 Shared DB Helper (`_shared/db.ts`)

```typescript
export async function query<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results as T[];
}

export async function queryOne<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first();
  return (result as T) ?? null;
}

export async function paginate<T>(db: D1Database, sql: string, params: unknown[], page: number, perPage: number): Promise<{ data: T[], total: number, has_more: boolean }> {
  const offset = (page - 1) * perPage;
  const countSql = `SELECT COUNT(*) AS total FROM (${sql})`;
  const countResult = await db.prepare(countSql).bind(...params).first<{ total: number }>();
  const total = countResult?.total ?? 0;
  const data = await query<T>(db, `${sql} LIMIT ${perPage} OFFSET ${offset}`, params);
  return { data, total, has_more: offset + perPage < total };
}
```

### 10.2 Response Helpers (`_shared/response.ts`)

```typescript
export const ok = <T>(data: T, status = 200) =>
  Response.json({ ok: true, data }, { status });

export const paginated = <T>(data: T[], meta: { total: number, page: number, per_page: number }) =>
  Response.json({ ok: true, data, meta: { ...meta, has_more: meta.page * meta.per_page < meta.total } });

export const err = (code: string, message: string, status = 400) =>
  Response.json({ ok: false, error: { code, message } }, { status });
```

### 10.3 ULID Generation (`_shared/ulid.ts`)

```typescript
// Using the ulid npm package
import { ulid } from 'ulid';
export const newId = () => ulid();
```

### 10.4 Middleware (`_middleware.ts`)

```typescript
export const onRequest: PagesFunction<Env> = async (context) => {
  // CORS headers
  const response = await context.next();
  response.headers.set('Access-Control-Allow-Origin', context.env.ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Preflight
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: response.headers });

  // Auth check for write routes
  const url = new URL(context.request.url);
  const writeMethod = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(context.request.method);
  if (writeMethod) {
    const token = context.request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token || !validateToken(token, context.env.JWT_SECRET)) {
      return Response.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } }, { status: 401 });
    }
  }

  return response;
};
```

---

## 11. Build Priority Order

```
Priority 1 — Core reading experience (already exists, verify)
  [✓] functions/ar/quran/ayahs.ts   (exists)
  [ ] functions/qr/surahs.ts        (rename target)
  [ ] functions/qr/ayahs.ts         (refactor from ar/quran/ayahs.ts)
  [ ] functions/qr/passages.ts

Priority 2 — Linguistic search (powers Quran reader overlays)
  [ ] functions/ling/roots.ts
  [ ] functions/ling/lemmas.ts
  [ ] functions/ling/lexicon.ts
  [ ] functions/qr/word-occurrences.ts
  [ ] functions/qr/token-morphology.ts

Priority 3 — Worldview Hub (content management + research)
  [ ] functions/wv/sources.ts
  [ ] functions/wv/topics.ts
  [ ] functions/wv/nodes.ts
  [ ] functions/wv/highlights.ts
  [ ] functions/wv/brainstorm.ts
  [ ] functions/wv/comparisons.ts

Priority 4 — Pipeline & Review Queue
  [ ] functions/ling/source-chunks.ts
  [ ] functions/wv/insight-suggestions.ts
  [ ] functions/wv/evidence-links.ts

Priority 5 — Deep analysis (scholar, discourse, prosody)
  [ ] functions/qr/scholars.ts
  [ ] functions/qr/scholar-positions.ts
  [ ] functions/qr/prepositions.ts
  [ ] functions/qr/particles.ts
  [ ] functions/qr/sentences.ts
  [ ] functions/qr/discourse.ts
  [ ] functions/qr/prosody.ts

Priority 6 — Planner & Workspace
  [ ] functions/pl/plans.ts
  [ ] functions/pl/sessions.ts
  [ ] functions/pl/calendar.ts
  [ ] functions/workspace/workspaces.ts
  [ ] functions/workspace/podcasts.ts

Priority 7 — Core Identity & Auth
  [ ] functions/core/auth.ts
  [ ] functions/core/users.ts
  [ ] functions/core/workspaces.ts
  [ ] functions/core/policies.ts

Priority 8 — Arabic Learning
  [ ] functions/ar/vocabulary.ts
  [ ] functions/ar/grammar.ts
  [ ] functions/ar/lessons.ts
  [ ] functions/ar/srs.ts
  [ ] functions/ar/balagha.ts
```

---

## 12. Table → Worker Cross-Reference

| Table | Worker File |
|-------|------------|
| `qr_surahs` | `qr/surahs.ts` |
| `qr_ayah` | `qr/ayahs.ts` |
| `qr_surah_passages` | `qr/passages.ts` |
| `qr_word_occurrences` | `qr/word-occurrences.ts` |
| `qr_lemmas`, `qr_lemma_occurrences` | `qr/lemmas.ts` |
| `qr_translations`, `qr_translation_sources` | `qr/translations.ts` |
| `qr_motif_index`, `qr_motif_occurrences` | `qr/motifs.ts` |
| `qr_tafsir_entries` | `qr/tafsir.ts` |
| `qr_surah_analysis_cache` | `qr/surah-analysis.ts` |
| `qr_passage_analysis_cache` | `qr/passage-analysis.ts` |
| `qr_surah_relations` | `qr/surah-relations.ts` |
| `qr_synonym_topics`, `qr_synonym_topic_words` | `qr/synonym-topics.ts` |
| `qr_containers`, `qr_container_units` | `qr/containers.ts` |
| `qr_token_morphology`, `qr_token_irab` | `qr/token-morphology.ts` |
| `qr_token_relations` | `qr/token-morphology.ts` |
| `qr_preposition_uses` | `qr/prepositions.ts` |
| `qr_particle_uses` | `qr/particles.ts` |
| `qr_sentence_units`, `qr_clause_units`, `qr_phrase_units` | `qr/sentences.ts` |
| `qr_surah_discourse_units`, `qr_surah_discourse_shifts` | `qr/discourse.ts` |
| `qr_surah_iltifat_events` | `qr/discourse.ts` |
| `qr_surah_rhyme_profiles`, `qr_surah_fawasil_patterns` | `qr/prosody.ts` |
| `qr_surah_sonic_groups` | `qr/prosody.ts` |
| `qr_scholar_profiles`, `qr_scholar_works` | `qr/scholars.ts` |
| `qr_scholarly_paradigms` | `qr/scholars.ts` |
| `qr_scholar_positions`, `qr_scholar_position_evidences` | `qr/scholar-positions.ts` |
| `qr_interpretive_differences`, `qr_debate_clusters` | `qr/interpretive-differences.ts` |
| `qr_surah_scholar_readings` | `qr/surah-readings.ts` |
| `qr_surah_reception_histories`, `qr_era_interpretive_trends` | `qr/reception.ts` |
| `ar_ling_roots` | `ling/roots.ts` |
| `ar_ling_lemmas`, `ar_ling_lemma_morphology` | `ling/lemmas.ts` |
| `ar_ling_morphology` | `ling/morphology.ts` |
| `ar_ling_lexicon_entries`, `ar_ling_lexicon_evidence` | `ling/lexicon.ts` |
| `ar_ling_expressions` | `ling/expressions.ts` |
| `ar_ling_nahw_concepts`, `ar_ling_nahw_relations` | `ling/nahw.ts` |
| `ar_ling_tokens`, `ar_ling_token_lexicon_link` | `ling/tokens.ts` |
| `ar_ling_sentences` | `ling/sentences.ts` |
| `ar_ling_sources`, `ar_ling_source_toc` | `ling/sources.ts` |
| `ar_ling_source_chunks`, `ar_ling_source_index` | `ling/source-chunks.ts` |
| `wv_sources`, `wv_source_units` | `wv/sources.ts` |
| `wv_people` | `wv/people.ts` |
| `wv_worldviews` | `wv/worldviews.ts` |
| `wv_topics` | `wv/topics.ts` |
| `wv_nodes`, `wv_node_edges` | `wv/nodes.ts` |
| `wv_highlights` | `wv/highlights.ts` |
| `wv_notes` | `wv/notes.ts` |
| `wv_distillations` | `wv/distillations.ts` |
| `wv_brainstorm_sessions` | `wv/brainstorm.ts` |
| `wv_comparisons`, `wv_comparison_cells` | `wv/comparisons.ts` |
| `wv_quran_links` | `wv/quran-links.ts` |
| `wv_evidence_links` | `wv/evidence-links.ts` |
| `wv_insight_suggestions` | `wv/insight-suggestions.ts` |
| `ar_srs`, `ar_reviews` | `ar/srs.ts` |
| `ar_vocabulary` | `ar/vocabulary.ts` |
| `ar_lessons` | `ar/lessons.ts` |
| `ar_balagha` | `ar/balagha.ts` |
| `ar_domains`, `ar_domain_phrases` | `ar/domains.ts` |
| `pl_plans`, `pl_plan_items` | `pl/plans.ts` |
| `pl_sessions` | `pl/sessions.ts` |
