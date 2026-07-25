// ─── /al/expressions routes ───────────────────────────────────────────────────
// ar_ling_root_lemma_tabir: idioms, collocations, fixed phrases

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { query, queryOne, paginate } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';

interface Expression {
  id: string;             // AL:ULID
  expression_ar: string;
  expression_type: string; // idiom | collocation | fixed_phrase | proverb
  gloss_en: string | null;
  notes: string | null;
}

export function expressionRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/expressions/search?q=&type=idiom
  router.get('/al/expressions/search', async (req, env) => {
    const url = new URL(req.url);
    const q    = url.searchParams.get('q');
    const type = url.searchParams.get('type');
    if (!q) return badRequest('q param required');

    const pattern = `%${q}%`;
    const params  = type ? [pattern, pattern, type] : [pattern, pattern];
    const typeWhere = type ? `AND expression_type = ?` : '';

    return paginated(
      await paginate<Expression>(
        env.DB_AL,
        `SELECT id, expression_ar, expression_type, gloss_en, notes
         FROM ar_ling_root_lemma_tabir
         WHERE (expression_ar LIKE ? OR gloss_en LIKE ?) ${typeWhere}
         ORDER BY expression_ar`,
        `SELECT COUNT(*) AS count FROM ar_ling_root_lemma_tabir
         WHERE (expression_ar LIKE ? OR gloss_en LIKE ?) ${typeWhere}`,
        params,
        parsePagination(url),
      ),
    );
  });

  // GET /al/expressions/:id
  router.get('/al/expressions/:id', async (_req, env, { id }) => {
    const row = await queryOne<Expression>(
      env.DB_AL,
      `SELECT id, expression_ar, expression_type, gloss_en, notes
       FROM ar_ling_root_lemma_tabir WHERE id = ?`,
      [id],
    );
    return row ? ok(row) : notFound(`expression ${id}`);
  });
}
