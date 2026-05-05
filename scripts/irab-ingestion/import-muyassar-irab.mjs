#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PARSER_VERSION_MUYASSAR,
  extractMuyassarIrabEntries,
  makeId,
  makeRunId,
  normalizeMatchKey,
  parseDaasHtml,
  sha256,
} from './parser.mjs';

const QR_DB = 'km_quran';
const AL_DB = 'km_arabic_linguistic';
const QR_CWD = new URL('../../workers/quran/', import.meta.url);
const AL_CWD = new URL('../../workers/ar-linguistics/', import.meta.url);
const DEFAULT_INPUT = resolve('km_arabic_linguistic/ingestion/Irrab/al-i-rab-al-muyassar.db');
const DEFAULT_SOURCE = 'qul_irab_muyassar';
const DEFAULT_SOURCE_ID = 'QR:WORK:QUL:MUYASSAR:IRAB';
const SOURCE_TITLE_AR = 'الإعراب الميسر';
const SOURCE_TITLE_EN = "Al-I'rab Al-Muyassar";

function args() {
  const parsed = {
    input: DEFAULT_INPUT,
    source: DEFAULT_SOURCE,
    surah: null,
    dryRun: !process.argv.includes('--apply'),
    apply: process.argv.includes('--apply'),
    forceReparse: process.argv.includes('--force-reparse'),
  };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--input') parsed.input = resolve(process.argv[++i]);
    else if (arg === '--surah') parsed.surah = Number(process.argv[++i]);
    else if (arg === '--dry-run') parsed.dryRun = true;
  }
  return parsed;
}

function sql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replaceAll("'", "''")}'`;
}

function d1(db, cwd, command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', command], {
    cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256,
  });
  const parsed = JSON.parse(out);
  for (const r of parsed) if (!r.success) throw new Error(`D1 failed: ${r.error ?? command.slice(0, 500)}`);
  return parsed.at(-1)?.results ?? [];
}

