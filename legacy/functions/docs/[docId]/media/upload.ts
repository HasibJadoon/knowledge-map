import type { D1Database, R2Bucket, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; KMAPS_ASSETS: R2Bucket; }

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const docId = params.docId as string;
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

  const id = crypto.randomUUID();
  const ext = file.name.split('.').pop() ?? 'bin';
  const r2Key = `docs/${docId}/${id}.${ext}`;

  await env.KMAPS_ASSETS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `/api/media/${r2Key}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO km_doc_media (id, document_id, r2_key, url, mime_type, file_name, size_bytes, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).bind(id, docId, r2Key, url, file.type, file.name, file.size, now).run();

  return Response.json({ id, url, r2_key: r2Key }, { status: 201 });
};
