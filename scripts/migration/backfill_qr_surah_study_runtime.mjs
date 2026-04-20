#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const LEGACY_DB = 'DB_LEGACY';
const QR_DB = 'DB_QR';

const args = new Set(process.argv.slice(2));
const mode = args.has('--local') ? '--local' : '--remote';
const dryRun = args.has('--dry-run');
const targetUnitId = process.argv.find((arg) => arg.startsWith('--unit-id='))?.slice('--unit-id='.length)
  ?? 'U:C:QURAN:12:1-7';
const TASK_JSON_INLINE_LIMIT = 60_000;
const TASK_JSON_CHUNK_SIZE = 50_000;

const TRANSLATION_SOURCES = {
  haleem: {
    id: '01HW000000HALEEM0000000000',
    source_code: 'haleem',
    translator_name: 'M. A. S. Abdel Haleem',
  },
  asad: {
    id: '01HW000000ASAD000000000000',
    source_code: 'asad',
    translator_name: 'Muhammad Asad',
  },
  sahih: {
    id: '01HW000000SAHIHINT00000000',
    source_code: 'sahih_intl',
    translator_name: 'Sahih International',
  },
};

function runWrangler(db, options) {
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', db, mode, '--json', ...options],
    {
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `wrangler exited ${result.status}`);
  }

  const raw = result.stdout.trim();
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const start = raw.lastIndexOf('\n[');
    if (start < 0) throw new Error(raw);
    parsed = JSON.parse(raw.slice(start + 1));
  }
  for (const entry of parsed) {
    if (entry?.success === false) {
      throw new Error(JSON.stringify(entry));
    }
  }
  return parsed;
}

function query(db, sql) {
  const parsed = runWrangler(db, ['--command', sql]);
  return parsed.flatMap((entry) => entry.results ?? []);
}

function executeSqlFile(sql) {
  if (dryRun) {
    console.log(`[dry-run] Would execute ${sql.length.toLocaleString()} bytes of SQL against ${QR_DB}.`);
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), 'km-qr-study-'));
  const file = join(dir, 'backfill.sql');
  try {
    writeFileSync(file, sql, 'utf8');
    runWrangler(QR_DB, ['--file', file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : 'NULL';
}

function sqlValue(value) {
  return typeof value === 'number' ? sqlNumber(value) : sqlString(value);
}

function parseJson(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function cleanString(value, replacements) {
  let next = value;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  return next;
}

function deepClean(value, replacements) {
  if (typeof value === 'string') return cleanString(value, replacements);
  if (Array.isArray(value)) return value.map((entry) => deepClean(entry, replacements));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepClean(entry, replacements)]),
    );
  }
  return value;
}

function rangeFor(row) {
  return Number(row.ayah_from) === Number(row.ayah_to)
    ? String(row.ayah_from)
    : `${row.ayah_from}-${row.ayah_to}`;
}

function passageId(row) {
  return `QR:SP:${row.surah}:${rangeFor(row)}`;
}

function stepId(row, taskType) {
  return `QR:STEP:${row.surah}:${rangeFor(row)}:${taskType}`;
}

function normalizePublicUnitId(row) {
  return `U:C:QURAN:${row.surah}:${rangeFor(row)}`;
}

function passageReplacements(row) {
  const range = rangeFor(row);
  const normalized = normalizePublicUnitId(row);
  const malformed = `U:C:QURAN:${row.surah}:${row.surah}:${range}`;
  const normalizedSlug = normalized.replace(/[:\-]/g, '_');
  const malformedSlug = malformed.replace(/[:\-]/g, '_');
  return [
    [malformed, normalized],
    [malformedSlug, normalizedSlug],
  ];
}

function cleanJsonText(raw, row) {
  if (!raw) return null;
  const replacements = passageReplacements(row);
  const parsed = parseJson(raw);
  if (parsed) {
    return JSON.stringify(deepClean(parsed, replacements));
  }
  return cleanString(String(raw), replacements);
}

