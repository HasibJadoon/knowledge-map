import type { D1Database, PagesFunction, R2Bucket } from '@cloudflare/workers-types';
import { json, readInteger } from '../../_utils/sprint';

interface Env {
  DB: D1Database;
  KMAPS_ASSETS: R2Bucket;
}

const CDN_BASE = 'https://cdn.k-maps.com';
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
const ALLOWED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4', 'audio/x-m4a']);
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;  // 20 MB
const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100 MB

// POST /documents/:id/upload
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const documentId = String(ctx.params['id']);

    // Verify document exists
    const doc = await ctx.env.DB.prepare(
      `SELECT id, workspace_id, user_id FROM wv_documents WHERE id = ?1 AND deleted_at IS NULL LIMIT 1`
    ).bind(documentId).first<{ id: string; workspace_id: string; user_id: number | null }>();

    if (!doc) return json({ ok: false, error: 'Document not found' }, 404);

    const formData = await ctx.request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.name) return json({ ok: false, error: 'No file provided' }, 400);

    const resourceType = String(formData.get('resource_type') ?? 'image');
    if (resourceType !== 'image' && resourceType !== 'audio') {
      return json({ ok: false, error: 'resource_type must be image or audio' }, 400);
    }

    const mimeType = file.type || detectMime(file.name, resourceType);
    const allowed = resourceType === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_AUDIO_TYPES;
    if (!allowed.has(mimeType)) {
      return json({ ok: false, error: `Unsupported ${resourceType} type: ${mimeType}` }, 400);
    }

    const maxBytes = resourceType === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
    if (file.size > maxBytes) {
      return json({ ok: false, error: `File too large (max ${maxBytes / 1024 / 1024} MB)` }, 400);
    }

    // Build R2 key
    const resourceId = `R2R:${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 24)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    const key = `documents/${documentId}/${resourceType}s/${resourceId}-${safeName}`;
    const url = `${CDN_BASE}/${key}`;

    const arrayBuf = await file.arrayBuffer();
    await ctx.env.KMAPS_ASSETS.put(key, arrayBuf, {
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        document_id: documentId,
        resource_id: resourceId,
        resource_type: resourceType,
        uploaded_by: String(readInteger(doc.user_id) ?? ''),
        original_name: file.name,
      },
    });

    return json({
      ok: true,
      url,
      key,
      resource_id: resourceId,
      resource_type: resourceType,
      mime_type: mimeType,
      size_bytes: file.size,
      file_name: file.name,
    }, 201);
  } catch (err: unknown) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });

function detectMime(filename: string, resourceType: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const imageMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  };
  const audioMap: Record<string, string> = {
    mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
    aac: 'audio/aac', m4a: 'audio/x-m4a', mp4: 'audio/mp4',
  };
  const map = resourceType === 'image' ? imageMap : audioMap;
  return map[ext] ?? `${resourceType}/octet-stream`;
}
