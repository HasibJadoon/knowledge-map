-- backfill-citations.sql
-- Populate ar_ling_citations (migration 0023) — Roam-style block-level backlinks
-- from every root layer to its source resource. Idempotent: INSERT OR IGNORE +
-- targeted UPDATEs. Ran against km_arabic_linguistic (all roots with layer data:
-- بين نزل نذر ليل برك كتب → 527 citations, ~81% resolving to a specific block).
--
-- Block-level targets ("all sources have display blocks"):
--   ALB:<id>  ar_ling_lexicon_blocks   (ingested dictionaries)
--   ALG:<id>  ar_ling_gram_chunks      (grammar / ṣarf works: Sībawayh, Rāḍī, Ibn Jinnī…)
-- Coarser fallbacks kept only where no block exists:
--   ALE:<id>  ar_ling_lexicon_root_entries   (entry with no blocks, e.g. Sinai)
--   SRC:<slug> ar_ling_sources               (tafsīr/iʿrāb — blocks live in QR, cross-domain)
--   ALGEN:<slug>                             (internal synthesis: memlet, near-synonym)
--
-- Arabic match uses a diacritic/tatweel-stripped prefix/containment compare
-- (10 REPLACEs). confidence encodes precision: 0.9 exact-prefix block,
-- 0.82 containment block, 0.8 gram chunk, 0.55–0.65 coarse entry anchor.

-- ── 1. root_stage claims → three-tier target (block > entry > source/synthesis)
INSERT OR IGNORE INTO ar_ling_citations
  (id, root_norm, from_layer, from_id, to_ref, to_kind, relation, source_slug, page_no, quote_ar, confidence, origin)
SELECT
  'ALC:'||st.id, st.root_norm, 'root_stage', st.id,
  CASE
    WHEN mb.block_id IS NOT NULL THEN 'ALB:'||mb.block_id
    WHEN re.id IS NOT NULL       THEN 'ALE:'||re.id
    WHEN st.source_slug LIKE 'kmaps%'
      OR st.source_slug IN ('near_synonym_sets','qac_morphology','sarf-orthography','mir_verbal_idioms','lisan')
                                 THEN 'ALGEN:'||st.source_slug
    ELSE 'SRC:'||st.source_slug
  END,
  CASE
    WHEN mb.block_id IS NOT NULL THEN 'lexicon_block'
    WHEN re.id IS NOT NULL       THEN 'lexicon_entry'
    WHEN st.source_slug LIKE 'kmaps%'
      OR st.source_slug IN ('near_synonym_sets','qac_morphology','sarf-orthography','mir_verbal_idioms','lisan')
                                 THEN 'synthesis'
    ELSE 'source'
  END,
  CASE WHEN st.source_slug LIKE 'kmaps%'
        OR st.source_slug IN ('near_synonym_sets','qac_morphology','sarf-orthography','mir_verbal_idioms','lisan')
       THEN 'derived' ELSE 'grounds' END,
  st.source_slug, st.page_no, st.quote_ar,
  CASE WHEN mb.block_id IS NOT NULL THEN 0.9 WHEN re.id IS NOT NULL THEN 0.65 ELSE 0.5 END,
  'backfill'
FROM ar_ling_root_stage st
LEFT JOIN ar_ling_lexicon_root_entries re
  ON re.root_norm = st.root_norm AND re.source_slug = st.source_slug
