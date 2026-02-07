const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pdfPath = path.join(__dirname, '..', 'notes', 'resources', 'TheQuran-ANewTranslation.pdf');
const outSourcesSql = path.join(__dirname, '..', 'database', 'migrations', 'seed-ar_quran_translation_sources.sql');
const outPassagesSql = path.join(__dirname, '..', 'database', 'migrations', 'seed-ar_quran_translation_passages.sql');
const outFootnotesSql = path.join(
  __dirname,
  '..',
  'database',
  'migrations',
  'seed-ar_quran_translation_footnotes_haleem.sql'
);
const dbPath = path.join(__dirname, '..', 'database', 'd1.db');

const sourceKey = 'haleem-2004';
const sourceMeta = {
  title: 'The Qur\u2019an: A New Translation',
  translator: 'M. A. S. Abdel Haleem',
  language: 'en',
  publisher: 'Oxford University Press',
  year: 2004,
  isbn: '0-19-283193-3',
  edition: 'Oxford World\u2019s Classics (paperback, 2005)',
  rights: '\u00a9 M. A. S. Abdel Haleem 2004, 2005',
  source_path: pdfPath,
  meta_json: {
    series: 'Oxford World\u2019s Classics',
    source_file: path.basename(pdfPath),
  },
};

const yTolerance = 2.0;
const footnoteRegionRatio = 0.32;
const LIGATURE_PREFIX_STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'for',
  'you',
  'your',
  'our',
  'all',
  'any',
  'his',
  'her',
  'was',
  'are',
  'not',
  'nor',
  'who',
  'but',
  'yet',
  'one',
  'two',
  'three',
  'four',
  'five',
  'in',
  'on',
  'at',
  'by',
  'of',
  'to',
  'up',
  'out',
]);

function runSqlite(query) {
  const cmd = `sqlite3 "${dbPath}" ".mode list" ".separator |" "${query.replace(/"/g, '""')}"`;
  return execSync(cmd, { encoding: 'utf8' });
}

function loadSurahCounts() {
  const raw = runSqlite(
    'SELECT surah, MAX(ayah) AS ayah_count FROM ar_quran_translations GROUP BY surah ORDER BY surah'
  );
  const map = new Map();
  raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const [surah, count] = line.split('|');
      map.set(Number(surah), Number(count));
    });
  return map;
}

const translationCache = new Map();
function loadTranslations(surah) {
  if (translationCache.has(surah)) return translationCache.get(surah);
  const raw = runSqlite(
    `SELECT ayah, translation_haleem FROM ar_quran_translations WHERE surah = ${surah} ORDER BY ayah ASC`
  );
  const rows = raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ayah, text] = line.split('|');
      return { ayah: Number(ayah), text: (text ?? '').trim() };
    });
  translationCache.set(surah, rows);
  return rows;
}

