#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const QR_DB = 'km_quran';
const AL_DB = 'km_arabic_linguistic';
const QR_CWD = new URL('../workers/quran/', import.meta.url);
const AL_CWD = new URL('../workers/ar-linguistics/', import.meta.url);
const SQLITE_PATH = new URL('../km_arabic_linguistic/ingestion/Irrab/al-jadwal-fi-i-rab-al-quran.db', import.meta.url).pathname;
const APPLY = process.argv.includes('--apply');
const SOURCE_SLUG = 'mahmud_safi_jadwal_irab';
const SOURCE_ID = 'QR:WORK:MAHMUD_SAFI:JADWAL_IRAB';
const SOURCE_TITLE = 'الجدول في إعراب القرآن';

const CORE_MAP = new Map([
  ['مبتدأ', 'AL:nahw:mubtada'],
  ['خبر', 'AL:nahw:khabar'],
  ['فاعل', 'AL:nahw:fail'],
  ['نائب فاعل', 'AL:nahw:naib_fail'],
  ['مفعول به', 'AL:nahw:mafoul_bihi'],
  ['مفعول مطلق', 'AL:nahw:mafoul_mutlaq'],
  ['مفعول فيه', 'AL:nahw:mafoul_fih'],
  ['مفعول لأجله', 'AL:nahw:mafoul_liajlih'],
  ['مفعول معه', 'AL:nahw:mafoul_maah'],
  ['مضاف إليه', 'AL:nahw:mudaf_ilayh'],
  ['نعت', 'AL:nahw:naat'],
  ['بدل', 'AL:nahw:badal'],
  ['عطف', 'AL:nahw:atf'],
  ['توكيد', 'AL:nahw:tawkid'],
  ['حال', 'AL:nahw:hal'],
  ['تمييز', 'AL:nahw:tamyiz'],
  ['مستثنى', 'AL:nahw:mustathna'],
  ['منادى', 'AL:nahw:munada'],
  ['جار ومجرور', 'AL:nahw:jar_majrur'],
  ['ظرف', 'AL:nahw:zarf'],
  ['متعلق', 'AL:nahw:mutaalliq'],
  ['صلة الموصول', 'AL:nahw:silat_al_mawsul'],
  ['جواب الشرط', 'AL:nahw:jawab_al_shart'],
  ['جواب القسم', 'AL:nahw:jawab_al_qasam'],
  ['جواب النداء', 'AL:nahw:jawab_al_nida'],
  ['لا محل لها', 'AL:nahw:la_mahalla_laha'],
  ['في محل رفع', 'AL:nahw:fi_mahall_raf'],
  ['في محل نصب', 'AL:nahw:fi_mahall_nasb'],
  ['في محل جر', 'AL:nahw:fi_mahall_jarr'],
  ['في محل جزم', 'AL:nahw:fi_mahall_jazm'],
]);

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
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
    if (!result.success) throw new Error(`D1 command failed: ${command}`);
  }
  return parsed.at(-1)?.results ?? [];
}