LEFT JOIN (
  SELECT st2.id AS stage_id,
    (SELECT b.id FROM ar_ling_lexicon_blocks b
      WHERE b.root_norm = st2.root_norm AND b.source_slug = st2.source_slug
        AND b.text_plain IS NOT NULL AND b.block_type <> 'root_header'
        AND length(st2.quote_ar) >= 8
        AND replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(b.text_plain,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
            LIKE replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(substr(st2.quote_ar,1,18),'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')||'%'
      ORDER BY b.block_seq LIMIT 1) AS block_id
  FROM ar_ling_root_stage st2
) mb ON mb.stage_id = st.id;

-- ── 2. synthesis layers inherit their grounding resource via the SYN:STG chain
INSERT OR IGNORE INTO ar_ling_citations
  (id, root_norm, from_layer, from_id, to_ref, to_kind, relation, source_slug, page_no, quote_ar, confidence, origin)
SELECT
  'ALC:'||L.fl||':'||L.fid||'~'||c.from_id,
  L.root_norm, L.fl, L.fid, c.to_ref, c.to_kind, 'grounds', c.source_slug, c.page_no, c.quote_ar,
  CASE WHEN c.confidence IS NOT NULL THEN c.confidence*0.9 ELSE 0.5 END, 'derived'
FROM (
  SELECT 'root_beat' AS fl, id AS fid, root_norm, source_ref FROM ar_ling_root_beat WHERE source_ref IS NOT NULL
  UNION ALL SELECT 'root_story', id, root_norm, source_ref FROM ar_ling_root_story WHERE source_ref IS NOT NULL
  UNION ALL SELECT 'root_dev_stage', id, root_norm, source_ref FROM ar_ling_root_development_stages WHERE source_ref IS NOT NULL
) L
JOIN ar_ling_citations c
  ON c.from_layer='root_stage' AND c.root_norm = L.root_norm
 AND (c.from_id = L.source_ref OR c.from_id LIKE L.source_ref||':%');

-- ── 3. senses / dna → each provenance-slug's dictionary entry
INSERT OR IGNORE INTO ar_ling_citations
  (id, root_norm, from_layer, from_id, to_ref, to_kind, relation, source_slug, page_no, quote_ar, confidence, origin)
SELECT
  'ALC:'||L.fl||':'||L.fid||'~'||re.id,
  L.root_norm, L.fl, L.fid, 'ALE:'||re.id, 'lexicon_entry', 'grounds', re.source_slug, re.page_start, NULL, 0.55, 'derived'
FROM (
  SELECT 'root_sense' AS fl, id AS fid, root_norm, provenance_json AS pj FROM ar_ling_root_senses WHERE provenance_json NOT IN ('[]','')
  UNION ALL SELECT 'root_dna', root_norm||':dna', root_norm, provenance_json FROM ar_ling_root_dna WHERE provenance_json NOT IN ('[]','')
) L
JOIN json_each(L.pj) j ON 1=1
JOIN ar_ling_lexicon_root_entries re ON re.root_norm = L.root_norm AND re.source_slug = j.value;

-- ── 4. BLOCK-LEVEL upgrade A: lexicon entry citations whose quote is CONTAINED
--        in a specific block → that block (leaf, shortest containing).
UPDATE ar_ling_citations AS c
SET to_ref = 'ALB:'||(
      SELECT b.id FROM ar_ling_lexicon_blocks b
      WHERE b.root_norm=c.root_norm AND b.source_slug=c.source_slug
        AND b.text_plain IS NOT NULL AND b.block_type<>'root_header'
        AND replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(b.text_plain,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
            LIKE '%'||replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(substr(c.quote_ar,1,22),'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')||'%'
      ORDER BY length(b.text_plain) ASC LIMIT 1),
    to_kind='lexicon_block', confidence=0.82
WHERE c.to_kind='lexicon_entry' AND c.quote_ar IS NOT NULL AND length(c.quote_ar)>=10
  AND EXISTS (SELECT 1 FROM ar_ling_lexicon_blocks b
      WHERE b.root_norm=c.root_norm AND b.source_slug=c.source_slug
        AND b.text_plain IS NOT NULL AND b.block_type<>'root_header'
        AND replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(b.text_plain,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
            LIKE '%'||replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(substr(c.quote_ar,1,22),'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')||'%');

-- ── 5. BLOCK-LEVEL upgrade B: grammar-source citations → specific gram chunk.
UPDATE ar_ling_citations AS c
SET to_ref = 'ALG:'||(
      SELECT g.id FROM ar_ling_gram_chunks g
      WHERE g.source_slug=c.source_slug AND g.text_ar IS NOT NULL
        AND replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(g.text_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
            LIKE '%'||replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(substr(c.quote_ar,1,22),'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')||'%'
      ORDER BY length(g.text_ar) ASC LIMIT 1),
    to_kind='gram_chunk', confidence=0.8
WHERE c.to_kind='source' AND c.quote_ar IS NOT NULL AND length(c.quote_ar)>=10
  AND EXISTS (SELECT 1 FROM ar_ling_gram_chunks g
      WHERE g.source_slug=c.source_slug AND g.text_ar IS NOT NULL
        AND replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(g.text_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
            LIKE '%'||replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(substr(c.quote_ar,1,22),'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')||'%');

-- ── 6. re-sync synthesis (beat/story/dev_stage) citations to their parent
--        stage citation's now-upgraded block ref.
UPDATE ar_ling_citations AS c
SET to_ref = (SELECT p.to_ref FROM ar_ling_citations p WHERE p.from_layer='root_stage' AND p.from_id = substr(c.id, instr(c.id,'~')+1)),
    to_kind = (SELECT p.to_kind FROM ar_ling_citations p WHERE p.from_layer='root_stage' AND p.from_id = substr(c.id, instr(c.id,'~')+1))
WHERE c.from_layer IN ('root_beat','root_story','root_dev_stage') AND c.id LIKE '%~%'
  AND EXISTS (SELECT 1 FROM ar_ling_citations p WHERE p.from_layer='root_stage' AND p.from_id = substr(c.id, instr(c.id,'~')+1));

-- ── 7. BLOCK-LEVEL upgrade C: any remaining entry-level citation → that entry's
--        representative block (main definition, else first block). "All sources
--        have display blocks" — never land on an abstract entry.
UPDATE ar_ling_citations AS c
SET to_ref = 'ALB:'||(
      SELECT b.id FROM ar_ling_lexicon_blocks b
      WHERE b.root_norm=c.root_norm AND b.source_slug=c.source_slug AND b.text_plain IS NOT NULL
      ORDER BY (b.block_type='definition') DESC, b.block_seq ASC LIMIT 1),
    to_kind='lexicon_block'
WHERE c.to_kind='lexicon_entry'
  AND EXISTS (SELECT 1 FROM ar_ling_lexicon_blocks b
              WHERE b.root_norm=c.root_norm AND b.source_slug=c.source_slug AND b.text_plain IS NOT NULL);
