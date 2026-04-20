import { loadStudyLesson, parsePositiveInt, stripChildren, type QuranStudyEnv } from '../../../../_study';

interface Env extends QuranStudyEnv {}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId = parsePositiveInt(ctx.params['surahId']);
  const passageNo = parsePositiveInt(ctx.params['passageNo']);
  if (!surahId || !passageNo) {
    return Response.json({ ok: false, error: 'Invalid params' }, { status: 400 });
  }

  try {
    const data = await loadStudyLesson(ctx.env, surahId, passageNo);
    if (!data) return Response.json({ ok: true, surahId, passageNo, tasks: [] });
    return Response.json({ ok: true, surahId, passageNo, tasks: stripChildren(data.tasks) });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
