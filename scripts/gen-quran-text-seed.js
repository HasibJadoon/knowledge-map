const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dataDir = path.join(__dirname, '..', 'database', 'data', 'tarteel.ai');
const metaDir = path.join(dataDir, 'quran-meta');
const simpleSql = path.join(metaDir, 'quran-simple-clean.sql');
const insertsSql = path.join(metaDir, 'quran_text_inserts.sql');
const versesDb = path.join(metaDir, 'quran-metadata-ayah.sqlite');
const chaptersDb = path.join(metaDir, 'quran-metadata-surah-name.sqlite');
const surahInfoDb = path.join(metaDir, 'surah-info-en.db');
const juzDb = path.join(metaDir, 'quran-metadata-juz.sqlite');
const hizbDb = path.join(metaDir, 'quran-metadata-hizb.sqlite');
const rukuDb = path.join(metaDir, 'quran-metadata-ruku.sqlite');
const themesDb = path.join(metaDir, 'ayah-themes.db');
const matchingDb = path.join(metaDir, 'matching-ayah.db');

const seedDir = path.join(__dirname, '..', 'database', 'seeds');
const outQuranSql = path.join(seedDir, 'seed-ar_quran_ayah.sql');
const outSurahSql = path.join(seedDir, 'seed-ar_quran_surahs.sql');
const outMetaSql = path.join(seedDir, 'seed-ar_quran_surah_ayah_meta.sql');

const tmpDir = path.join(os.tmpdir(), 'kmap-quran');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(seedDir, { recursive: true });
const insertsDb = path.join(tmpDir, 'quran_inserts.db');

const runSqlite = (dbPath, commands) => {
  execSync(`sqlite3 "${dbPath}"`, {
    input: commands,
    stdio: ['pipe', 'inherit', 'inherit'],
    maxBuffer: 1024 * 1024 * 64,
  });
};

const querySqlite = (dbPath, sql) => {
  const result = execSync(`sqlite3 "${dbPath}"`, {
    input: `.mode json
${sql}
`,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  return JSON.parse(result || '[]');
};

const escapeValue = (value) =>
  value === null || value === undefined
    ? 'NULL'
    : `'${String(value).replace(/'/g, "''")}'`;

const normalize = (text) =>
  (text ?? '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const parseRange = (rangeString) => {
  if (!rangeString) return [];
  return rangeString
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.includes('-')) {
        const [from, to] = chunk.split('-').map((val) => Number(val.trim()));
        return { start: Number.isNaN(from) ? null : from, end: Number.isNaN(to) ? null : to };
      }
      const num = Number(chunk.trim());
      return { start: Number.isNaN(num) ? null : num, end: Number.isNaN(num) ? null : num };
    })
    .filter((range) => range.start !== null && range.end !== null);
};

const buildPartitionMap = (rows, keyField, partitionField) => {
  const map = new Map();
  rows.forEach((row) => {
    const partitionId = row[partitionField];
    if (!partitionId) return;
    let mapping;
    try {
      mapping = JSON.parse(row.verse_mapping);
    } catch (err) {
      return;
    }
    Object.entries(mapping).forEach(([surahText, rangeString]) => {
      const surah = Number(surahText);
      if (Number.isNaN(surah)) return;
      const ranges = parseRange(rangeString);
      ranges.forEach(({ start, end }) => {
        for (let aya = start; aya <= end; aya += 1) {
          map.set(`${surah}:${aya}`, partitionId);
        }
      });
    });
  });
  return map;
};

const parseThemes = (rows) => {
  const themes = new Map();
  rows.forEach((row) => {
    const { theme, surah_number, ayah_from, ayah_to, keywords, total_ayahs } = row;
    if (!surah_number || !ayah_from || !ayah_to) return;
    const entry = {
      theme,
      keywords,
      surah: surah_number,
      from: ayah_from,
      to: ayah_to,
      totalAyahs: total_ayahs,
    };
    for (let aya = ayah_from; aya <= ayah_to; aya += 1) {
      const key = `${surah_number}:${aya}`;
      const existing = themes.get(key) || [];
      existing.push(entry);
      themes.set(key, existing);
    }
  });
  return themes;
};

const safeJsonParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

