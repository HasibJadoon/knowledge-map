#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PARSER_VERSION,
  extractIrabEntriesFromSection,
  makeId,
  makeRunId,
  normalizeBareArabic,
  normalizeMatchKey,
  normalizeWhitespace,
  parseHtmlSections,
  sha256,
} from './parser.mjs';

const QR_DB = 'km_quran';
const AL_DB = 'km_arabic_linguistic';
const QR_CWD = new URL('../../workers/quran/', import.meta.url);
const AL_CWD = new URL('../../workers/ar-linguistics/', import.meta.url);
const DEFAULT_INPUT = resolve('km_arabic_linguistic/ingestion/Irrab/al-jadwal-fi-i-rab-al-quran.db');
const DEFAULT_SOURCE = 'qul_jadwal_irab_quran';
const DEFAULT_SOURCE_ID = 'QR:WORK:QUL:520:JADWAL_IRAB';
const SOURCE_TITLE = 'الجدول في إعراب القرآن';

function args() {
  const parsed = {
    input: DEFAULT_INPUT,
    source: DEFAULT_SOURCE,
    surah: null,
    dryRun: !process.argv.includes('--apply'),
    apply: process.argv.includes('--apply'),
    forceReparse: process.argv.includes('--force-reparse'),
    skipEmbeddings: process.argv.includes('--skip-embeddings'),
  };
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg === '--input') parsed.input = resolve(process.argv[++index]);
    else if (arg === '--source') parsed.source = process.argv[++index];
    else if (arg === '--surah') parsed.surah = Number(process.argv[++index]);
    else if (arg === '--dry-run') parsed.dryRun = true;
  }
  return parsed;
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function d1(db, cwd, command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', command], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  });
  const parsed = JSON.parse(out);
  for (const result of parsed) {
    if (!result.success) throw new Error(`D1 failed: ${result.error ?? command.slice(0, 500)}`);
  }
  return parsed.at(-1)?.results ?? [];
}

function sqlite(dbPath, command) {
  const out = execFileSync('sqlite3', ['-json', dbPath, command], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 512,
  });
  return JSON.parse(out || '[]');
}

