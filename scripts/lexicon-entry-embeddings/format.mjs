import crypto from 'node:crypto';

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stablePointId(entryId) {
  const hex = sha256(String(entryId)).slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function locator(row) {
  const parts = [];
  if (present(row.volume_no)) parts.push(`volume ${row.volume_no}`);
  if (present(row.page_no)) parts.push(`page ${row.page_no}`);
  if (present(row.source_entry_seq)) parts.push(`entry ${row.source_entry_seq}`);
  if (present(row.source_url)) parts.push(row.source_url);
  return parts.join(' | ');
}

export function buildEmbeddingText(row, maxChars) {
  const sourceTitle = row.source_title || row.source_title_ar || row.source_slug || row.source_id || 'unknown source';
  const root = row.root_text || row.heading_norm || row.entry_text || '';
  const headword = row.display_heading_ar || row.entry_text || row.heading_norm || root;
  const normalizedHeadword = row.heading_norm || row.heading_key || headword;
  const fullEntry = row.definition_ar || row.entry_text || '';
  const loc = locator(row);

  const lines = [
    `Source: ${sourceTitle}`,
    `Author: ${row.author_name || ''}`,
    `Root: ${root}`,
    `Headword: ${headword}`,
    `Normalized headword: ${normalizedHeadword}`,
    'Entry type: lexicon root/headword entry',
    '',
  ];

  if (present(fullEntry)) {
    lines.push('Arabic entry:', fullEntry);
  } else {
    lines.push('No full entry text available.');
  }

  lines.push('', 'Locator:', loc);
  return lines.join('\n').slice(0, maxChars);
}

export function buildPayload(row) {
  const sourceTitle = row.source_title || row.source_title_ar || row.source_slug || row.source_id || null;
  const headword = row.display_heading_ar || row.entry_text || row.heading_norm || null;
  const loc = locator(row);
  return {
    entry_id: row.id,
    source_id: row.source_id,
    source_key: row.source_slug,
    source_title: sourceTitle,
    author_name: row.author_name,
    root: row.root_text || row.heading_norm || null,
    headword,
    normalized_headword: row.heading_norm || row.heading_key || headword,
    language: 'ar',
    entry_type: 'lexicon_entry',
    volume: row.volume_no === null || row.volume_no === undefined ? null : String(row.volume_no),
    page: row.page_no === null || row.page_no === undefined ? null : String(row.page_no),
    locator: loc,
  };
}