const buildMatchingMap = (rows) => {
  const map = new Map();
  const addEntry = (verseKey, entry) => {
    const existing = map.get(verseKey) || [];
    existing.push(entry);
    map.set(verseKey, existing);
  };
  rows.forEach((row) => {
    const {
      verse_key,
      matched_ayah_key,
      matched_words_count,
      coverage,
      score,
      match_words_range,
    } = row;
    if (!verse_key || !matched_ayah_key) return;
    const baseEntry = {
      coverage: toNumber(coverage),
      score: toNumber(score),
      words: toNumber(matched_words_count),
      matchRange: safeJsonParse(match_words_range),
    };
    addEntry(verse_key, {
      ...baseEntry,
      direction: 'outgoing',
      source: verse_key,
      target: matched_ayah_key,
    });
    addEntry(matched_ayah_key, {
      ...baseEntry,
      direction: 'incoming',
      source: matched_ayah_key,
      target: verse_key,
    });
  });
  return map;
};

const run = () => {
  runSqlite(
    insertsDb,
    `DROP TABLE IF EXISTS quran_text;
CREATE TABLE quran_text (
  sura INTEGER,
  aya INTEGER,
  surah_ayah INTEGER,
  page INTEGER,
  juz INTEGER,
  hizb INTEGER,
  ruku INTEGER,
  surah_name TEXT,
  surah_verse TEXT,
  verse_mark TEXT,
  text TEXT,
  text_simple TEXT,
  text_normalized TEXT,
  first_word TEXT,
  last_word TEXT,
  word_count INTEGER,
  char_count INTEGER
);
.read "${insertsSql}"
`,
  );

  const insertsRows = querySqlite(insertsDb, 'SELECT * FROM quran_text;');
  const simpleContent = fs.readFileSync(simpleSql, 'utf8');
  const versesRows = querySqlite(versesDb, 'SELECT surah_number, ayah_number, text FROM verses;');
  const chaptersRows = querySqlite(chaptersDb, 'SELECT * FROM chapters;');
  const surahInfos = querySqlite(surahInfoDb, 'SELECT * FROM surah_infos;');
  const juzRows = querySqlite(juzDb, 'SELECT * FROM juz;');
  const hizbRows = querySqlite(hizbDb, 'SELECT * FROM hizbs;');
  const rukuRows = querySqlite(rukuDb, 'SELECT * FROM ruku;');
  const themesRows = querySqlite(themesDb, 'SELECT * FROM themes;');
  const matchingRows = querySqlite(matchingDb, 'SELECT * FROM similar_ayahs;');

  const simpleMap = new Map();
  const tupleRegex = /\(\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:''|[^'])*)'\s*\)/g;
  let tupleMatch;
  while ((tupleMatch = tupleRegex.exec(simpleContent)) !== null) {
    const sura = tupleMatch[1];
    const aya = tupleMatch[2];
    const text = tupleMatch[3].replace(/''/g, "'");
    simpleMap.set(`${sura}:${aya}`, text.trim());
  }

  const versesMap = new Map(
    versesRows.map((row) => [
      `${row.surah_number}:${row.ayah_number}`,
      { text: row.text?.trim() ?? '' },
    ]),
  );
  const chapterMap = new Map(chaptersRows.map((row) => [row.id, row]));
  const surahInfoMap = new Map(surahInfos.map((row) => [row.surah_number, row]));

  const juzMap = buildPartitionMap(juzRows, 'verse_mapping', 'juz_number');
  const hizbMap = buildPartitionMap(hizbRows, 'verse_mapping', 'hizb_number');
  const rukuMap = buildPartitionMap(rukuRows, 'verse_mapping', 'ruku_number');

  const themeMap = parseThemes(themesRows);
  const matchingMap = buildMatchingMap(matchingRows);

  const enrichedRows = insertsRows.map((row) => {
    const key = `${row.sura}:${row.aya}`;
    const cleanText = simpleMap.get(key) || '';
    const verseRecord = versesMap.get(key);
    const diacriticText = verseRecord?.text || row.text;
    const verseFull = verseRecord?.text || row.verse_mark;
    const chapter = chapterMap.get(row.sura);
    const surahInfo = surahInfoMap.get(row.sura);
    return {
      ...row,
      verse_key: key,
      surah_name_en: chapter?.name || surahInfo?.surah_name || null,
      surah_short_text: surahInfo?.short_text || null,
      text: diacriticText,
      text_simple: cleanText || row.text_simple || row.text,
      text_normalized:
        normalize(cleanText) ||
        normalize(row.text_normalized) ||
        normalize(row.text_simple) ||
        normalize(row.text),
      text_diacritics: diacriticText,
      text_non_diacritics: cleanText || row.text_simple || row.text,
      verse_full: verseFull || row.verse_mark,
      verbatim: row.text,
      juz: juzMap.get(key) || null,
      hizb: hizbMap.get(key) || null,
      ruku: rukuMap.get(key) || null,
    };
  });

  const quranColumns = [
    'surah',
    'ayah',
    'surah_ayah',
    'page',
    'juz',
    'hizb',
    'ruku',
    'surah_name_ar',
    'surah_name_en',
    'text',
    'text_simple',
    'text_normalized',
    'text_diacritics',
    'text_no_diacritics',
    'first_word',
    'last_word',
    'word_count',
    'char_count',
    'verse_mark',
    'verse_full',
  ];

  const quranStatements = enrichedRows
    .map((row) => {
      const transformed = {
        surah: row.sura,
        ayah: row.aya,
        surah_ayah: row.surah_ayah,
        page: row.page,
        juz: row.juz,
        hizb: row.hizb,
        ruku: row.ruku,
        surah_name_ar: row.surah_name,
        surah_name_en: row.surah_name_en,
        text: row.text,
        text_simple: row.text_simple,
        text_normalized: row.text_normalized,
        text_diacritics: row.text_diacritics,
        text_no_diacritics: row.text_non_diacritics,
        first_word: row.first_word,
        last_word: row.last_word,
        word_count: row.word_count,
        char_count: row.char_count,
        verse_mark: row.verse_mark,
        verse_full: row.verse_full,
      };
      const vals = quranColumns.map((col) => escapeValue(transformed[col] ?? null));
      return `INSERT INTO ar_quran_ayah (${quranColumns.join(', ')}) VALUES (${vals.join(', ')});`;
    })
    .join('\n');

  const quranSql = `DELETE FROM ar_quran_ayah;\n${quranStatements}\n`;
  fs.writeFileSync(outQuranSql, quranSql);
  console.log(`Wrote ${enrichedRows.length} rows to ${outQuranSql}`);

  const surahRows = chaptersRows
    .map((chapterRow) => {
      const info = surahInfoMap.get(chapterRow.id);
      const meta = {
        nameSimple: chapterRow.name_simple,
        revelation: {
          order: chapterRow.revelation_order,
          place: chapterRow.revelation_place,
          bismillahPre: chapterRow.bismillah_pre === 1,
        },
        description: info?.text,
        shortText: info?.short_text,
      };
      return {
        surah: chapterRow.id,
        name_ar: chapterRow.name_arabic,
        name_en: chapterRow.name,
        ayah_count: chapterRow.verses_count,
        meta_json: JSON.stringify(meta),
      };
    })
    .filter((row) => row.surah);

  const surahStatements = surahRows
    .map((row) =>
      `INSERT INTO ar_quran_surahs (surah, name_ar, name_en, ayah_count, meta_json) VALUES (${[
        escapeValue(row.surah),
        escapeValue(row.name_ar),
        escapeValue(row.name_en),
        escapeValue(row.ayah_count),
        escapeValue(row.meta_json),
      ].join(', ')});`,
    )
    .join('\n');

  const surahSql = `DELETE FROM ar_quran_surahs;\n${surahStatements}\n`;
  fs.writeFileSync(outSurahSql, surahSql);
  console.log(`Wrote ${surahRows.length} rows to ${outSurahSql}`);

  const metaStatements = enrichedRows
    .map((row) => {
      const themeList = themeMap.get(row.verse_key) || [];
      const matchList = matchingMap.get(row.verse_key) || [];
      const keywords = [...new Set(
        themeList
          .flatMap((theme) => theme.keywords?.split(',')?.map((keyword) => keyword.trim()).filter(Boolean) ?? []),
      )].join(', ');
      const themeNames = themeList.map((theme) => theme.theme).filter(Boolean);
      const matchingScoreAvg =
        matchList.length > 0
          ? matchList.reduce((sum, match) => sum + (match.score || 0), 0) / matchList.length
          : null;
      const extra = {
        themeCount: themeList.length,
        matchingCount: matchList.length,
        matchingScoreAvg,
      };
      return `INSERT INTO ar_quran_surah_ayah_meta (surah_ayah, theme, keywords, theme_json, matching_json, extra_json) VALUES (${[
        escapeValue(row.surah_ayah),
        escapeValue(themeNames.length ? themeNames.join(' | ') : null),
        escapeValue(keywords || null),
        escapeValue(JSON.stringify(themeList.length ? themeList : [])),
        escapeValue(JSON.stringify(matchList)),
        escapeValue(JSON.stringify(extra)),
      ].join(', ')});`;
    })
    .join('\n');

  const metaSql = `DELETE FROM ar_quran_surah_ayah_meta;\n${metaStatements}\n`;
  fs.writeFileSync(outMetaSql, metaSql);
  console.log(`Wrote ${enrichedRows.length} rows to ${outMetaSql}`);
};

run();