function buildPassageText(surah, from, to) {
  const rows = loadTranslations(surah).filter((row) => row.ayah >= from && row.ayah <= to);
  return rows
    .map((row) => row.text)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function groupLines(items) {
  const lines = [];
  const sorted = items
    .map((item) => ({
      text: String(item.str ?? '').trim(),
      x: item.transform[4],
      y: item.transform[5],
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => (b.y - a.y) || (a.x - b.x));

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (line) {
      line.items.push(item);
      line.y = (line.y + item.y) / 2;
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  return lines
    .map((line) => {
      const text = line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { text, y: line.y };
    })
    .filter((line) => line.text.length > 0);
}

function isFootnoteLine(line) {
  if (/^[a-z](\s+[a-z])+$/.test(line)) return true;
  if (/^[a-z]\s/.test(line)) return true;
  return false;
}

function getFootnoteStartY(lines, viewportHeight) {
  const textLines = lines.filter((line) => {
    const trimmed = line.text.trim();
    if (!/^[a-z]\s+/i.test(trimmed)) return false;
    if (/^[a-z](\s+[a-z])+$/.test(trimmed)) return false;
    return trimmed.split(/\s+/).length >= 3;
  });
  if (textLines.length) {
    return Math.max(...textLines.map((line) => line.y));
  }

  const threshold = viewportHeight * footnoteRegionRatio;
  const markerLines = lines.filter((line) => line.y <= threshold && isFootnoteLine(line.text));
  if (markerLines.length) {
    return Math.max(...markerLines.map((line) => line.y));
  }

  return null;
}

function extractFootnotes(lines, viewportHeight, footnoteStartY) {
  const footnotes = [];
  let current = null;
  const threshold = viewportHeight * footnoteRegionRatio;
  const limitY = footnoteStartY != null ? footnoteStartY : threshold;
  const footnoteLines = lines.filter((line) => line.y <= limitY);

  for (const line of footnoteLines) {
    const text = line.text.trim();
    if (!text) continue;
    if (/^[a-z](\s+[a-z])+$/.test(text)) continue;

    const match = text.match(/^([a-z])\s+(.*)$/);
    if (match) {
      if (current) footnotes.push(current);
      current = { marker: match[1], text: normalizePdfText(match[2].trim()) };
      continue;
    }

    if (current) {
      current.text = normalizePdfText(`${current.text} ${text}`.replace(/\s+/g, ' ').trim());
    }
  }

  if (current) footnotes.push(current);
  return footnotes.map((note) => ({
    ...note,
    text: normalizePdfText(note.text),
  }));
}

function stripFootnoteText(bodyText, footnotes) {
  if (!bodyText || !footnotes?.length) return bodyText;
  let cleaned = normalizePdfText(bodyText);
  const normalizedFootnotes = footnotes.map((note) => ({
    ...note,
    text: normalizePdfText(String(note?.text ?? '')),
  }));

  for (const note of normalizedFootnotes) {
    const noteText = String(note?.text ?? '').trim();
    if (!noteText) continue;
    const escaped = noteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexible = escaped.replace(/\s+/g, '\\s+');
    const noteRegex = new RegExp(flexible, 'gi');
    const markerRegex = new RegExp(`\\s+[a-z]\\s+${flexible}`, 'gi');
    cleaned = cleaned.replace(markerRegex, ' ');
    cleaned = cleaned.replace(noteRegex, ' ');
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

function normalizePdfText(text) {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/\u0002/g, "'");
  cleaned = cleaned.replace(/\u0001/g, '');
  cleaned = cleaned.replace(/[\u0000-\u001f]/g, ' ');
  cleaned = cleaned.replace(/(\w)-\s+(\w)/g, '$1$2');
  cleaned = cleaned.replace(/\b(fi|fl|ff|ffi|ffl)\s+([a-z])/gi, '$1$2');
  cleaned = cleaned.replace(/\b([A-Za-z]{1,3})\s+((?:ff|fi|fl|ffi|ffl)[a-z])/gi, (match, prefix, rest) => {
    if (LIGATURE_PREFIX_STOP.has(prefix.toLowerCase())) {
      return `${prefix} ${rest}`;
    }
    return `${prefix}${rest}`;
  });
  cleaned = cleaned.replace(/(\w)\s*'\s*(\w)/g, "$1'$2");
  cleaned = cleaned.replace(/Qur['’]?\s*an/gi, 'Quran');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function parseHeader(line) {
  let match = line.match(/^(\d+)\s*:\s*(\d+)\s+.*\s+(\d+)$/);
  if (match) {
    return { surah: Number(match[1]), ayah: Number(match[2]), pageBook: Number(match[3]) };
  }
  match = line.match(/^(\d+)\s+The\s+Qur.*\s+(\d+)\s*:\s*(\d+)$/i);
  if (match) {
    return { pageBook: Number(match[1]), surah: Number(match[2]), ayah: Number(match[3]) };
  }
  return null;
}

function chooseRange(numbers, headerAyah) {
  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  if (!unique.length) return null;
  const sequences = [];
  let start = unique[0];
  let prev = unique[0];
  for (let i = 1; i < unique.length; i += 1) {
    const n = unique[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    sequences.push({ from: start, to: prev, len: prev - start + 1 });
    start = n;
    prev = n;
  }
  sequences.push({ from: start, to: prev, len: prev - start + 1 });

  if (headerAyah != null) {
    const withHeader = sequences.filter((seq) => headerAyah >= seq.from && headerAyah <= seq.to);
    if (withHeader.length) {
      withHeader.sort((a, b) => b.len - a.len);
      return withHeader[0];
    }
  }

  sequences.sort((a, b) => b.len - a.len || a.from - b.from);
  return sequences[0];
}

function addFootnoteToVerse(map, ayah, marker, text) {
  if (!ayah || !marker || !text) return;
  const key = `${ayah}`;
  if (!map.has(key)) map.set(key, []);
  const list = map.get(key);
  if (list.some((entry) => entry.marker === marker)) return;
  list.push({ marker, text });
}

function assignFootnotesToVerses(lines, footnotes, range) {
  const result = new Map();
  if (!lines.length || !footnotes.length || !range) return result;

  const markerText = new Map(
    footnotes.map((note) => [String(note.marker).toLowerCase(), String(note.text).trim()])
  );
  const markerSet = new Set(markerText.keys());
  const pending = [];
  let currentAyah = null;

  for (const line of lines) {
    const raw = String(line || '');
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const markerOnly = /^[a-z](\s+[a-z])*$/i.test(text);
    if (markerOnly) {
      text
        .split(/\s+/)
        .map((token) => token.toLowerCase())
        .filter((token) => markerSet.has(token))
        .forEach((token) => pending.push(token));
      continue;
    }

    const numbers = [...text.matchAll(/\b\d{1,3}\b/g)].map((match) => Number(match[0]));
    for (const num of numbers) {
      if (!Number.isFinite(num)) continue;
      if (num < range.from || num > range.to) continue;
      currentAyah = num;
      if (pending.length) {
        for (const marker of pending.splice(0)) {
          addFootnoteToVerse(result, currentAyah, marker, markerText.get(marker));
        }
      }
    }

    const markers = [...text.matchAll(/\b[a-z]\b/gi)].map((match) => ({
      marker: match[0].toLowerCase(),
      index: match.index ?? 0,
    }));
    for (const { marker, index } of markers) {
      if (!markerSet.has(marker)) continue;
      if (marker === 'a') {
        const before = text.slice(Math.max(0, index - 6), index);
        const after = text.slice(index + 1, index + 6);
        if (!/\d/.test(before) && !/\d/.test(after)) continue;
      }
      if (currentAyah != null) {
        addFootnoteToVerse(result, currentAyah, marker, markerText.get(marker));
      } else {
        pending.push(marker);
      }
    }
  }

  if (pending.length && currentAyah != null) {
    for (const marker of pending) {
      addFootnoteToVerse(result, currentAyah, marker, markerText.get(marker));
    }
  }

  return result;
}

(async () => {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const surahCounts = loadSurahCounts();

  // Find first surah header page
  let translationStart = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const lines = groupLines(content.items);
    if (lines.some((line) => /^1\.\s+THE\s+OPENING/i.test(line.text))) {
      translationStart = p;
      break;
    }
  }

  if (!translationStart) {
    throw new Error('Could not locate translation start page.');
  }

  const passages = [];
  const footnotesByVerse = new Map();
  const passageIndexBySurah = new Map();
  let currentSurah = null;

  for (let p = translationStart; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const lines = groupLines(content.items);
    const footnoteStartY = getFootnoteStartY(lines, viewport.height);
    const footnotes = extractFootnotes(lines, viewport.height, footnoteStartY);

    let headerLine = null;
    let headerAyah = null;
    let pageBook = null;
    for (const line of lines) {
      const header = parseHeader(line.text);
      if (header) {
        headerLine = line.text;
        headerAyah = header.ayah ?? null;
        pageBook = header.pageBook ?? null;
        currentSurah = header.surah ?? currentSurah;
        break;
      }
    }

    const bodyLines = [];

    for (const line of lines) {
      if (footnoteStartY != null && line.y <= footnoteStartY) continue;
      if (footnoteStartY == null && line.y <= viewport.height * footnoteRegionRatio && isFootnoteLine(line.text)) {
        continue;
      }

      if (line.text === headerLine) continue;
      if (/^\d+\.\s+/.test(line.text)) continue;
      if (parseHeader(line.text)) continue;
      const markerOnly = /^[a-z](\s+[a-z])+$/.test(line.text);
      const footnoteTextLine = /^[a-z]\s+/.test(line.text) && !markerOnly;
      if (footnoteTextLine) continue;

      bodyLines.push(line.text);
    }

    let bodyText = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
    bodyText = stripFootnoteText(bodyText, footnotes);
    bodyText = normalizePdfText(bodyText);

    const numbersBySurah = new Map();
    let inFootnotes = false;
    let localSurah = currentSurah;

    for (const line of lines) {
      if (line.text === headerLine) continue;

      const header = parseHeader(line.text);
      if (header) {
        localSurah = header.surah;
        currentSurah = header.surah;
        continue;
      }

      const headingMatch = line.text.match(/^(\d+)\.\s+/);
      if (headingMatch) {
        localSurah = Number(headingMatch[1]);
        currentSurah = localSurah;
        continue;
      }

      if (!localSurah || !surahCounts.has(localSurah)) continue;

      if (line.y <= viewport.height * footnoteRegionRatio && isFootnoteLine(line.text)) {
        inFootnotes = true;
      }
      if (inFootnotes && line.y <= viewport.height * footnoteRegionRatio) continue;

      if (/^\d+\s*:\s*\d+/.test(line.text)) continue;

      const matches = line.text.match(/\b\d{1,3}\b/g);
      if (!matches) continue;

      const ayahCount = surahCounts.get(localSurah);
      const bucket = numbersBySurah.get(localSurah) ?? [];
      for (const token of matches) {
        const num = Number(token);
        if (!Number.isFinite(num)) continue;
        if (num < 1 || num > ayahCount) continue;
        if (bucket.length === 0 || bucket[bucket.length - 1] !== num) {
          bucket.push(num);
        }
      }
      if (bucket.length) numbersBySurah.set(localSurah, bucket);
    }

    if (!numbersBySurah.size) continue;

    for (const [surah, numbers] of numbersBySurah.entries()) {
      const range = chooseRange(numbers, headerAyah);
      if (!range) continue;

      const passageIndex = (passageIndexBySurah.get(surah) ?? 0) + 1;
      passageIndexBySurah.set(surah, passageIndex);

      const text = buildPassageText(surah, range.from, range.to);

    const verseFootnotes = assignFootnotesToVerses(bodyLines, footnotes, range);
      for (const [ayahKey, notes] of verseFootnotes.entries()) {
        const mapKey = `${surah}:${ayahKey}`;
        if (!footnotesByVerse.has(mapKey)) footnotesByVerse.set(mapKey, []);
        const bucket = footnotesByVerse.get(mapKey);
        for (const note of notes) {
          if (!bucket.some((entry) => entry.marker === note.marker)) {
            bucket.push(note);
          }
        }
      }

      passages.push({
        source_key: sourceKey,
        surah,
        ayah_from: range.from,
        ayah_to: range.to,
        passage_index: passageIndex,
        page_pdf: p,
        page_book: pageBook,
        text,
        meta_json: {
          header_ayah: headerAyah,
          footnotes,
          text_pdf: bodyText || null,
        },
      });
    }
  }

  const sourceSql = [
    `DELETE FROM ar_quran_translation_sources WHERE source_key = '${sourceKey}';`,
    `INSERT INTO ar_quran_translation_sources (source_key, title, translator, language, publisher, year, isbn, edition, rights, source_path, meta_json) VALUES (` +
      [
        sourceKey,
        sourceMeta.title,
        sourceMeta.translator,
        sourceMeta.language,
        sourceMeta.publisher,
        sourceMeta.year,
        sourceMeta.isbn,
        sourceMeta.edition,
        sourceMeta.rights,
        sourceMeta.source_path,
        JSON.stringify(sourceMeta.meta_json),
      ]
        .map((val) => (val == null ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`))
        .join(', ') +
      `);`,
  ].join('\n');

  const passageSql = [
    `DELETE FROM ar_quran_translation_passages WHERE source_key = '${sourceKey}';`,
    ...passages.map((row) =>
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
  ].join('\n');

  const footnoteSql = [
    `UPDATE ar_quran_translations SET footnotes_haleem = NULL WHERE translation_haleem IS NOT NULL;`,
    ...[...footnotesByVerse.entries()]
      .map(([key, notes]) => {
        const [surah, ayah] = key.split(':').map(Number);
        if (!notes || !notes.length) return null;
        const json = JSON.stringify(notes);
        return (
          `UPDATE ar_quran_translations SET footnotes_haleem = '` +
          `${String(json).replace(/'/g, "''")}' WHERE surah = ${surah} AND ayah = ${ayah};`
        );
      })
      .filter(Boolean),
  ].join('\n');

  fs.writeFileSync(outSourcesSql, sourceSql + '\n');
  fs.writeFileSync(outPassagesSql, passageSql + '\n');
  fs.writeFileSync(outFootnotesSql, footnoteSql + '\n');

  console.log(`Translation start page: ${translationStart}`);
  console.log(`Passages: ${passages.length}`);
  console.log(`Wrote ${outSourcesSql}`);
  console.log(`Wrote ${outPassagesSql}`);
  console.log(`Wrote ${outFootnotesSql}`);
})();
