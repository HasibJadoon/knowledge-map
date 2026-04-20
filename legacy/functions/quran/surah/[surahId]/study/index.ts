import { loadStudyGrid, parsePositiveInt, type QuranStudyEnv } from '../../../_study';

interface Env extends QuranStudyEnv {}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId = parsePositiveInt(ctx.params['surahId']);
  if (surahId < 1 || surahId > 114) {
    return Response.json({ ok: false, error: 'Invalid surahId' }, { status: 400 });
  }

  try {
    const data = await loadStudyGrid(ctx.env, surahId);
    if (!data) return Response.json({ ok: false, error: 'Surah not found' }, { status: 404 });
    return Response.json({ ok: true, surahId, ...data });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