function sqliteRows() {
  const out = execFileSync('sqlite3', [
    '-json',
    SQLITE_PATH,
    'SELECT ayah_key, group_ayah_key, from_ayah, to_ayah, ayah_keys, text FROM tafsir ORDER BY ayah_key',
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 });
  return JSON.parse(out || '[]');
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function irabSection(text) {
  const clean = stripHtml(text);
  const start = clean.indexOf('* الإعراب:');
  if (start < 0) return clean;
  const rest = clean.slice(start).replace('* الإعراب:', '').trim();
  const next = rest.search(/\*\s*(الصرف|البلاغة|الفوائد|اللغة):/);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

function normalizeArabic(value) {
  return String(value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[()[\]«»".،:؛]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAyah(key) {
  const [s, a] = String(key ?? '').split(':').map((part) => Number(part));
  return { surah: Number.isFinite(s) ? s : null, ayah: Number.isFinite(a) ? a : null };
}

function extractRole(text) {
  const norm = normalizeArabic(text);
  const entries = [...CORE_MAP.keys()].sort((a, b) => b.length - a.length);
  for (const label of entries) {
    if (norm.includes(normalizeArabic(label))) return label;
  }
  return null;
}

function typedRefFor(label, conceptRowsByLabel) {
  if (!label) return null;
  const norm = normalizeArabic(label);
  return conceptRowsByLabel.get(norm) ?? CORE_MAP.get(label) ?? null;
}

function batchSql(statements, size = 100) {
  const chunks = [];
  for (let i = 0; i < statements.length; i += size) chunks.push(statements.slice(i, i + size).join(';\n') + ';');
  return chunks;
}

const conceptRows = d1(AL_DB, AL_CWD, 'SELECT id, concept_name_ar, irab_label FROM ar_ling_nahw_concepts');
const conceptRowsByLabel = new Map();
for (const row of conceptRows) {
  for (const value of [row.concept_name_ar, row.irab_label]) {
    const norm = normalizeArabic(value);
    if (norm) conceptRowsByLabel.set(norm, row.id);
  }
}

const rows = sqliteRows().map((row) => {
  const section = irabSection(row.text);
  const role = extractRole(section);
  const ref = typedRefFor(role, conceptRowsByLabel);
  const { surah, ayah } = parseAyah(row.ayah_key);
  return {
    ...row,
    id: `QR:IRAB:JADWAL:${row.ayah_key}`,
    section,
    role,
    role_norm: normalizeArabic(role),
    ref,
    status: ref ? 'mapped' : 'unmapped',
    confidence: ref ? 0.86 : null,
    note: ref ? 'Mapped by core iʿrāb label seed.' : 'No AL nahw concept matched extracted iʿrāb role.',
    surah,
    ayah,
  };
});

const summary = {
  apply: APPLY,
  source: SQLITE_PATH,
  rows: rows.length,
  mapped: rows.filter((row) => row.ref).length,
  unmapped: rows.filter((row) => !row.ref).length,
  sample: rows.slice(0, 5).map((row) => ({
    ayah_key: row.ayah_key,
    role: row.role,
    ref: row.ref,
    status: row.status,
    sample: row.section.slice(0, 120),
  })),
};
console.log(JSON.stringify(summary, null, 2));

if (APPLY) {
  d1(QR_DB, QR_CWD, `
    DELETE FROM qr_tafsir_entries
    WHERE work_id IN (${sql(SOURCE_ID)}, 'QR:WORK:JADWAL_IRAB', 'JADWAL_IRAB')
       OR content_ar LIKE '%* الإعراب:%'
  `);

  const statements = rows.map((row) => `INSERT INTO qr_irab_book_entries (
      id, source_id, source_slug, source_title, ayah_key, group_ayah_key,
      from_ayah, to_ayah, ayah_keys, surah, ayah_from, ayah_to,
      entry_html, irab_text, grammar_role_ar, grammar_role_norm,
      grammar_concept_ref, syntax_relation_ref, case_concept_ref, mahal_concept_ref,
      al_mapping_status, al_mapping_confidence, al_mapping_note, updated_at
    ) VALUES (
      ${sql(row.id)}, ${sql(SOURCE_ID)}, ${sql(SOURCE_SLUG)}, ${sql(SOURCE_TITLE)},
      ${sql(row.ayah_key)}, ${sql(row.group_ayah_key)}, ${sql(row.from_ayah)},
      ${sql(row.to_ayah)}, ${sql(row.ayah_keys)}, ${sql(row.surah)}, ${sql(row.ayah)},
      ${sql(row.ayah)}, ${sql(row.text)}, ${sql(row.section)}, ${sql(row.role)},
      ${sql(row.role_norm)}, ${sql(row.ref)}, NULL, NULL,
      ${row.ref?.startsWith('AL:nahw:fi_mahall') || row.ref === 'AL:nahw:la_mahalla_laha' ? sql(row.ref.replace('AL:nahw:', 'AL:mahal:')) : 'NULL'},
      ${sql(row.status)}, ${sql(row.confidence)}, ${sql(row.note)}, datetime('now')
    )
    ON CONFLICT(source_slug, ayah_key) DO UPDATE SET
      source_id = excluded.source_id,
      source_title = excluded.source_title,
      group_ayah_key = excluded.group_ayah_key,
      from_ayah = excluded.from_ayah,
      to_ayah = excluded.to_ayah,
      ayah_keys = excluded.ayah_keys,
      surah = excluded.surah,
      ayah_from = excluded.ayah_from,
      ayah_to = excluded.ayah_to,
      entry_html = excluded.entry_html,
      irab_text = excluded.irab_text,
      grammar_role_ar = excluded.grammar_role_ar,
      grammar_role_norm = excluded.grammar_role_norm,
      grammar_concept_ref = excluded.grammar_concept_ref,
      mahal_concept_ref = excluded.mahal_concept_ref,
      al_mapping_status = excluded.al_mapping_status,
      al_mapping_confidence = excluded.al_mapping_confidence,
      al_mapping_note = excluded.al_mapping_note,
      updated_at = datetime('now')`);

  for (const chunk of batchSql(statements, 75)) d1(QR_DB, QR_CWD, chunk);
  const check = d1(QR_DB, QR_CWD, `
    SELECT COUNT(*) AS rows,
           SUM(CASE WHEN al_mapping_status='mapped' THEN 1 ELSE 0 END) AS mapped,
           SUM(CASE WHEN al_mapping_status='unmapped' THEN 1 ELSE 0 END) AS unmapped
    FROM qr_irab_book_entries
    WHERE source_slug=${sql(SOURCE_SLUG)}
  `);
  console.log(JSON.stringify({ imported: check[0] }, null, 2));
}
