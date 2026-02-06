const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pdfPath = path.join(__dirname, '..', 'notes', 'resources', 'TheQuran-ANewTranslation.pdf');
const outSourcesSql = path.join(__dirname, '..', 'database', 'migrations', 'seed-ar_quran_translation_sources.sql');
const outPassagesSql = path.join(__dirname, '..', 'database', 'migrations', 'seed-ar_quran_translation_passages.sql');
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

function extractFootnotes(lines, viewportHeight) {
  const footnotes = [];
  let current = null;
  const threshold = viewportHeight * footnoteRegionRatio;
  const footnoteLines = lines.filter((line) => line.y <= threshold);

  for (const line of footnoteLines) {
    const text = line.text.trim();
    if (!text) continue;
    if (/^[a-z](\s+[a-z])+$/.test(text)) continue;

    const match = text.match(/^([a-z])\s+(.*)$/);
    if (match) {
      if (current) footnotes.push(current);
      current = { marker: match[1], text: match[2].trim() };
      continue;
    }

    if (current) {
      current.text = `${current.text} ${text}`.replace(/\s+/g, ' ').trim();
    }
  }

  if (current) footnotes.push(current);
  return footnotes;
}

function stripFootnoteText(bodyText, footnotes) {
  if (!bodyText || !footnotes?.length) return bodyText;
  let cleaned = bodyText;

  for (const note of footnotes) {
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
  const passageIndexBySurah = new Map();
  let currentSurah = null;

  for (let p = translationStart; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const lines = groupLines(content.items);
    const footnotes = extractFootnotes(lines, viewport.height);

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
    const threshold = viewport.height * footnoteRegionRatio;
    const footnoteCandidates = lines.filter((line) => line.y <= threshold && isFootnoteLine(line.text));
    const footnoteStartY = footnoteCandidates
      .map((line) => line.y)
      .reduce((acc, value) => (acc == null || value > acc ? value : acc), null);

    for (const line of lines) {
      if (footnoteStartY != null && line.y <= footnoteStartY) continue;
      if (footnoteStartY == null && line.y <= threshold && isFootnoteLine(line.text)) continue;

      if (line.text === headerLine) continue;
      if (/^\d+\.\s+/.test(line.text)) continue;
      if (parseHeader(line.text)) continue;
      if (/^[a-z](\s+[a-z])+$/.test(line.text)) continue;
      if (isFootnoteLine(line.text)) continue;

      bodyLines.push(line.text);
    }

    let bodyText = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
    bodyText = bodyText.replace(/(\w)-\s+(\w)/g, '$1$2');
    bodyText = stripFootnoteText(bodyText, footnotes);

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

  fs.writeFileSync(outSourcesSql, sourceSql + '\n');
  fs.writeFileSync(outPassagesSql, passageSql + '\n');

  console.log(`Translation start page: ${translationStart}`);
  console.log(`Passages: ${passages.length}`);
  console.log(`Wrote ${outSourcesSql}`);
  console.log(`Wrote ${outPassagesSql}`);
})();
