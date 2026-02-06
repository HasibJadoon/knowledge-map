import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const outPath = getArgValue('--out', args) || '/tmp/grammar_import.sql';

const csvFiles = collectCsvFiles(args);
if (!csvFiles.length) {
  console.error('Usage: node scripts/import-grammar-csv.mjs --csv <path> [--csv <path> ...] [--out <sqlPath>]');
  console.error('   or: node scripts/import-grammar-csv.mjs --seed <path> --hierarchy <path> [--out <sqlPath>]');
  process.exit(1);
}

const knownKeys = new Set([
  'ar_u_grammar',
  'canonical_input',
  'grammar_id',
  'id',
  'concept_id',
  'title',
  'title_ar',
  'ar',
  'definition',
  'definition_ar',
  'definition_arabic',
  'category',
  'parent_id',
  'parent',
  'parent_grammar_id',
  'parent_ids',
  'parents',
  'order',
  'order_index',
  'tags',
  'meta_json',
]);

const conceptMap = new Map();
const relations = [];

for (const csvPath of csvFiles) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw).filter((row) => row.some((cell) => String(cell ?? '').trim()));
  if (!rows.length) continue;
  const headers = rows.shift().map((h) => normalizeHeader(h));

  for (const row of rows) {
    const data = toRecord(headers, row);
    const grammarId =
      firstNonEmpty(data['grammar_id'], data['id'], data['concept_id'])?.trim() ?? '';
    if (!grammarId) continue;

    const current = conceptMap.get(grammarId) ?? {
      grammar_id: grammarId,
      title: '',
      title_ar: '',
      definition: '',
      definition_ar: '',
      category: '',
      meta: {},
    };

    const title = (data['title'] ?? '').trim();
    const titleAr = firstNonEmpty(data['title_ar'], data['ar'])?.trim() ?? '';
    const definition = (data['definition'] ?? '').trim();
    const definitionAr = firstNonEmpty(data['definition_ar'], data['definition_arabic'])?.trim() ?? '';
    const category = (data['category'] ?? '').trim();

    if (title) current.title = current.title || title;
    if (titleAr) current.title_ar = current.title_ar || titleAr;
    if (definition) current.definition = current.definition || definition;
    if (definitionAr) current.definition_ar = current.definition_ar || definitionAr;
    if (category) current.category = current.category || category;

    const extra = {};
    for (const [key, value] of Object.entries(data)) {
      if (knownKeys.has(key)) continue;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed === null || trimmed === undefined) continue;
      extra[key] = trimmed;
    }

    const tagsRaw = (data['tags'] ?? '').trim();
    if (tagsRaw) {
      extra['tags'] = tagsRaw.split(/[;,|]/).map((tag) => tag.trim()).filter(Boolean);
    }

    const metaJsonRaw = (data['meta_json'] ?? '').trim();
    if (metaJsonRaw) {
      try {
        const parsed = JSON.parse(metaJsonRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(extra, parsed);
        }
      } catch {
        // ignore invalid meta_json
      }
    }

    current.meta = { ...(current.meta ?? {}), ...extra };
    conceptMap.set(grammarId, current);

    const parentsRaw = firstNonEmpty(
      data['parent_id'],
      data['parent'],
      data['parent_grammar_id'],
      data['parent_ids'],
      data['parents'],
      (current.meta?.parent ?? ''),
      (Array.isArray(current.meta?.parents) ? current.meta.parents.join(',') : current.meta?.parents)
    );

    if (parentsRaw) {
      const parentIds = String(parentsRaw)
        .split(/[;|,]/)
        .map((id) => id.trim())
        .filter(Boolean);
      const orderIndex = toInt(firstNonEmpty(data['order_index'], data['order']));
      for (const parentId of parentIds) {
        relations.push({
          parent_id: parentId,
          child_id: grammarId,
          order_index: Number.isFinite(orderIndex) ? orderIndex : null,
        });
      }
    }
  }
}

const statements = [];
const idMap = new Map();
for (const concept of conceptMap.values()) {
  const canonical = canonicalize(`GRAM|${concept.grammar_id}`);
  const arUGrammar = sha256Hex(canonical);
  idMap.set(concept.grammar_id, { arUGrammar, canonical_input: canonical });

  const metaJson = Object.keys(concept.meta ?? {}).length
    ? JSON.stringify(concept.meta)
    : null;

  statements.push(
    `INSERT INTO ar_u_grammar (
      ar_u_grammar, canonical_input,
      grammar_id, category, title, title_ar,
      definition, definition_ar, meta_json
    ) VALUES (${sql(arUGrammar)}, ${sql(canonical)},
      ${sql(concept.grammar_id)}, ${sql(concept.category || null)}, ${sql(concept.title || null)}, ${sql(concept.title_ar || null)},
      ${sql(concept.definition || null)}, ${sql(concept.definition_ar || null)}, ${sql(metaJson)}
    )
    ON CONFLICT(ar_u_grammar) DO UPDATE SET
      grammar_id = excluded.grammar_id,
      category = excluded.category,
      title = excluded.title,
      title_ar = excluded.title_ar,
      definition = excluded.definition,
      definition_ar = excluded.definition_ar,
      meta_json = excluded.meta_json,
      updated_at = datetime('now');`
  );
}

for (const rel of relations) {
  const parent = idMap.get(rel.parent_id);
  const child = idMap.get(rel.child_id);
  if (!parent || !child) continue;

  const relCanonical = canonicalize(
    `GRAMREL|${rel.parent_id}|${rel.child_id}|is_a`
  );
  const relId = sha256Hex(relCanonical);

  statements.push(
    `INSERT INTO ar_u_grammar_relations (
      id, parent_ar_u_grammar, child_ar_u_grammar, relation_type, order_index, meta_json
    ) VALUES (${sql(relId)}, ${sql(parent.arUGrammar)}, ${sql(child.arUGrammar)}, 'is_a', ${sql(rel.order_index)}, NULL)
    ON CONFLICT(id) DO UPDATE SET
      parent_ar_u_grammar = excluded.parent_ar_u_grammar,
      child_ar_u_grammar = excluded.child_ar_u_grammar,
      relation_type = excluded.relation_type,
      order_index = excluded.order_index,
      updated_at = datetime('now');`
  );
}

fs.writeFileSync(outPath, statements.join('\n'));
console.log(`Wrote ${conceptMap.size} concepts and ${relations.length} relations to ${outPath}`);

function getArgValue(flag, argv) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function collectCsvFiles(argv) {
  const csvs = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--csv' || arg === '-c') {
      if (argv[i + 1]) csvs.push(argv[i + 1]);
      i++;
    }
  }
  const seed = getArgValue('--seed', argv);
  const hierarchy = getArgValue('--hierarchy', argv);
  if (seed) csvs.push(seed);
  if (hierarchy) csvs.push(hierarchy);
  return csvs;
}

function normalizeHeader(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function toRecord(headers, row) {
  const record = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? '';
  });
  return record;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function canonicalize(input) {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

function toInt(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}
