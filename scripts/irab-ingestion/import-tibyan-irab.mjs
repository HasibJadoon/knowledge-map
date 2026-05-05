#!/usr/bin/env node
// Ingests al-Tibyan fi I'rab al-Quran (al-Ukbari, d.616 AH) from OpenITI/Shamela text.
// Source: OpenITI RELEASE/data/0616MuhibbDinCukbari/0616MuhibbDinCukbari.TibyanFiIcrabQuran/
//
// Format: ### | قال تعالى: (verse (N)) marks each ayah section.
//         ### | SurahName marks surah transitions.
//         # text and ~~continuation are commentary lines.
//         # PageVXXPYYY are page markers to strip.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  makeId, makeRunId, normalizeWhitespace, normalizeBareArabic, normalizeMatchKey,
  extractTibyanIrabEntries, roleFromText, caseFromText, mahalFromText, sha256,
} from './parser.mjs';

const QR_DB  = 'km_quran';
const AL_DB  = 'km_arabic_linguistic';
const QR_CWD = new URL('../../workers/quran/', import.meta.url);
const AL_CWD = new URL('../../workers/ar-linguistics/', import.meta.url);

const SOURCE_SLUG     = 'tibyan_ukbari_irab';
const SOURCE_ID       = 'QR:WORK:TIBYAN:UKBARI:IRAB';
const SOURCE_TITLE_AR = 'التبيان في إعراب القرآن';
const SOURCE_TITLE_EN = "al-Tibyan fi I'rab al-Quran (al-Ukbari)";
const PARSER_VERSION  = 'openiti-shamela-tibyan-v1';
const DEFAULT_INPUT   = resolve('km_arabic_linguistic/ingestion/Irrab/tibyan-openiti-shamela.txt');

// Arabic surah name → surah number (cleaned names, without diacritics)
const SURAH_MAP = new Map([
  ['الفاتحة', 1], ['البقرة', 2], ['ال عمران', 3], ['آل عمران', 3], ['النساء', 4],
  ['المائدة', 5], ['الأنعام', 6], ['الاعراف', 7], ['الأعراف', 7], ['الأنفال', 8],
  ['التوبة', 9], ['يونس', 10], ['هود', 11], ['يوسف', 12], ['الرعد', 13],
  ['إبراهيم', 14], ['ابراهيم', 14], ['الحجر', 15], ['النحل', 16],
  ['الإسراء', 17], ['الاسراء', 17], ['الكهف', 18], ['مريم', 19], ['طه', 20],
  ['الأنبياء', 21], ['الانبياء', 21], ['الحج', 22], ['المؤمنون', 23],
  ['النور', 24], ['الفرقان', 25], ['الشعراء', 26], ['النمل', 27],
  ['القصص', 28], ['العنكبوت', 29], ['الروم', 30], ['لقمان', 31],
  ['السجدة', 32], ['الأحزاب', 33], ['الاحزاب', 33], ['سبأ', 34],
  ['فاطر', 35], ['يس', 36], ['الصافات', 37], ['ص', 38], ['الزمر', 39],
  ['غافر', 40], ['المؤمن', 40], ['فصلت', 41], ['الشورى', 42],
  ['الزخرف', 43], ['الدخان', 44], ['الجاثية', 45], ['الأحقاف', 46],
  ['الاحقاف', 46], ['محمد', 47], ['الفتح', 48], ['الحجرات', 49],
  ['ق', 50], ['الذاريات', 51], ['الطور', 52], ['النجم', 53], ['القمر', 54],
  ['الرحمن', 55], ['الواقعة', 56], ['الحديد', 57], ['المجادلة', 58],
  ['الحشر', 59], ['الممتحنة', 60], ['الصف', 61], ['الجمعة', 62],
  ['المنافقون', 63], ['التغابن', 64], ['الطلاق', 65], ['التحريم', 66],
  ['الملك', 67], ['القلم', 68], ['الحاقة', 69], ['المعارج', 70],
  ['نوح', 71], ['الجن', 72], ['المزمل', 73], ['المدثر', 74],
  ['القيامة', 75], ['الإنسان', 76], ['الانسان', 76], ['المرسلات', 77],
  ['النبأ', 78], ['النازعات', 79], ['عبس', 80], ['التكوير', 81],
  ['الانفطار', 82], ['الانفطار', 82], ['المطففين', 83], ['الانشقاق', 84],
  ['البروج', 85], ['الطارق', 86], ['الأعلى', 87], ['الاعلى', 87],
  ['الغاشية', 88], ['الفجر', 89], ['البلد', 90], ['الشمس', 91],
  ['الليل', 92], ['الضحى', 93], ['الشرح', 94], ['التين', 95],
  ['العلق', 96], ['القدر', 97], ['البينة', 98], ['الزلزلة', 99],
  ['العاديات', 100], ['القارعة', 101], ['التكاثر', 102], ['العصر', 103],
  ['الهمزة', 104], ['الفيل', 105], ['قريش', 106], ['الماعون', 107],
  ['الكوثر', 108], ['الكافرون', 109], ['النصر', 110], ['المسد', 111],
  ['الإخلاص', 112], ['الاخلاص', 112], ['الفلق', 113], ['الناس', 114],
]);

