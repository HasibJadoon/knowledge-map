import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const h = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function readReadingBlocks(unitJson: any): Array<Record<string, string>> | null {
  const value = unitJson?.reading_blocks ?? unitJson?.readingBlocks ?? null;
  if (!Array.isArray(value)) return null;

  const blocks = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const type = typeof entry.type === 'string' ? entry.type.trim() : '';
      const text = typeof entry.text === 'string' ? entry.text.trim() : '';
      const href = typeof entry.href === 'string' ? entry.href.trim() : '';
      const label = typeof entry.label === 'string' ? entry.label.trim() : '';
      const cite = typeof entry.cite === 'string' ? entry.cite.trim() : '';

      if (!type) return null;

      return {
        type,
        ...(text ? { text } : {}),
        ...(href ? { href } : {}),
        ...(label ? { label } : {}),
        ...(cite ? { cite } : {}),
      };
    })
    .filter((entry): entry is Record<string, string> => !!entry);

  return blocks.length ? blocks : null;
}

function flattenReadingBlocks(blocks: Array<Record<string, string>>): string | null {
  const parts = blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return block.text ? `## ${block.text}` : '';
        case 'subheading':
          return block.text ? `### ${block.text}` : '';
        case 'separator':
          return '---';
        case 'link':
          if (block.label && block.href) return `[${block.label}](${block.href})`;
          return block.text || '';
        case 'quote':
          return [block.text, block.cite].filter(Boolean).join('\n\n');
        default:
          return block.text || '';
      }
    })
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parts.length ? parts.join('\n\n') : null;
}

function readReadingBody(unitJson: any): string | null {
  const value = unitJson?.reading_body ?? unitJson?.readingBody ?? null;

  if (typeof value === 'string') {
    const text = value.trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry): entry is string => !!entry);

    return parts.length ? parts.join('\n\n') : null;
  }

  const blocks = readReadingBlocks(unitJson);
  return blocks ? flattenReadingBlocks(blocks) : null;
}

// GET /worldview/units/:id  — single unit with full reading body + child units
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: h });

    const [unitRow, childrenRes] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT u.id, u.source_id, u.parent_unit_id, u.unit_type, u.title,
                u.order_index, u.start_ref, u.end_ref, u.anchor_text, u.summary,
                u.unit_json, u.meta_json,
                s.title AS source_title, s.source_type, s.creator
         FROM wv_source_units u
         LEFT JOIN wv_sources s ON s.id = u.source_id
         WHERE u.id = ?1`
      ).bind(id).first<any>(),
      ctx.env.DB.prepare(
        `SELECT id, unit_type, title, order_index, start_ref, end_ref, anchor_text, summary
         FROM wv_source_units
         WHERE parent_unit_id = ?1
         ORDER BY order_index ASC`
      ).bind(id).all(),
    ]);

    if (!unitRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers: h });
    }

    const unitJson = safeJson(unitRow.unit_json);
    const result = {
      ...unitRow,
      reading_body: readReadingBody(unitJson),
      reading_blocks: readReadingBlocks(unitJson),
      unit_json: undefined,
      meta: safeJson(unitRow.meta_json),
      meta_json: undefined,
      children: childrenRes.results ?? [],
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};
