// ─── /qr/study routes — Surah-centered study runtime ──────────────────────────
// All SQL lives in StudyRepo. Routes only parse params and delegate.
//
// GET /qr/study/surahs/:surahId                                   — grid overview
// GET /qr/study/surahs/:surahId/passages                          — passage list
// GET /qr/study/surahs/:surahId/passages/:passageNo               — passage + steps
// GET /qr/study/surahs/:surahId/passages/:passageNo/lesson        — full lesson
// GET /qr/study/surahs/:surahId/passages/:passageNo/vocabulary    — nouns + verbs
// GET /qr/study/surahs/:surahId/passages/:passageNo/expressions   — expression list
// GET /qr/study/surahs/:surahId/passages/:passageNo/tasks         — full task tree
// GET /qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType/tasks

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import {
  StudyRepo,
  vocabularyFromMorphology,
  expressionsFromTasks,
} from '../repositories/study.repo';
import { createAlClient } from '../clients/al.client';

function parseSurahPassage(
  surahId: string,
  passageNo: string,
): { s: number; p: number } | null {
  const s = parseIntParam(surahId);
  const p = parseIntParam(passageNo);
  if (!s || !p) return null;
  return { s, p };
}

export function studyRoutes(router: Router<QuranEnv>) {

  // ── Study grid — passage list enriched with task-type flags and vocab counts ─

  router.get('/qr/study/surahs/:surahId', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s) return badRequest('Invalid surahId');
    const data = await new StudyRepo(env.DB_QR).grid(s);
    return data ? ok(data) : notFound(`study grid for surah ${s}`);
  });

  // ── Passage list ─────────────────────────────────────────────────────────────

  router.get('/qr/study/surahs/:surahId/passages', async (_req, env, { surahId }) => {
    const s = parseIntParam(surahId);
    if (!s) return badRequest('Invalid surahId');
    return ok(await new StudyRepo(env.DB_QR).passages(s));
  });

  // ── Passage detail (metadata + step list) ────────────────────────────────────
  // Returns the passage row plus all steps via task tree root-type enumeration.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo     = new StudyRepo(env.DB_QR);
      const passages = await repo.passages(sp.s);
      const passage  = passages.find(p => p.passage_no === sp.p);
      if (!passage) return notFound(`passage ${sp.s}:${sp.p}`);

      // Surface available step types from the task tree roots
      const tasks    = await repo.allTasks(sp.s, sp.p) ?? [];
      const stepTypes = tasks.map(t => t.task_type);

      return ok({ passage, step_types: stepTypes });
    },
  );

  // ── Full lesson — ayahs + vocabulary + expressions + tasks ───────────────────

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/lesson',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const data = await new StudyRepo(env.DB_QR).lesson(sp.s, sp.p);
      return data ? ok(data) : notFound(`lesson ${sp.s}:${sp.p}`);
    },
  );

  // ── Vocabulary — nouns and verbs for a passage ───────────────────────────────
  // Prefers morphology task payloads (richer); falls back to raw word table.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/vocabulary',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo  = new StudyRepo(env.DB_QR);
      const tasks = await repo.allTasks(sp.s, sp.p);
      if (tasks === null) return notFound(`passage ${sp.s}:${sp.p}`);

      return ok(vocabularyFromMorphology(tasks));
    },
  );

  // ── Morphology (API 1) — every word in the passage as a built card ───────────
  // Basic + aesthetic vocab list: surface, lemma, root, pos, QAC sarf, iʿrāb
  // colour-chip, segments. Built from the relational tables; works for any surah.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/morphology',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      const data = await new StudyRepo(env.DB_QR).passageMorphology(sp.s, sp.p);
      return data ? ok(data) : notFound(`passage ${sp.s}:${sp.p}`);
    },
  );

  // ── Word detail (API 2) — the deep modal for one clicked word ────────────────
  // Occurrence card + tafsīr for its ayah + the AL root analysis (5 lenses, hook,
  // senses, constellation, illustration). AL is best-effort — never blocks.

  router.get('/qr/study/words/:wordId', async (_req, env, { wordId }) => {
    if (!wordId) return badRequest('wordId is required');
    const repo = new StudyRepo(env.DB_QR);
    const word = await repo.wordById(wordId);
    if (!word) return notFound(`word ${wordId}`);

    const [ayah, tafsir] = await Promise.all([
      repo.ayahContext(word.surah, word.ayah),
      repo.tafsirForAyah(word.surah, word.ayah),
    ]);

    let root_analysis: unknown = null;
    const al = createAlClient(env);
    if (al && word.root) {
      try {
        const res = await al.getWordAnalysis([word.root]);
        root_analysis = res?.data?.[word.root] ?? null;
      } catch { root_analysis = null; }
    }

    return ok({ word, ayah, tafsir, root_analysis });
  });

  // ── Expressions ───────────────────────────────────────────────────────────────

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/expressions',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const repo  = new StudyRepo(env.DB_QR);
      const tasks = await repo.allTasks(sp.s, sp.p);
      if (tasks === null) return notFound(`passage ${sp.s}:${sp.p}`);

      return ok(expressionsFromTasks(tasks));
    },
  );

  // ── Full task tree ────────────────────────────────────────────────────────────

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/tasks',
    async (_req, env, { surahId, passageNo }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');

      const tasks = await new StudyRepo(env.DB_QR).allTasks(sp.s, sp.p);
      if (tasks === null) return notFound(`passage ${sp.s}:${sp.p}`);
      return ok(tasks);
    },
  );

  // ── Tasks by step type ────────────────────────────────────────────────────────
  // Returns the matching root task (with its children subtree) for the given
  // step type (reading, morphology, sentence_structure, expressions, etc.).

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType/tasks',
    async (_req, env, { surahId, passageNo, stepType }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      if (!stepType) return badRequest('stepType is required');

      const result = await new StudyRepo(env.DB_QR).taskByStepType(sp.s, sp.p, stepType);
      if (result === null)  return notFound(`passage ${sp.s}:${sp.p}`);
      if (result === undefined) return notFound(`step type '${stepType}' in passage ${sp.s}:${sp.p}`);
      return ok(result);
    },
  );
}