function extractMorphologyPosMap(tasks, passageByUnitId) {
  const posByLocation = new Map();

  for (const task of tasks) {
    if (task.task_type !== 'morphology' || !task.task_json) continue;
    const passage = passageByUnitId.get(task.unit_id);
    if (!passage) continue;

    const cleaned = cleanJsonText(task.task_json, passage);
    const payload = parseJson(cleaned);
    const items = Array.isArray(payload?.items) ? payload.items : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const surah = Number(item.surah ?? passage.surah);
      const ayah = Number(item.ayah);
      const tokenIndex = Number(item.token_index ?? item.position);
      const pos = typeof item.pos === 'string' ? item.pos.toLowerCase() : null;
      if (!surah || !ayah || !tokenIndex || !pos) continue;
      posByLocation.set(`${surah}:${ayah}:${tokenIndex}`, pos);
    }
  }

  return posByLocation;
}

function revelationType(row) {
  const meta = parseJson(row.meta_json);
  const raw = String(
    row.revelation_place ??
    meta?.revelation?.place ??
    meta?.revelation_type ??
    '',
  ).toLowerCase();
  return raw.includes('madin') ? 'madani' : 'makki';
}

function selectedRangesWhere(passages, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return passages
    .map((p) => `(${prefix}surah = ${sqlNumber(p.surah)} AND ${prefix}ayah BETWEEN ${sqlNumber(p.ayah_from)} AND ${sqlNumber(p.ayah_to)})`)
    .join(' OR ');
}

function buildInsert(table, columns, rows) {
  if (!rows.length) return '';
  const values = rows.map((row) => `(${columns.map((col) => row[col]).join(', ')})`).join(',\n');
  return `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES\n${values};\n\n`;
}

function buildInsertStatements(table, columns, rows) {
  if (!rows.length) return '';
  return rows
    .map((row) => `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((col) => row[col]).join(', ')});`)
    .join('\n') + '\n\n';
}

