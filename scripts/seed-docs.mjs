#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const baseDir = process.cwd();
const inputDir = path.join(baseDir, 'docs', 'wiki');
const targetTable = process.argv[2] ?? 'docs';
const sanitizedTable = targetTable.replace(/_/g, '-');
const outputPath = path.join(
  baseDir,
  'database',
  'seeds',
  `seed-${sanitizedTable}.sql`
);

if (!fs.existsSync(inputDir)) {
  console.error(`Docs folder not found: ${inputDir}`);
  process.exit(1);
}

const collectMarkdownFiles = (dir, base = '') => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const collected = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      collected.push(...collectMarkdownFiles(path.join(dir, entry.name), base ? `${base}/${entry.name}` : entry.name));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    const relative = base ? `${base}/${entry.name}` : entry.name;
    collected.push(relative);
  }
  return collected;
};

const files = collectMarkdownFiles(inputDir).sort((a, b) => a.localeCompare(b));

if (!files.length) {
  console.error(`No Markdown files found inside ${inputDir}`);
  process.exit(1);
}

const parseDoc = (raw) => {
  const normalized = raw.replace(/\r\n/g, '\n');
  let body = normalized;
  const metadata = { tags: [] };

  if (body.startsWith('---')) {
    const endIndex = body.indexOf('\n---', 3);
    if (endIndex !== -1) {
      const frontMatter = body.slice(4, endIndex).trim();
      body = body.slice(endIndex + 4);
      for (const line of frontMatter.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [key, ...rest] = trimmed.split(':');
        if (!key) continue;
        const value = rest.join(':').trim();
        if (!value) continue;
        if (key === 'tags') {
          metadata.tags = value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        } else {
          metadata[key] = value;
        }
      }
    }
  }

  body = body.trim();

  metadata.title = metadata.title || extractTitle(body) || '';
  metadata.status = (metadata.status || 'published').toLowerCase();

  return { metadata, body };
};

const extractTitle = (body) => {
  if (!body) return null;
  const match = body.match(/^#{1,6}\s+(.*)$/m);
  return match ? match[1].trim() : null;
};

const escapeSql = (value) => {
  return value.replace(/'/g, "''");
};

const slugSortOrder = (slug) => {
  const match = slug.match(/^(\d+)-/);
  if (match) return Number(match[1]);
  return 9999;
};

const statements = files.map((file) => {
  const relative = file.replace(/\\/g, '/');
  let slug = relative.replace(/\.md$/i, '');
  if (slug.toLowerCase().endsWith('/readme')) {
    slug = slug.slice(0, -'/readme'.length);
  }
  slug = slug.replace(/\/$/, '');
  if (!slug) {
    slug = 'index';
  }
  const raw = fs.readFileSync(path.join(inputDir, file), 'utf8');
  const { metadata, body } = parseDoc(raw);

  if (!body) {
    throw new Error(`Empty Markdown body for ${file}`);
  }

  const parentMatch = slug.match(/^(.*)\/[^/]+$/);
  const parentSlug = parentMatch ? parentMatch[1] : null;
  const sortOrder = slugSortOrder(slug);

  const title = metadata.title || slug;
  const status = ['published', 'draft'].includes(metadata.status)
    ? metadata.status
    : 'published';

  const tagsJson = metadata.tags.length ? JSON.stringify(metadata.tags) : null;
  const bodySql = escapeSql(body);
  const titleSql = escapeSql(title);

  const tagsValue = tagsJson ? `'${escapeSql(tagsJson)}'` : 'NULL';

  return `INSERT INTO ${targetTable} (slug, title, body_md, tags_json, status, parent_slug, sort_order, created_at, updated_at)
VALUES ('${slug}', '${titleSql}', '${bodySql}', ${tagsValue}, '${status}', ${
    parentSlug ? `'${escapeSql(parentSlug)}'` : 'NULL'
  }, ${sortOrder}, datetime('now'), datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, body_md = excluded.body_md, tags_json = excluded.tags_json, status = excluded.status, parent_slug = excluded.parent_slug, sort_order = excluded.sort_order, updated_at = datetime('now');`;
});

const output = [
  `-- Auto-generated seed for table ${targetTable} from scripts/seed-docs.mjs`,
  `-- Source directory: ${inputDir}`,
  '',
  ...statements,
  '',
].join('\n') + '\n';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Wrote ${statements.length} statements to ${outputPath}`);
