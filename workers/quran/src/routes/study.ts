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
// GET /qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType       — lazy step data (tables)
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

      // Cheap step-type availability (no task_json load) for passage selection.
      const stepTypes = await repo.stepTypes(sp.s, sp.p) ?? [];

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

  // ── Lazy per-step data (table-sourced) ───────────────────────────────────────
  // Loads ONLY the selected step's data, built from the normalized tables (not
  // task_json) for migrated steps (reading, comprehension). The study module
  // calls this when a step is opened, so each step lazy-loads its own payload.

  router.get(
    '/qr/study/surahs/:surahId/passages/:passageNo/steps/:stepType',
    async (_req, env, { surahId, passageNo, stepType }) => {
      const sp = parseSurahPassage(surahId, passageNo);
      if (!sp) return badRequest('Invalid surahId or passageNo');
      if (!stepType) return badRequest('stepType is required');

      const result = await new StudyRepo(env.DB_QR).stepData(sp.s, sp.p, stepType);
      if (result === null)      return notFound(`passage ${sp.s}:${sp.p}`);
      if (result === undefined) return notFound(`step '${stepType}' in passage ${sp.s}:${sp.p}`);
      return ok(result);
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