function args() {
  const a = {
    input: DEFAULT_INPUT,
    surah: null,
    dryRun: !process.argv.includes('--apply'),
    apply: process.argv.includes('--apply'),
    forceReparse: process.argv.includes('--force-reparse'),
    resume: process.argv.includes('--resume'),
  };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--input') a.input = resolve(process.argv[++i]);
    else if (process.argv[i] === '--surah') a.surah = Number(process.argv[++i]);
  }
  return a;
}

function sql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replaceAll("'", "''")}'`;
}

function d1(db, cwd, command) {
  const out = execFileSync(
    'npx', ['wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', command],
    { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 },
  );
  const parsed = JSON.parse(out);
  for (const r of parsed) if (!r.success) throw new Error(`D1 failed: ${r.error ?? command.slice(0, 300)}`);
  return parsed.at(-1)?.results ?? [];
}

function batched(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Strip OpenITI manuscript markers like ms009, ms040
function stripMs(text) {
  return text.replace(/\bms\d+\b/g, '').replace(/\s{2,}/g, ' ').trim();
}

// Normalize surah name for lookup
function normalizeSurahName(name) {
  return name
    .replace(/^[\[|(:.]+/, '').replace(/[\]|).,:]+$/, '')
    .replace(/^ال/, 'ال')
    .trim();
}

// Extract ayah numbers from a ### | قال تعالى: (text (N) text (M)) heading
function extractAyahNums(heading) {
  // Match all (digits) groups
  const nums = [...heading.matchAll(/\((\d+)\)/g)].map((m) => parseInt(m[1]));
  if (!nums.length) return null;
  return { from: Math.min(...nums), to: Math.max(...nums) };
}

// Parse the full OpenITI text → array of section objects
function parseOpenITI(text, filterSurah) {
  const lines = text.split('\n');
  const sections = [];
  let pastHeader = false;
  let currentSurah = null;
  let currentSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip until past metadata header
    if (!pastHeader) {
      if (line.startsWith('#META#Header#End#')) pastHeader = true;
      continue;
    }

    // Page marker — skip
    if (/^#\s*PageV\d+P\d+/.test(line)) continue;

    // Section heading
    if (line.startsWith('### ')) {
      const content = stripMs(line.slice(4).replace(/^\|\s*/, '').trim());

      if (!content) continue;

      const hasQal = /قال تعالى|قوله تعالى/.test(content);

      if (hasQal) {
        // New ayah section
        const nums = extractAyahNums(content);
        if (!nums || !currentSurah) continue;

        if (filterSurah && currentSurah !== filterSurah) continue;

        // Save previous section
        if (currentSection) sections.push(currentSection);

        currentSection = {
          surah: currentSurah,
          ayah_from: nums.from,
          ayah_to: nums.to,
          heading: content,
          lines: [],
        };
      } else {
        // Possibly a surah name heading
        const cleaned = normalizeSurahName(content);
        const surahNum = SURAH_MAP.get(cleaned);
        if (surahNum) {
          currentSurah = surahNum;
        }
        // Non-ayah, non-surah headings (book title, etc.) — save and reset section
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
      }
      continue;
    }

    // Commentary line (# text)
    if (line.startsWith('# ') || line === '#') {
      const content = line.slice(2).trim();
      if (content && currentSection) {
        currentSection.lines.push(content);
      }
      continue;
    }

    // Continuation (~~text) — join to last line
    if (line.startsWith('~~') && currentSection && currentSection.lines.length > 0) {
      const content = line.slice(2).trim();
      if (content) {
        currentSection.lines[currentSection.lines.length - 1] += ' ' + content;
      }
      continue;
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

function buildModel(config, sections, concepts) {
  const chunks = [], entries = [], errors = [];

  for (const sec of sections) {
    const ayahKey = `${sec.surah}:${sec.ayah_from}`;
    const groupKey = ayahKey;
    const fromAyah = `${sec.surah}:${sec.ayah_from}`;
    const toAyah = sec.ayah_to !== sec.ayah_from ? `${sec.surah}:${sec.ayah_to}` : fromAyah;

    const ayahKeys = [];
    for (let a = sec.ayah_from; a <= sec.ayah_to; a++) ayahKeys.push(`${sec.surah}:${a}`);

    const rawText = sec.lines.join('\n');
    const cleanText = normalizeWhitespace(rawText);
    if (!cleanText) continue;

    const recordId = ayahKey;
    const chunkId = makeId('chunk', SOURCE_SLUG, recordId, 'irab', 0);

    chunks.push({
      id: chunkId,
      source_id: SOURCE_ID,
      source_slug: SOURCE_SLUG,
      source_record_id: recordId,
      ayah_key: ayahKey,
      group_ayah_key: groupKey,
      from_ayah: fromAyah,
      to_ayah: toAyah,
      ayah_keys: ayahKeys.join(','),
      surah: sec.surah,
      ayah_from: sec.ayah_from,
      ayah_to: sec.ayah_to,
      raw_text: rawText,
      clean_text: cleanText,
    });

    // Extract irab entries using parenthetical parser
    const section = { section_kind: 'irab', raw_text: rawText };
    let extracted = [];
    try {
      extracted = extractTibyanIrabEntries(section);
    } catch (err) {
      errors.push({
        id: makeId('error', SOURCE_SLUG, recordId, err.message),
        source_slug: SOURCE_SLUG,
        surah: sec.surah,
        ayah_from: sec.ayah_from,
        ayah_to: sec.ayah_to,
        error_type: 'parse_error',
        error_message: err.message,
        raw_fragment: rawText.slice(0, 500),
      });
    }

    for (const entry of extracted) {
      const conceptKey = normalizeMatchKey(entry.grammar_role_ar ?? '');
      const conceptRef = conceptKey ? (concepts.get(conceptKey) ?? null) : null;
      const mapped = conceptRef != null;

      entries.push({
        id: makeId('entry', SOURCE_SLUG, recordId, String(entry.entry_order), entry.source_quote_hash ?? ''),
        source_id: SOURCE_ID,
        source_slug: SOURCE_SLUG,
        source_title: SOURCE_TITLE_AR,
        ayah_key: ayahKey,
        group_ayah_key: groupKey,
        from_ayah: fromAyah,
        to_ayah: toAyah,
        ayah_keys: ayahKeys.join(','),
        surah: sec.surah,
        ayah_from: sec.ayah_from,
        ayah_to: sec.ayah_to,
        source_chunk_id: chunkId,
        entry_order: entry.entry_order,
        source_quote_ar: entry.source_quote_ar,
        source_quote_hash: entry.source_quote_hash ?? '',
        irab_text_ar: entry.irab_text_ar,
        target_text_ar: entry.target_text_ar,
        target_text_bare: entry.target_text_bare,
        target_text_match_key: entry.target_text_match_key,
        grammar_role_ar: entry.grammar_role_ar,
        grammar_role_norm: entry.grammar_role_norm,
        grammar_case_ar: entry.grammar_case_ar,
        mahal_ar: entry.mahal_ar,
        grammar_concept_ref: conceptRef,
        case_concept_ref: entry.case_concept_ref,
        mahal_concept_ref: entry.mahal_concept_ref,
        alternative_json: entry.alternative_json,
        inline_note_ar: entry.inline_note_ar,
        raw_annotation_ar: entry.raw_annotation_ar,
        word_link_status: sec.ayah_from !== sec.ayah_to ? 'ambiguous' : 'pending',
        al_mapping_status: mapped ? 'mapped' : 'unmapped',
        al_mapping_confidence: mapped ? 0.85 : null,
        al_mapping_note: mapped ? 'Mapped by ar_ling_nahw_concepts irab_label/concept_name_ar.' : null,
      });
    }
  }

  return { chunks, entries, errors };
}

function insertChunk(chunk, runId) {
  return `INSERT INTO qr_irab_source_chunks (id,extraction_run_id,source_id,source_slug,source_record_id,ayah_key,group_ayah_key,from_ayah,to_ayah,ayah_keys,surah,ayah_from,ayah_to,section_kind,section_order,content_format,raw_html,raw_text,clean_text,source_record_json,updated_at)
  VALUES (${sql(chunk.id)},${sql(runId)},${sql(chunk.source_id)},${sql(chunk.source_slug)},${sql(chunk.source_record_id)},${sql(chunk.ayah_key)},${sql(chunk.group_ayah_key)},${sql(chunk.from_ayah)},${sql(chunk.to_ayah)},${sql(chunk.ayah_keys)},${sql(chunk.surah)},${sql(chunk.ayah_from)},${sql(chunk.ayah_to)},'irab',0,'text',NULL,${sql(chunk.raw_text)},${sql(chunk.clean_text)},NULL,datetime('now'))
  ON CONFLICT(source_slug,source_record_id,section_kind,section_order) DO UPDATE SET extraction_run_id=excluded.extraction_run_id,raw_text=excluded.raw_text,clean_text=excluded.clean_text,updated_at=datetime('now')`;
}

function insertEntry(entry, runId) {
  return `INSERT INTO qr_irab_book_entries (id,source_id,source_slug,source_title,ayah_key,group_ayah_key,from_ayah,to_ayah,ayah_keys,surah,ayah_from,ayah_to,entry_html,irab_text,source_chunk_id,entry_order,source_quote_ar,source_quote_hash,irab_text_ar,target_text_ar,target_text_bare,target_text_match_key,grammar_role_ar,grammar_role_norm,grammar_case_ar,mahal_ar,grammar_concept_ref,syntax_relation_ref,case_concept_ref,mahal_concept_ref,alternative_json,inline_note_ar,raw_annotation_ar,word_occurrence_id,word_link_status,word_link_note,promotion_candidate_json,al_mapping_status,al_mapping_confidence,al_mapping_note,updated_at)
  VALUES (${sql(entry.id)},${sql(entry.source_id)},${sql(entry.source_slug)},${sql(entry.source_title)},${sql(entry.ayah_key)},${sql(entry.group_ayah_key)},${sql(entry.from_ayah)},${sql(entry.to_ayah)},${sql(entry.ayah_keys)},${sql(entry.surah)},${sql(entry.ayah_from)},${sql(entry.ayah_to)},NULL,${sql(entry.irab_text_ar)},${sql(entry.source_chunk_id)},${sql(entry.entry_order)},${sql(entry.source_quote_ar)},${sql(entry.source_quote_hash)},${sql(entry.irab_text_ar)},${sql(entry.target_text_ar)},${sql(entry.target_text_bare)},${sql(entry.target_text_match_key)},${sql(entry.grammar_role_ar)},${sql(entry.grammar_role_norm)},${sql(entry.grammar_case_ar)},${sql(entry.mahal_ar)},${sql(entry.grammar_concept_ref)},NULL,${sql(entry.case_concept_ref)},${sql(entry.mahal_concept_ref)},${sql(entry.alternative_json)},${sql(entry.inline_note_ar)},${sql(entry.raw_annotation_ar)},NULL,${sql(entry.word_link_status)},NULL,NULL,${sql(entry.al_mapping_status)},${sql(entry.al_mapping_confidence)},${sql(entry.al_mapping_note)},datetime('now'))
  ON CONFLICT(source_slug,source_chunk_id,entry_order,target_text_bare,source_quote_hash) DO UPDATE SET irab_text_ar=excluded.irab_text_ar,grammar_concept_ref=excluded.grammar_concept_ref,updated_at=datetime('now')`;
}

function insertError(err, runId) {
  return `INSERT INTO qr_irab_import_errors (id,extraction_run_id,source_slug,surah,ayah_from,ayah_to,source_chunk_id,error_type,error_message,raw_fragment)
  VALUES (${sql(err.id)},${sql(runId)},${sql(err.source_slug)},${sql(err.surah)},${sql(err.ayah_from)},${sql(err.ayah_to)},NULL,${sql(err.error_type)},${sql(err.error_message)},${sql(err.raw_fragment)})
  ON CONFLICT(id) DO NOTHING`;
}

function upsertSource(hash, size) {
  return `INSERT INTO qr_irab_sources (id,source_slug,source_title_ar,source_title_en,source_kind,source_version,source_downloaded_at,source_file_hash,source_file_size,note_md,updated_at)
  VALUES (${sql(SOURCE_ID)},${sql(SOURCE_SLUG)},${sql(SOURCE_TITLE_AR)},${sql(SOURCE_TITLE_EN)},'irab_book',${sql(`OpenITI/Shamela, parser ${PARSER_VERSION}`)},datetime('now'),${sql(hash)},${sql(size)},${sql('Al-Ukbari (d.616 AH). Parsed from OpenITI Shamela transcription. Uses parenthetical (token) markers for entry extraction.')},datetime('now'))
  ON CONFLICT(source_slug) DO UPDATE SET source_file_hash=excluded.source_file_hash,source_file_size=excluded.source_file_size,source_downloaded_at=excluded.source_downloaded_at,source_version=excluded.source_version,updated_at=datetime('now')`;
}

async function main() {
  const config = args();
  const text = readFileSync(config.input, 'utf8');
  const hash = sha256(text);
  const size = Buffer.byteLength(text, 'utf8');

  console.log('[parse] parsing OpenITI text …');
  const sections = parseOpenITI(text, config.surah);

  // Surah coverage report
  const surahCoverage = [...new Set(sections.map((s) => s.surah))].sort((a, b) => a - b);
  console.log(JSON.stringify({
    sections: sections.length,
    surahs_covered: surahCoverage.length,
    surah_range: [surahCoverage[0], surahCoverage.at(-1)],
    sample: sections.slice(0, 3).map((s) => ({
      surah: s.surah, ayah_from: s.ayah_from, ayah_to: s.ayah_to, text_chars: s.lines.join('').length,
    })),
  }, null, 2));

  // Load concept map from al-linguistics
  console.log('[concepts] loading nahw concepts from al-linguistics …');
  const conceptRows = d1(AL_DB, AL_CWD, 'SELECT id, concept_name_ar, irab_label FROM ar_ling_nahw_concepts');
  const concepts = new Map();
  for (const r of conceptRows) {
    if (r.irab_label) concepts.set(normalizeMatchKey(r.irab_label), r.id);
    if (r.concept_name_ar) concepts.set(normalizeMatchKey(r.concept_name_ar), r.id);
  }
  console.log(`[concepts] loaded ${concepts.size} concept mappings`);

  const model = buildModel(config, sections, concepts);
  const mapped = model.entries.filter((e) => e.al_mapping_status === 'mapped').length;

  console.log(JSON.stringify({
    chunks: model.chunks.length,
    entries: model.entries.length,
    mapped,
    unmapped: model.entries.length - mapped,
    errors: model.errors.length,
  }, null, 2));

  if (!config.apply) return;

  const runId = makeRunId(SOURCE_SLUG);

  d1(QR_DB, QR_CWD, `INSERT INTO qr_irab_extraction_runs (id,source_slug,resource_id,input_path,parser_version,started_at,status,records_read)
    VALUES (${sql(runId)},${sql(SOURCE_SLUG)},NULL,${sql(config.input)},${sql(PARSER_VERSION)},datetime('now'),'running',${sql(sections.length)})`);

  try {
    if (config.forceReparse) {
      d1(QR_DB, QR_CWD, `DELETE FROM qr_irab_source_chunks WHERE source_slug=${sql(SOURCE_SLUG)};
        DELETE FROM qr_irab_book_entries WHERE source_slug=${sql(SOURCE_SLUG)};
        DELETE FROM qr_irab_import_errors WHERE source_slug=${sql(SOURCE_SLUG)};`);
    }

    d1(QR_DB, QR_CWD, upsertSource(hash, size));

    let entriesToInsert = model.entries;
    if (config.resume) {
      const done = d1(QR_DB, QR_CWD, `SELECT DISTINCT source_chunk_id FROM qr_irab_book_entries WHERE source_slug=${sql(SOURCE_SLUG)}`);
      const doneChunks = new Set(done.map((r) => r.source_chunk_id));
      const before = entriesToInsert.length;
      entriesToInsert = entriesToInsert.filter((e) => !doneChunks.has(e.source_chunk_id));
      console.error(`[resume] skipping ${before - entriesToInsert.length} already-loaded entries, inserting ${entriesToInsert.length} remaining`);
    }

    console.log(`[d1] inserting ${model.chunks.length} chunks …`);
    for (const batch of batched(model.chunks.map((c) => insertChunk(c, runId)), 10)) {
      d1(QR_DB, QR_CWD, batch.join(';\n') + ';');
    }

    console.log(`[d1] inserting ${entriesToInsert.length} entries …`);
    for (const batch of batched(entriesToInsert.map((e) => insertEntry(e, runId)), 30)) {
      d1(QR_DB, QR_CWD, batch.join(';\n') + ';');
    }

    for (const batch of batched(model.errors.map((e) => insertError(e, runId)), 40)) {
      d1(QR_DB, QR_CWD, batch.join(';\n') + ';');
    }

    const check = d1(QR_DB, QR_CWD, `SELECT
      (SELECT COUNT(*) FROM qr_irab_source_chunks WHERE source_slug=${sql(SOURCE_SLUG)}) AS chunks,
      (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(SOURCE_SLUG)}) AS entries,
      (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(SOURCE_SLUG)} AND al_mapping_status='mapped') AS mapped,
      (SELECT COUNT(*) FROM qr_irab_import_errors WHERE source_slug=${sql(SOURCE_SLUG)}) AS errors`)[0];

    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET finished_at=datetime('now'),status='completed',chunks_created=${sql(check.chunks)},entries_created=${sql(check.entries)},error_message=NULL WHERE id=${sql(runId)}`);
    console.log(JSON.stringify({ run_id: runId, imported: check }, null, 2));
  } catch (error) {
    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET finished_at=datetime('now'),status='failed',error_message=${sql(error.message)} WHERE id=${sql(runId)}`);
    throw error;
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
