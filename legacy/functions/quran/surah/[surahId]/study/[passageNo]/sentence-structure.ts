import { findRootTask, loadStudyLesson, parsePositiveInt, type QuranStudyEnv } from '../../../../_study';

interface Env extends QuranStudyEnv {}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const surahId = parsePositiveInt(ctx.params['surahId']);
  const passageNo = parsePositiveInt(ctx.params['passageNo']);
  if (!surahId || !passageNo) {
    return Response.json({ ok: false, error: 'Invalid params' }, { status: 400 });
  }

  try {
    const data = await loadStudyLesson(ctx.env, surahId, passageNo);
    if (!data) return Response.json({ ok: false, error: 'Passage not found' }, { status: 404 });
    return Response.json({
      ok: true,
      surahId,
      passageNo,
      unit: data.unit,
      task: findRootTask(data.tasks, 'sentence_structure'),
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