function main() {
  console.log(`Backfilling Quran study runtime into ${QR_DB} (${mode}, dryRun=${dryRun}, unit=${targetUnitId})`);

  const passages = query(LEGACY_DB, `
    SELECT
      u.id,
      u.container_id,
      u.parent_unit_id,
      u.unit_type,
      u.order_index,
      u.ayah_from,
      u.ayah_to,
      u.start_ref,
      u.end_ref,
      u.text_cache,
      u.meta_json,
      u.surah,
      u.surah_ref,
      'draft' AS status,
      u.created_at,
      u.updated_at,
      l.id AS legacy_lesson_id,
      l.title AS lesson_title,
      l.title_ar AS lesson_title_ar
    FROM ar_container_units u
    LEFT JOIN ar_lessons l ON l.unit_id = u.id AND l.lesson_type = 'quran'
    WHERE u.unit_type = 'passage'
      AND u.id = ${sqlString(targetUnitId)}
    ORDER BY u.surah, u.order_index
  `);

  if (!passages.length) {
    console.log('No legacy Quran study passages found.');
    return;
  }

  const passageByUnitId = new Map(passages.map((p) => [p.id, p]));
  const whereRanges = selectedRangesWhere(passages);
  const surahList = [...new Set(passages.map((p) => Number(p.surah)).filter(Boolean))].join(',');

  const tasks = query(LEGACY_DB, `
    SELECT
      task_id,
      unit_id,
      parent_task_id,
      task_type,
      task_name,
      step_no,
      status,
      task_json,
      created_at,
      updated_at
    FROM ar_container_unit_task
    WHERE unit_id IN (${passages.map((p) => sqlString(p.id)).join(',')})
    ORDER BY unit_id, COALESCE(step_no, 99999), task_id
  `);

  const surahs = query(LEGACY_DB, `
    SELECT
      s.surah,
      s.name_ar,
      s.name_en,
      s.ayah_count,
      s.meta_json,
      s.revelation_place,
      s.revelation_order,
      COALESCE(s.juz_start, MIN(a.juz)) AS juz_start,
      s.name_transliteration,
      MIN(a.page) AS page_start
    FROM ar_quran_surahs s
    LEFT JOIN ar_quran_ayah a ON a.surah = s.surah AND a.ayah = 1
    WHERE s.surah IN (${surahList})
    GROUP BY s.surah
    ORDER BY s.surah
  `);

  const ayahs = query(LEGACY_DB, `
    SELECT
      id,
      surah,
      ayah,
      page,
      juz,
      text,
      text_simple,
      text_uthmani_clean,
      text_bare,
      verse_mark
    FROM ar_quran_ayah
    WHERE ${whereRanges}
    ORDER BY surah, ayah
  `);

  const translations = query(LEGACY_DB, `
    SELECT
      surah,
      ayah,
      translation_haleem,
      footnotes_haleem,
      translation_asad,
      translation_sahih
    FROM ar_quran_translations
    WHERE ${whereRanges}
    ORDER BY surah, ayah
  `);

  const words = query(LEGACY_DB, `
    SELECT
      word_id,
      surah,
      ayah,
      position,
      text,
      simple,
      root,
      lemma,
      ar_u_morphology
    FROM ar_quran_word_occurrences
    WHERE ${whereRanges}
      AND COALESCE(char_type, 'word') != 'end'
    ORDER BY surah, ayah, position
  `);

  const posByLocation = extractMorphologyPosMap(tasks, passageByUnitId);

  const sql = [];

  sql.push('-- Generated by scripts/migration/backfill_qr_surah_study_runtime.mjs\n');

  sql.push(buildInsert('qr_translation_sources', [
    'id',
    'source_code',
    'translator_name',
    'language',
    'edition',
    'is_default',
  ], Object.values(TRANSLATION_SOURCES).map((src) => ({
    id: sqlString(src.id),
    source_code: sqlString(src.source_code),
    translator_name: sqlString(src.translator_name),
    language: sqlString('en'),
    edition: 'NULL',
    is_default: src.source_code === 'haleem' ? '1' : '0',
  }))));

  sql.push(buildInsert('qr_surahs', [
    'id',
    'name_ar',
    'name_en',
    'name_transliteration',
    'revelation_type',
    'ayah_count',
    'juz_start',
    'page_start',
    'order_revelation',
  ], surahs.map((row) => {
    const meta = parseJson(row.meta_json);
    return {
      id: sqlNumber(row.surah),
      name_ar: sqlString(row.name_ar),
      name_en: sqlString(meta?.nameSimple ?? row.name_en),
      name_transliteration: sqlString(row.name_transliteration ?? row.name_en),
      revelation_type: sqlString(revelationType(row)),
      ayah_count: sqlNumber(row.ayah_count),
      juz_start: sqlNumber(row.juz_start),
      page_start: sqlNumber(row.page_start),
      order_revelation: sqlNumber(row.revelation_order ?? meta?.revelation?.order),
    };
  })));

  sql.push(buildInsert('qr_ayah', [
    'id',
    'surah',
    'ayah',
    'text_uthmani_clean',
    'text_uthmani',
    'text_bare',
    'text',
    'translation',
    'verse_mark',
    'page_number',
  ], ayahs.map((row) => ({
    id: sqlString(`QR:A:${row.surah}:${row.ayah}`),
    surah: sqlNumber(row.surah),
    ayah: sqlNumber(row.ayah),
    text_uthmani_clean: sqlString(row.text_uthmani_clean ?? row.text),
    text_uthmani: sqlString(row.text),
    text_bare: sqlString(row.text_bare ?? row.text_simple),
    text: sqlString(row.text),
    translation: 'NULL',
    verse_mark: sqlString(row.verse_mark),
    page_number: sqlNumber(row.page),
  }))));

  const translationRows = [];
  for (const row of translations) {
    const items = [
      ['haleem', row.translation_haleem, row.footnotes_haleem],
      ['asad', row.translation_asad, null],
      ['sahih', row.translation_sahih, null],
    ];
    for (const [key, text, footnote] of items) {
      if (!text) continue;
      translationRows.push({
        id: sqlString(`QR:TR:${key}:${row.surah}:${row.ayah}`),
        source_id: sqlString(TRANSLATION_SOURCES[key].id),
        surah: sqlNumber(row.surah),
        ayah: sqlNumber(row.ayah),
        translation_text: sqlString(text),
        footnote_md: sqlString(footnote),
      });
    }
  }

  sql.push(buildInsert('qr_translations', [
    'id',
    'source_id',
    'surah',
    'ayah',
    'translation_text',
    'footnote_md',
  ], translationRows));

  sql.push(buildInsert('qr_word_occurrences', [
    'id',
    'surah',
    'ayah',
    'word_index',
    'word_text',
    'word_text_bare',
    'root',
    'lemma',
    'pos',
    'morphology_tag',
  ], words.map((row) => ({
    id: sqlString(`QR:WO:${row.surah}:${row.ayah}:${row.position}`),
    surah: sqlNumber(row.surah),
    ayah: sqlNumber(row.ayah),
    word_index: sqlNumber(row.position),
    word_text: sqlString(row.text),
    word_text_bare: sqlString(row.simple),
    root: sqlString(row.root),
    lemma: sqlString(row.lemma),
    pos: sqlString(posByLocation.get(`${row.surah}:${row.ayah}:${row.position}`) ?? null),
    morphology_tag: sqlString(row.ar_u_morphology),
  }))));

  sql.push(buildInsert('qr_surah_study_passages', [
    'id',
    'surah',
    'passage_no',
    'ayah_from',
    'ayah_to',
    'public_unit_id',
    'public_surah_unit_id',
    'legacy_container_id',
    'legacy_lesson_id',
    'label',
    'title_en',
    'title_ar',
    'subtitle',
    'theme',
    'summary_md',
    'start_ref',
    'end_ref',
    'text_cache',
    'meta_json',
    'status',
    'created_at',
    'updated_at',
  ], passages.map((row) => {
    const meta = parseJson(cleanJsonText(row.meta_json, row));
    return {
      id: sqlString(passageId(row)),
      surah: sqlNumber(row.surah),
      passage_no: sqlNumber(row.order_index),
      ayah_from: sqlNumber(row.ayah_from),
      ayah_to: sqlNumber(row.ayah_to),
      public_unit_id: sqlString(normalizePublicUnitId(row)),
      public_surah_unit_id: sqlString(`U:C:QURAN:${row.surah}`),
      legacy_container_id: sqlString(row.container_id),
      legacy_lesson_id: sqlNumber(row.legacy_lesson_id),
      label: sqlString(meta?.label ?? `Passage ${row.order_index}`),
      title_en: sqlString(meta?.title ?? row.lesson_title),
      title_ar: sqlString(meta?.title_ar ?? row.lesson_title_ar),
      subtitle: sqlString(meta?.subtitle),
      theme: sqlString(meta?.theme),
      summary_md: sqlString(meta?.summary ?? meta?.summary_md),
      start_ref: sqlString(row.start_ref),
      end_ref: sqlString(row.end_ref),
      text_cache: sqlString(row.text_cache),
      meta_json: sqlString(cleanJsonText(row.meta_json, row)),
      status: sqlString(row.status ?? 'draft'),
      created_at: sqlString(row.created_at),
      updated_at: sqlString(row.updated_at),
    };
  })));

  const rootTasks = new Map(tasks.filter((task) => !task.parent_task_id).map((task) => [task.task_id, task]));
  const stepRowsById = new Map();
  for (const task of tasks) {
    const passage = passageByUnitId.get(task.unit_id);
    if (!passage) continue;
    const root = task.parent_task_id ? rootTasks.get(task.parent_task_id) : task;
    const stepKey = root?.task_type ?? task.task_type;
    const id = stepId(passage, stepKey);
    if (stepRowsById.has(id)) continue;
    stepRowsById.set(id, {
      id: sqlString(id),
      passage_id: sqlString(passageId(passage)),
      step_key: sqlString(stepKey),
      step_no: sqlNumber(root?.step_no ?? task.step_no ?? 99000),
      title: sqlString(root?.task_name ?? task.task_name ?? stepKey),
      title_ar: 'NULL',
      intro_task_id: sqlString(root?.task_id ?? task.task_id),
      status: sqlString(root?.status ?? task.status ?? 'draft'),
      meta_json: 'NULL',
      created_at: sqlString(root?.created_at ?? task.created_at),
      updated_at: sqlString(root?.updated_at ?? task.updated_at),
    });
  }

  sql.push(buildInsert('qr_surah_study_steps', [
    'id',
    'passage_id',
    'step_key',
    'step_no',
    'title',
    'title_ar',
    'intro_task_id',
    'status',
    'meta_json',
    'created_at',
    'updated_at',
  ], [...stepRowsById.values()]));

  sql.push(
    `DELETE FROM qr_surah_study_task_json_chunks WHERE passage_id IN (${passages.map((p) => sqlString(passageId(p))).join(',')});\n\n`,
  );

  const taskRows = [];
  const chunkRows = [];
  for (const task of tasks) {
    const passage = passageByUnitId.get(task.unit_id);
    const root = task.parent_task_id ? rootTasks.get(task.parent_task_id) : task;
    const cleanedTaskJson = cleanJsonText(task.task_json, passage);
    const shouldChunk = cleanedTaskJson && cleanedTaskJson.length > TASK_JSON_INLINE_LIMIT;

    taskRows.push({
      id: sqlString(task.task_id),
      passage_id: sqlString(passageId(passage)),
      step_id: sqlString(stepId(passage, root?.task_type ?? task.task_type)),
      parent_task_id: sqlString(task.parent_task_id),
      public_task_id: sqlString(task.task_id),
      task_type: sqlString(task.task_type),
      task_name: sqlString(task.task_name),
      step_no: sqlNumber(task.step_no),
      status: sqlString(task.status ?? 'draft'),
      task_json: shouldChunk ? 'NULL' : sqlString(cleanedTaskJson),
      source_id: sqlString(task.task_id),
      created_at: sqlString(task.created_at),
      updated_at: sqlString(task.updated_at),
    });

    if (shouldChunk) {
      for (let offset = 0, index = 0; offset < cleanedTaskJson.length; offset += TASK_JSON_CHUNK_SIZE, index += 1) {
        chunkRows.push({
          task_id: sqlString(task.task_id),
          passage_id: sqlString(passageId(passage)),
          chunk_index: sqlNumber(index),
          chunk_text: sqlString(cleanedTaskJson.slice(offset, offset + TASK_JSON_CHUNK_SIZE)),
        });
      }
    }
  }

  sql.push(buildInsertStatements('qr_surah_study_tasks', [
    'id',
    'passage_id',
    'step_id',
    'parent_task_id',
    'public_task_id',
    'task_type',
    'task_name',
    'step_no',
    'status',
    'task_json',
    'source_id',
    'created_at',
    'updated_at',
  ], taskRows));

  sql.push(buildInsertStatements('qr_surah_study_task_json_chunks', [
    'task_id',
    'passage_id',
    'chunk_index',
    'chunk_text',
  ], chunkRows));

  const finalSql = sql.join('');
  executeSqlFile(finalSql);

  console.log(`Passages: ${passages.length}`);
  console.log(`Tasks: ${tasks.length}`);
  console.log(`Surahs: ${surahs.length}`);
  console.log(`Ayahs: ${ayahs.length}`);
  console.log(`Translations: ${translationRows.length}`);
  console.log(`Word occurrences: ${words.length}`);
  console.log(`Task JSON chunks: ${chunkRows.length}`);
  console.log('Backfill complete.');
}

main();