function inspectSqlite(dbPath) {
  const tables = sqlite(dbPath, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const diagnostics = [];
  for (const table of tables) {
    const columns = sqlite(dbPath, `PRAGMA table_info(${JSON.stringify(table.name)})`);
    diagnostics.push({ table: table.name, columns: columns.map((column) => column.name) });
  }

  for (const table of diagnostics) {
    const textColumn = table.columns.find((column) => /^(text|html|content|body)$/i.test(column))
      ?? table.columns.find((column) => /(text|html|content|body)/i.test(column));
    const hasAyah = ['ayah_key', 'group_ayah_key', 'from_ayah', 'to_ayah', 'ayah_keys'].some((column) => table.columns.includes(column));
    if (textColumn && hasAyah) return { table: table.table, textColumn, columns: table.columns, diagnostics };
  }

  throw new Error(`Could not detect QUL i'rab table. SQLite schema: ${JSON.stringify(diagnostics, null, 2)}`);
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function parseAyah(row) {
  const numericAyah = (value, fallback = null) => {
    if (value === null || value === undefined || value === '') return fallback;
    const text = String(value);
    const part = text.includes(':') ? text.split(':').at(-1) : text;
    const number = Number(part);
    return Number.isFinite(number) ? number : fallback;
  };
  const ayahKey = String(row.ayah_key ?? '');
  const [surahFromKey, ayahFromKey] = ayahKey.split(':').map((part) => Number(part));
  const from = numericAyah(row.from_ayah, ayahFromKey);
  const to = numericAyah(row.to_ayah, from);
  const surah = Number.isFinite(surahFromKey) ? surahFromKey : null;
  const ayahFrom = Number.isFinite(from) ? from : null;
  const ayahTo = Number.isFinite(to) ? to : ayahFrom;
  const ayah = ayahFrom && ayahTo && ayahFrom === ayahTo ? ayahFrom : null;
  return { surah, ayah, ayah_from: ayahFrom, ayah_to: ayahTo };
}

function loadRows(config, detected) {
  const columns = detected.columns
    .map((column) => column === detected.textColumn ? `${JSON.stringify(column)} AS text` : JSON.stringify(column))
    .join(', ');
  const where = config.surah ? ` WHERE ayah_key LIKE ${sql(`${config.surah}:%`)}` : '';
  return sqlite(config.input, `SELECT ${columns} FROM ${JSON.stringify(detected.table)}${where} ORDER BY ayah_key`);
}

function sourceRecordId(row) {
  return row.ayah_key ?? row.group_ayah_key ?? row.ayah_keys ?? sha256(JSON.stringify(row)).slice(0, 24);
}

function conceptMap() {
  const rows = d1(AL_DB, AL_CWD, 'SELECT id, concept_name_ar, irab_label FROM ar_ling_nahw_concepts');
  const map = new Map();
  for (const row of rows) {
    for (const value of [row.concept_name_ar, row.irab_label]) {
      const key = normalizeMatchKey(value);
      if (key) map.set(key, row.id);
    }
  }
  return map;
}

function grammarRef(entry, concepts) {
  const key = normalizeMatchKey(entry.grammar_role_ar);
  return key ? concepts.get(key) ?? null : null;
}

function buildModel(config, rows, concepts) {
  const chunks = [];
  const entries = [];
  const errors = [];
  const sourceSlug = config.source;
  const sourceId = DEFAULT_SOURCE_ID;

  for (const row of rows) {
    try {
      const ayah = parseAyah(row);
      const recordId = sourceRecordId(row);
      const sections = parseHtmlSections(row.text ?? row.html ?? row.content ?? '');
      for (const section of sections) {
        const chunkId = makeId('chunk', sourceSlug, recordId, section.section_kind, section.section_order);
        const chunk = {
          id: chunkId,
          source_id: sourceId,
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
          content_format: 'html',
          raw_html: section.raw_html,
          raw_text: section.raw_text,
          clean_text: section.clean_text,
          source_record_json: JSON.stringify(row),
        };
        chunks.push(chunk);

        if (section.section_kind !== 'irab') continue;
        const extracted = extractIrabEntriesFromSection(section);
        for (const entry of extracted) {
          const ref = grammarRef(entry, concepts);
          const entryId = makeId('entry', sourceSlug, chunkId, entry.entry_order, entry.target_text_bare, entry.source_quote_hash);
          const singleAyah = ayah.ayah_from && ayah.ayah_to && ayah.ayah_from === ayah.ayah_to;
          entries.push({
            id: entryId,
            source_id: sourceId,
            source_slug: sourceSlug,
            source_title: SOURCE_TITLE,
            ayah_key: row.ayah_key ?? `${ayah.surah}:${ayah.ayah_from ?? ''}`,
            group_ayah_key: row.group_ayah_key ?? null,
            from_ayah: row.from_ayah ?? null,
            to_ayah: row.to_ayah ?? null,
            ayah_keys: row.ayah_keys ?? null,
            surah: ayah.surah,
            ayah_from: ayah.ayah_from,
            ayah_to: ayah.ayah_to,
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
            alternative_json: entry.alternative_json,
            inline_note_ar: entry.inline_note_ar,
            raw_annotation_ar: entry.raw_annotation_ar,
            word_occurrence_id: null,
            word_link_status: singleAyah ? 'pending' : 'ambiguous',
            word_link_note: singleAyah ? null : 'Multi-ayah source chunk; ayah-specific target was not resolved automatically.',
            promotion_candidate_json: null,
            al_mapping_status: ref ? 'mapped' : 'unmapped',
            al_mapping_confidence: ref ? 0.86 : null,
            al_mapping_note: ref ? 'Mapped by ar_ling_nahw_concepts irab_label/concept_name_ar.' : 'No AL nahw concept matched extracted grammar_role_ar.',
          });
        }
      }
    } catch (error) {
      const ayah = parseAyah(row);
      errors.push({
        id: makeId('error', sourceSlug, sourceRecordId(row), error.message),
        source_slug: sourceSlug,
        surah: ayah.surah,
        ayah_from: ayah.ayah_from,
        ayah_to: ayah.ayah_to,
        source_chunk_id: null,
        error_type: 'parse_error',
        error_message: error.message,
        raw_fragment: JSON.stringify(row).slice(0, 4000),
      });
    }
  }

  return { chunks, entries, errors };
}

function statementsForSource(config, fileHash, fileSize) {
  return [`INSERT INTO qr_irab_sources (
      id, source_slug, source_title_ar, source_title_en, source_kind,
      source_version, source_downloaded_at, source_file_hash, source_file_size,
      note_md, updated_at
    ) VALUES (
      ${sql(DEFAULT_SOURCE_ID)}, ${sql(config.source)}, ${sql(SOURCE_TITLE)}, ${sql('Al-Jadwal fi Iʿrab al-Qurʾan')},
      'irab_book', ${sql('QUL resource 520 local sqlite')}, datetime('now'), ${sql(fileHash)}, ${sql(fileSize)},
      ${sql('Imported from local QUL SQLite. Local table may be named tafsir, but content is iʿrāb/sarf/balagha/fawaid.')}, datetime('now')
    )
    ON CONFLICT(source_slug) DO UPDATE SET
      source_file_hash=excluded.source_file_hash,
      source_file_size=excluded.source_file_size,
      source_downloaded_at=excluded.source_downloaded_at,
      source_version=excluded.source_version,
      updated_at=datetime('now')`];
}

function insertChunkStatement(chunk, runId) {
  return `INSERT INTO qr_irab_source_chunks (
    id, extraction_run_id, source_id, source_slug, source_record_id, ayah_key,
    group_ayah_key, from_ayah, to_ayah, ayah_keys, surah, ayah_from, ayah_to,
    section_kind, section_order, content_format, raw_html, raw_text, clean_text,
    source_record_json, updated_at
  ) VALUES (
    ${sql(chunk.id)}, ${sql(runId)}, ${sql(chunk.source_id)}, ${sql(chunk.source_slug)}, ${sql(chunk.source_record_id)},
    ${sql(chunk.ayah_key)}, ${sql(chunk.group_ayah_key)}, ${sql(chunk.from_ayah)}, ${sql(chunk.to_ayah)},
    ${sql(chunk.ayah_keys)}, ${sql(chunk.surah)}, ${sql(chunk.ayah_from)}, ${sql(chunk.ayah_to)},
    ${sql(chunk.section_kind)}, ${sql(chunk.section_order)}, ${sql(chunk.content_format)}, ${sql(chunk.raw_html)},
    ${sql(chunk.raw_text)}, ${sql(chunk.clean_text)}, ${sql(chunk.source_record_json)}, datetime('now')
  )
  ON CONFLICT(source_slug, source_record_id, section_kind, section_order) DO UPDATE SET
    extraction_run_id=excluded.extraction_run_id,
    raw_html=excluded.raw_html,
    raw_text=excluded.raw_text,
    clean_text=excluded.clean_text,
    source_record_json=excluded.source_record_json,
    updated_at=datetime('now')`;
}

function insertEntryStatement(entry) {
  return `INSERT INTO qr_irab_book_entries (
    id, source_id, source_slug, source_title, ayah_key, group_ayah_key,
    from_ayah, to_ayah, ayah_keys, surah, ayah_from, ayah_to, entry_html,
    irab_text, source_chunk_id, entry_order, source_quote_ar, source_quote_hash,
    irab_text_ar, target_text_ar, target_text_bare, target_text_match_key,
    grammar_role_ar, grammar_role_norm, grammar_case_ar, mahal_ar,
    grammar_concept_ref, syntax_relation_ref, case_concept_ref, mahal_concept_ref,
    alternative_json, inline_note_ar, raw_annotation_ar, word_occurrence_id,
    word_link_status, word_link_note, promotion_candidate_json,
    al_mapping_status, al_mapping_confidence, al_mapping_note, updated_at
  ) VALUES (
    ${sql(entry.id)}, ${sql(entry.source_id)}, ${sql(entry.source_slug)}, ${sql(entry.source_title)}, ${sql(entry.ayah_key)},
    ${sql(entry.group_ayah_key)}, ${sql(entry.from_ayah)}, ${sql(entry.to_ayah)}, ${sql(entry.ayah_keys)},
    ${sql(entry.surah)}, ${sql(entry.ayah_from)}, ${sql(entry.ayah_to)}, ${sql(entry.entry_html)},
    ${sql(entry.irab_text)}, ${sql(entry.source_chunk_id)}, ${sql(entry.entry_order)}, ${sql(entry.source_quote_ar)},
    ${sql(entry.source_quote_hash)}, ${sql(entry.irab_text_ar)}, ${sql(entry.target_text_ar)}, ${sql(entry.target_text_bare)},
    ${sql(entry.target_text_match_key)}, ${sql(entry.grammar_role_ar)}, ${sql(entry.grammar_role_norm)},
    ${sql(entry.grammar_case_ar)}, ${sql(entry.mahal_ar)}, ${sql(entry.grammar_concept_ref)},
    ${sql(entry.syntax_relation_ref)}, ${sql(entry.case_concept_ref)}, ${sql(entry.mahal_concept_ref)},
    ${sql(entry.alternative_json)}, ${sql(entry.inline_note_ar)}, ${sql(entry.raw_annotation_ar)},
    ${sql(entry.word_occurrence_id)}, ${sql(entry.word_link_status)}, ${sql(entry.word_link_note)},
    ${sql(entry.promotion_candidate_json)}, ${sql(entry.al_mapping_status)}, ${sql(entry.al_mapping_confidence)},
    ${sql(entry.al_mapping_note)}, datetime('now')
  )
  ON CONFLICT(id) DO UPDATE SET
    source_quote_ar=excluded.source_quote_ar,
    irab_text_ar=excluded.irab_text_ar,
    target_text_ar=excluded.target_text_ar,
    grammar_concept_ref=excluded.grammar_concept_ref,
    al_mapping_status=excluded.al_mapping_status,
    updated_at=datetime('now')`;
}

function insertErrorStatement(error, runId) {
  return `INSERT INTO qr_irab_import_errors (
    id, extraction_run_id, source_slug, surah, ayah_from, ayah_to,
    source_chunk_id, error_type, error_message, raw_fragment
  ) VALUES (
    ${sql(error.id)}, ${sql(runId)}, ${sql(error.source_slug)}, ${sql(error.surah)}, ${sql(error.ayah_from)},
    ${sql(error.ayah_to)}, ${sql(error.source_chunk_id)}, ${sql(error.error_type)}, ${sql(error.error_message)},
    ${sql(error.raw_fragment)}
  )
  ON CONFLICT(id) DO NOTHING`;
}

function batched(statements, size = 50) {
  const batches = [];
  for (let index = 0; index < statements.length; index += size) batches.push(statements.slice(index, index + size).join(';\n') + ';');
  return batches;
}

function printDryRun(rows, model) {
  const chunkCounts = {};
  for (const chunk of model.chunks) chunkCounts[chunk.section_kind] = (chunkCounts[chunk.section_kind] ?? 0) + 1;
  const unmapped = [...new Set(model.entries.filter((entry) => entry.al_mapping_status === 'unmapped').map((entry) => entry.grammar_role_ar ?? '(none)'))].slice(0, 50);
  console.log(JSON.stringify({
    source_rows: rows.length,
    chunk_counts_by_section_kind: chunkCounts,
    first_10_irab_entries: model.entries.slice(0, 10).map((entry) => ({
      ayah_key: entry.ayah_key,
      target_text_ar: entry.target_text_ar,
      grammar_role_ar: entry.grammar_role_ar,
      grammar_concept_ref: entry.grammar_concept_ref,
      source_quote_ar: entry.source_quote_ar,
    })),
    unmapped_grammar_labels: unmapped,
    import_errors: model.errors.length,
  }, null, 2));
}

function main() {
  const config = args();
  const detected = inspectSqlite(config.input);
  const stats = statSync(config.input);
  const hash = fileSha256(config.input);
  const concepts = conceptMap();
  const rows = loadRows(config, detected);
  const model = buildModel(config, rows, concepts);
  const runId = makeRunId(config.source);

  printDryRun(rows, model);
  if (config.dryRun || !config.apply) return;

  d1(QR_DB, QR_CWD, `INSERT INTO qr_irab_extraction_runs (
    id, source_slug, resource_id, input_path, parser_version, started_at, status, records_read
  ) VALUES (
    ${sql(runId)}, ${sql(config.source)}, 520, ${sql(config.input)}, ${sql(PARSER_VERSION)}, datetime('now'), 'running', ${sql(rows.length)}
  )`);

  try {
    if (config.forceReparse) {
      d1(QR_DB, QR_CWD, `
        DELETE FROM qr_irab_book_entries WHERE source_slug IN (${sql(config.source)}, 'mahmud_safi_jadwal_irab');
        DELETE FROM qr_irab_source_chunks WHERE source_slug=${sql(config.source)};
        DELETE FROM qr_irab_import_errors WHERE source_slug=${sql(config.source)};
      `);
    }

    d1(QR_DB, QR_CWD, `
      DELETE FROM qr_tafsir_entries
      WHERE work_id IN ('QR:WORK:MAHMUD_SAFI:JADWAL_IRAB', 'QR:WORK:JADWAL_IRAB', 'JADWAL_IRAB', ${sql(DEFAULT_SOURCE_ID)})
         OR content_ar LIKE '%* الإعراب:%'
    `);

    for (const batch of batched(statementsForSource(config, hash, stats.size), 10)) d1(QR_DB, QR_CWD, batch);
    for (const batch of batched(model.chunks.map((chunk) => insertChunkStatement(chunk, runId)), 5)) d1(QR_DB, QR_CWD, batch);
    for (const batch of batched(model.entries.map(insertEntryStatement), 30)) d1(QR_DB, QR_CWD, batch);
    for (const batch of batched(model.errors.map((error) => insertErrorStatement(error, runId)), 40)) d1(QR_DB, QR_CWD, batch);

    const check = d1(QR_DB, QR_CWD, `
      SELECT
        (SELECT COUNT(*) FROM qr_irab_source_chunks WHERE source_slug=${sql(config.source)}) AS chunks,
        (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(config.source)}) AS entries,
        (SELECT COUNT(*) FROM qr_irab_book_entries WHERE source_slug=${sql(config.source)} AND al_mapping_status='unmapped') AS unmapped,
        (SELECT COUNT(*) FROM qr_irab_import_errors WHERE source_slug=${sql(config.source)}) AS errors,
        (SELECT COUNT(*) FROM qr_tafsir_entries WHERE content_ar LIKE '%* الإعراب:%') AS remaining_irab_in_tafsir
    `)[0];

    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET
      finished_at=datetime('now'),
      status='completed',
      chunks_created=${sql(check.chunks)},
      entries_created=${sql(check.entries)},
      entries_unmapped=${sql(check.unmapped)},
      error_message=NULL
      WHERE id=${sql(runId)}
    `);
    console.log(JSON.stringify({ run_id: runId, imported: check, skip_embeddings: config.skipEmbeddings }, null, 2));
  } catch (error) {
    d1(QR_DB, QR_CWD, `UPDATE qr_irab_extraction_runs SET
      finished_at=datetime('now'),
      status='failed',
      error_message=${sql(error.message.slice(0, 2000))}
      WHERE id=${sql(runId)}
    `);
    throw error;
  }
}

main();
