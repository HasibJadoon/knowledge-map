// ─── /al/expressions routes ───────────────────────────────────────────────────
// ar_ling_root_lemma_tabir: idioms, collocations, fixed phrases (taʿbīr).
//
// Column names below are the real ones. The route used to select
// `expression_type`, `gloss_en` and `notes`, none of which exist on this
// table — both endpoints threw at D1. The English gloss is `expression_en`,
// notes are `notes_md`, and the type is a foreign key (`expression_type_id`)
// into ar_ling_root_lemma_tabir_kind, whose `type_key` is the value callers
// pass as ?type=. The outward response shape is unchanged, via aliases.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { queryOne, paginate } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';

interface Expression {
  id: string;             // AL:ULID
  expression_ar: string;
  expression_type: string; // idiom | collocation | fixed_phrase | proverb
  gloss_en: string | null;
  notes: string | null;
}

const COLS = `
  t.id,
  t.expression_ar,
  k.type_key    AS expression_type,
  t.expression_en AS gloss_en,
  t.notes_md    AS notes`;

const FROM = `
  FROM ar_ling_root_lemma_tabir t
  LEFT JOIN ar_ling_root_lemma_tabir_kind k ON k.id = t.expression_type_id`;

export function expressionRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/expressions/search?q=&type=idiom
  router.get('/al/expressions/search', async (req, env) => {
    const url = new URL(req.url);
    const q    = url.searchParams.get('q');
    const type = url.searchParams.get('type');
    if (!q) return badRequest('q param required');

    const pattern   = `%${q}%`;
    const params    = type ? [pattern, pattern, type] : [pattern, pattern];
    const typeWhere = type ? `AND k.type_key = ?` : '';
    const where     = `WHERE (t.expression_ar LIKE ? OR t.expression_en LIKE ?) ${typeWhere}`;

    return paginated(
      await paginate<Expression>(
        env.DB_AL,
        `SELECT ${COLS} ${FROM} ${where} ORDER BY t.expression_ar`,
        `SELECT COUNT(*) AS count ${FROM} ${where}`,
        params,
        parsePagination(url),
      ),
    );
  });

  // GET /al/expressions/:id
  router.get('/al/expressions/:id', async (_req, env, { id }) => {
    const row = await queryOne<Expression>(
      env.DB_AL,
      `SELECT ${COLS} ${FROM} WHERE t.id = ?`,
      [id],
    );
    return row ? ok(row) : notFound(`expression ${id}`);
  });
}
