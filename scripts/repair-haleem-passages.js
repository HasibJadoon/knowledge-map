const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'database', 'd1.db');
const outSql = path.join(__dirname, '..', 'database', 'migrations', 'repair-ar_quran_translation_passages.sql');
const sourceKey = 'haleem-2004';

function runSqlite(query) {
  const cmd = `sqlite3 "${dbPath}" ".mode list" ".separator |" "${query.replace(/"/g, '""')}"`;
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function loadTranslationsBySurah() {
  const raw = runSqlite(
    `SELECT surah, ayah, translation_haleem FROM ar_quran_translations ORDER BY surah, ayah ASC`
  );
  const bySurah = new Map();
  if (!raw) return bySurah;
  for (const line of raw.split('\n')) {
    const [surahStr, ayahStr, text] = line.split('|');
    const surah = Number(surahStr);
    const ayah = Number(ayahStr);
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    bySurah.get(surah).push({ ayah, text: (text ?? '').trim() });
  }
  return bySurah;
}

function buildPassageText(rows, from, to) {
  return rows
    .filter((row) => row.ayah >= from && row.ayah <= to)
    .map((row) => row.text)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMeta(meta) {
  if (!meta) return {};
  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
}

function loadPassageGroups() {
  const raw = runSqlite(
    `SELECT id, surah, passage_index, page_pdf, page_book, meta_json FROM ar_quran_translation_passages WHERE source_key = '${sourceKey}' ORDER BY surah, passage_index, page_pdf, id`
  );
  const groupsBySurah = new Map();
  if (!raw) return groupsBySurah;
  for (const line of raw.split('\n')) {
    const [idStr, surahStr, passageIndexStr, pagePdfStr, pageBookStr, metaJson] = line.split('|');
    const surah = Number(surahStr);
    const passageIndex = Number(passageIndexStr);
    const pagePdf = pagePdfStr ? Number(pagePdfStr) : null;
    const pageBook = pageBookStr ? Number(pageBookStr) : null;
    const meta = parseMeta(metaJson);

    if (!groupsBySurah.has(surah)) groupsBySurah.set(surah, new Map());
    const key = pagePdf ?? `idx:${passageIndex}`;
    const surahGroupMap = groupsBySurah.get(surah);
    if (!surahGroupMap.has(key)) {
      surahGroupMap.set(key, {
        key,
        page_pdf: pagePdf,
        page_book: pageBook,
        header_ayah: meta?.header_ayah ?? null,
        order: passageIndex,
      });
    } else {
      const existing = surahGroupMap.get(key);
      if (existing.page_book == null && pageBook != null) existing.page_book = pageBook;
      if (existing.header_ayah == null && meta?.header_ayah != null) existing.header_ayah = meta.header_ayah;
      existing.order = Math.min(existing.order, passageIndex);
    }
  }
  return groupsBySurah;
}

function allocateRanges(groups, maxAyah) {
  const startHints = new Array(groups.length).fill(null);
  let lastHint = 0;
  for (let i = 0; i < groups.length; i += 1) {
    const hint = Number(groups[i].header_ayah);
    if (Number.isFinite(hint) && hint >= 1 && hint <= maxAyah && hint > lastHint) {
      startHints[i] = hint;
      lastHint = hint;
    }
  }

  const ranges = [];
  let prevEnd = 0;
  for (let i = 0; i < groups.length; i += 1) {
    const hint = startHints[i];
    const start = hint ?? prevEnd + 1;
    if (start > maxAyah) break;

    let end = maxAyah;
    let nextHintIndex = -1;
    for (let j = i + 1; j < groups.length; j += 1) {
      if (startHints[j] != null) {
        nextHintIndex = j;
        break;
      }
    }

    if (nextHintIndex !== -1) {
      end = Math.min(maxAyah, startHints[nextHintIndex] - 1);
    } else if (i < groups.length - 1) {
      const remainingGroups = groups.length - i;
      const remainingAyahs = maxAyah - start + 1;
      const base = Math.floor(remainingAyahs / remainingGroups);
      const extra = remainingAyahs % remainingGroups;
      const length = base + (extra > 0 ? 1 : 0);
      end = Math.min(maxAyah, start + Math.max(1, length) - 1);
    }

    if (end < start) end = start;
    ranges.push({ start, end });
    prevEnd = end;
  }

  if (ranges.length && ranges[ranges.length - 1].end < maxAyah) {
    ranges[ranges.length - 1].end = maxAyah;
  }

  return ranges;
}

(function main() {
  const translationsBySurah = loadTranslationsBySurah();
  const groupsBySurah = loadPassageGroups();
  const inserts = [];

  for (const [surah, groupsMap] of groupsBySurah.entries()) {
    const rows = translationsBySurah.get(surah);
    if (!rows || !rows.length) continue;
    const maxAyah = rows[rows.length - 1].ayah;

    const groups = Array.from(groupsMap.values()).sort((a, b) => {
      const aKey = a.page_pdf ?? Number.MAX_SAFE_INTEGER;
      const bKey = b.page_pdf ?? Number.MAX_SAFE_INTEGER;
      if (aKey !== bKey) return aKey - bKey;
      return a.order - b.order;
    });

    const ranges = allocateRanges(groups, maxAyah);
    for (let i = 0; i < ranges.length; i += 1) {
      const group = groups[i];
      const range = ranges[i];
      const text = buildPassageText(rows, range.start, range.end);
      inserts.push({
        source_key: sourceKey,
        surah,
        ayah_from: range.start,
        ayah_to: range.end,
        passage_index: i + 1,
        page_pdf: group?.page_pdf ?? null,
        page_book: group?.page_book ?? null,
        text,
        meta_json: { header_ayah: group?.header_ayah ?? null },
      });
    }
  }

  const lines = [
    `DELETE FROM ar_quran_translation_passages WHERE source_key = '${sourceKey}';`,
    ...inserts.map((row) =>
      `INSERT INTO ar_quran_translation_passages (source_key, surah, ayah_from, ayah_to, passage_index, page_pdf, page_book, text, meta_json) VALUES (` +
        [
          row.source_key,
          row.surah,
          row.ayah_from,
          row.ayah_to,
          row.passage_index,
          row.page_pdf ?? null,
          row.page_book ?? null,
          row.text ?? null,
          JSON.stringify(row.meta_json),
        ]
          .map((val) => (val == null ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`))
          .join(', ') +
        `);`
    ),
  ];

  fs.writeFileSync(outSql, lines.join('\n') + '\n');
  console.log(`Wrote ${outSql} with ${inserts.length} passages.`);
})();