function sqlite(dbPath, command) {
  const out = execFileSync('sqlite3', ['-json', dbPath, command], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
  return JSON.parse(out || '[]');
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// Muyassar: all rows are single-ayah; from_ayah/to_ayah are full keys like '2:255'
function parseAyah(row) {
  const [surahStr, ayahStr] = String(row.ayah_key ?? '').split(':');
  const surah = Number(surahStr);
  const ayah = Number(ayahStr);
  return {
    surah: Number.isFinite(surah) ? surah : null,
    ayah_from: Number.isFinite(ayah) ? ayah : null,
    ayah_to: Number.isFinite(ayah) ? ayah : null,
  };
}

function loadRows(config) {
  const where = config.surah
    ? `WHERE from_ayah != '' AND ayah_key LIKE ${sql(`${config.surah}:%`)}`
    : `WHERE from_ayah != ''`;
  return sqlite(config.input, `SELECT ayah_key, group_ayah_key, from_ayah, to_ayah, ayah_keys, text FROM tafsir ${where} ORDER BY ayah_key`);
}

function conceptMap() {
  const rows = d1(AL_DB, AL_CWD, 'SELECT id, concept_name_ar, irab_label FROM ar_ling_nahw_concepts');
  const map = new Map();
  for (const row of rows) {
    for (const v of [row.concept_name_ar, row.irab_label]) {
      const k = normalizeMatchKey(v);
      if (k) map.set(k, row.id);
    }
  }
  return map;
}

function grammarRef(entry, concepts) {
  const k = normalizeMatchKey(entry.grammar_role_ar);
  return k ? (concepts.get(k) ?? null) : null;
}

function buildModel(config, rows, concepts) {
  const chunks = [], entries = [], errors = [];
  const sourceSlug = config.source;

  for (const row of rows) {
    try {
      const ayah = parseAyah(row);
      const recordId = row.ayah_key;
      // reuse parseDaasHtml — same <div class=ar><p>...</p></div> structure
      const sections = parseDaasHtml(row.text ?? '');

      for (const section of sections) {
        const chunkId = makeId('chunk', sourceSlug, recordId, section.section_kind, section.section_order);
        chunks.push({
          id: chunkId,
          source_id: DEFAULT_SOURCE_ID,
          source_slug: sourceSlug,
          source_record_id: recordId,
          ayah_key: row.ayah_key ?? null,
          group_ayah_key: row.group_ayah_key ?? null,
          from_ayah: row.from_ayah ?? null,
          to_ayah: row.to_ayah ?? null,
          ayah_keys: row.ayah_keys ?? null,
          ...ayah,
          section_kind: section.section_kind,
          section_order: section.section_order,
          content_format: 'text',
          raw_html: null,
          raw_text: section.raw_text,
          clean_text: section.clean_text,
          source_record_json: null,
        });

        if (section.section_kind !== 'irab') continue;
        const extracted = extractMuyassarIrabEntries(section);

        for (const entry of extracted) {
          const ref = grammarRef(entry, concepts);
          const entryId = makeId('entry', sourceSlug, chunkId, entry.entry_order, entry.target_text_bare, entry.source_quote_hash);
          entries.push({
            id: entryId,
            source_id: DEFAULT_SOURCE_ID,
            source_slug: sourceSlug,
            source_title: SOURCE_TITLE_AR,
            ayah_key: row.ayah_key,
            group_ayah_key: row.group_ayah_key ?? null,
            from_ayah: row.from_ayah ?? null,
            to_ayah: row.to_ayah ?? null,
            ayah_keys: row.ayah_keys ?? null,
            ...ayah,
            entry_html: null,
            irab_text: entry.irab_text_ar,
            source_chunk_id: chunkId,
            entry_order: entry.entry_order,
            source_quote_ar: entry.source_quote_ar,
            source_quote_hash: entry.source_quote_hash,
            irab_text_ar: entry.irab_text_ar,
            target_text_ar: entry.target_text_ar,
            target_text_bare: entry.target_text_bare,
            target_text_match_key: entry.target_text_match_key,
            grammar_role_ar: entry.grammar_role_ar,
            grammar_role_norm: entry.grammar_role_norm,
            grammar_case_ar: entry.grammar_case_ar,
            mahal_ar: entry.mahal_ar,
            grammar_concept_ref: ref,
            syntax_relation_ref: null,
            case_concept_ref: entry.case_concept_ref,
            mahal_concept_ref: entry.mahal_concept_ref,
            alternative_json: null,
            inline_note_ar: null,
            raw_annotation_ar: null,
            word_occurrence_id: null,
            word_link_status: 'pending',
            word_link_note: null,
            promotion_candidate_json: null,
            al_mapping_status: ref ? 'mapped' : 'unmapped',
            al_mapping_confidence: ref ? 0.86 : null,
            al_mapping_note: ref
              ? 'Mapped by ar_ling_nahw_concepts irab_label/concept_name_ar.'
              : 'No AL nahw concept matched extracted grammar_role_ar.',
          });
        }
      }
    } catch (error) {
      const ayah = parseAyah(row);
      errors.push({
        id: makeId('error', sourceSlug, row.ayah_key ?? '', error.message),
        source_slug: sourceSlug,
        ...ayah,
        source_chunk_id: null,
        error_type: 'parse_error',
        error_message: error.message,
        raw_fragment: JSON.stringify(row).slice(0, 4000),
      });
    }
  }
  return { chunks, entries, errors };
}

function upsertSource(config, hash, size) {
  return `INSERT INTO qr_irab_sources (id,source_slug,source_title_ar,source_title_en,source_kind,source_version,source_downloaded_at,source_file_hash,source_file_size,note_md,updated_at)
    VALUES (${sql(DEFAULT_SOURCE_ID)},${sql(config.source)},${sql(SOURCE_TITLE_AR)},${sql(SOURCE_TITLE_EN)},'irab_book',${sql(`QUL local sqlite, parser ${PARSER_VERSION_MUYASSAR}`)},datetime('now'),${sql(hash)},${sql(size)},${sql('Per-paragraph hlt token format. All rows are single-ayah — no secondary refs.')},datetime('now'))
    ON CONFLICT(source_slug) DO UPDATE SET source_file_hash=excluded.source_file_hash,source_file_size=excluded.source_file_size,source_downloaded_at=excluded.source_downloaded_at,source_version=excluded.source_version,updated_at=datetime('now')`;
}

function insertChunk(chunk, runId) {
  return `INSERT INTO qr_irab_source_chunks (id,extraction_run_id,source_id,source_slug,source_record_id,ayah_key,group_ayah_key,from_ayah,to_ayah,ayah_keys,surah,ayah_from,ayah_to,section_kind,section_order,content_format,raw_html,raw_text,clean_text,source_record_json,updated_at)
  VALUES (${sql(chunk.id)},${sql(runId)},${sql(chunk.source_id)},${sql(chunk.source_slug)},${sql(chunk.source_record_id)},${sql(chunk.ayah_key)},${sql(chunk.group_ayah_key)},${sql(chunk.from_ayah)},${sql(chunk.to_ayah)},${sql(chunk.ayah_keys)},${sql(chunk.surah)},${sql(chunk.ayah_from)},${sql(chunk.ayah_to)},${sql(chunk.section_kind)},${sql(chunk.section_order)},${sql(chunk.content_format)},${sql(chunk.raw_html)},${sql(chunk.raw_text)},${sql(chunk.clean_text)},NULL,datetime('now'))
  ON CONFLICT(source_slug,source_record_id,section_kind,section_order) DO UPDATE SET extraction_run_id=excluded.extraction_run_id,raw_text=excluded.raw_text,clean_text=excluded.clean_text,updated_at=datetime('now')`;
}

function insertEntry(e) {
  return `INSERT INTO qr_irab_book_entries (id,source_id,source_slug,source_title,ayah_key,group_ayah_key,from_ayah,to_ayah,ayah_keys,surah,ayah_from,ayah_to,entry_html,irab_text,source_chunk_id,entry_order,source_quote_ar,source_quote_hash,irab_text_ar,target_text_ar,target_text_bare,target_text_match_key,grammar_role_ar,grammar_role_norm,grammar_case_ar,mahal_ar,grammar_concept_ref,syntax_relation_ref,case_concept_ref,mahal_concept_ref,alternative_json,inline_note_ar,raw_annotation_ar,word_occurrence_id,word_link_status,word_link_note,promotion_candidate_json,al_mapping_status,al_mapping_confidence,al_mapping_note,updated_at)
  VALUES (${sql(e.id)},${sql(e.source_id)},${sql(e.source_slug)},${sql(e.source_title)},${sql(e.ayah_key)},${sql(e.group_ayah_key)},${sql(e.from_ayah)},${sql(e.to_ayah)},${sql(e.ayah_keys)},${sql(e.surah)},${sql(e.ayah_from)},${sql(e.ayah_to)},NULL,${sql(e.irab_text)},${sql(e.source_chunk_id)},${sql(e.entry_order)},${sql(e.source_quote_ar)},${sql(e.source_quote_hash)},${sql(e.irab_text_ar)},${sql(e.target_text_ar)},${sql(e.target_text_bare)},${sql(e.target_text_match_key)},${sql(e.grammar_role_ar)},${sql(e.grammar_role_norm)},${sql(e.grammar_case_ar)},${sql(e.mahal_ar)},${sql(e.grammar_concept_ref)},NULL,${sql(e.case_concept_ref)},${sql(e.mahal_concept_ref)},NULL,NULL,NULL,NULL,${sql(e.word_link_status)},NULL,NULL,${sql(e.al_mapping_status)},${sql(e.al_mapping_confidence)},${sql(e.al_mapping_note)},datetime('now'))
  ON CONFLICT(id) DO UPDATE SET source_quote_ar=excluded.source_quote_ar,irab_text_ar=excluded.irab_text_ar,target_text_ar=excluded.target_text_ar,grammar_concept_ref=excluded.grammar_concept_ref,al_mapping_status=excluded.al_mapping_status,updated_at=datetime('now')`;
}

function insertError(err, runId) {
  return `INSERT INTO qr_irab_import_errors (id,extraction_run_id,source_slug,surah,ayah_from,ayah_to,source_chunk_id,error_type,error_message,raw_fragment)
  VALUES (${sql(err.id)},${sql(runId)},${sql(err.source_slug)},${sql(err.surah)},${sql(err.ayah_from)},${sql(err.ayah_to)},NULL,${sql(err.error_type)},${sql(err.error_message)},${sql(err.raw_fragment)})
  ON CONFLICT(id) DO NOTHING`;
}

function batched(stmts, size) {
  const out = [];
  for (let i = 0; i < stmts.length; i += size) out.push(stmts.slice(i, i + size).join(';\n') + ';');
  return out;
}

function main() {
  const config = args();
  const stats = statSync(config.input);
  const hash = fileSha256(config.input);
  const concepts = conceptMap();
  const rows = loadRows(config);
  const model = buildModel(config, rows, concepts);
  const runId = makeRunId(config.source);

  const unmapped = [...new Set(model.entries.filter((e) => !e.grammar_concept_ref).map((e) => e.grammar_role_ar ?? '(none)'))].slice(0, 30);
  console.log(JSON.stringify({
    source_rows: rows.length, chunks: model.chunks.length, entries: model.entries.length,
    mapped: model.entries.filter((e) => e.al_mapping_status === 'mapped').length,
    errors: model.errors.length, unmapped_roles: unmapped,
    sample: model.entries.slice(0, 5).map((e) => ({ ayah_key: e.ayah_key, target: e.target_text_ar, role: e.grammar_role_ar, ref: e.grammar_concept_ref })),
  }, null, 2));

  if (!config.apply) return;

  d1(QR_DB, QR_CWD, `INSERT INTO qr_irab_extraction_runs (id,source_slug,resource_id,input_path,parser_version,started_at,status,records_read)
    VALUES (${sql(runId)},${sql(config.source)},NULL,${sql(config.input)},${sql(PARSER_VERSION_MUYASSAR)},datetime('now'),'running',${sql(rows.length)})`);

  try {
    if (config.forceReparse) {
      d1(QR_DB, QR_CWD, `DELETE FROM qr_irab_book_entries WHERE source_slug=${sql(config.source)};
        DELETE FROM qr_irab_source_chunks WHERE source_slug=${sql(config.source)};
        DELETE FROM qr_irab_import_errors WHERE source_slug=${sql(config.source)};`);
    }
    d1(QR_DB, QR_CWD, upsertSource(config, hash, stats.size));
    for (const b of batched(model.chunks.map((c) => insertChunk(c, runId)), 10)) d1(QR_DB, QR_CWD, b);
    for (const b of batched(model.entries.map(insertEntry), 30)) d1(QR_DB, QR_CWD, b);
    for (const b of batched(model.errors.map((e) => insertError(e, runId)), 40)) d1(QR_DB, QR_CWD, b);

    const check = d1(QR_DB, QR_CWD, `SELECT
      (SELECT COUNT(*) FROM qr_irab_source_chunks WHERE source_slug=${sql(config.source)}) AS chunks,
      (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(config.source)}) AS entries,
      (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(config.source)} AND al_mapping_status='mapped') AS mapped,
      (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(config.source)} AND al_mapping_status='unmapped') AS unmapped,
      (SELECT COUNT(*) FROM qr_irab_import_errors WHERE source_slug=${sql(config.source)}) AS errors`)[0];

    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET finished_at=datetime('now'),status='completed',chunks_created=${sql(check.chunks)},entries_created=${sql(check.entries)},entries_linked=${sql(check.mapped)},entries_unmapped=${sql(check.unmapped)},error_message=NULL WHERE id=${sql(runId)}`);
    console.log(JSON.stringify({ run_id: runId, imported: check }, null, 2));
  } catch (error) {
    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET finished_at=datetime('now'),status='failed',error_message=${sql(error.message)} WHERE id=${sql(runId)}`);
    throw error;
  }
}

main();
