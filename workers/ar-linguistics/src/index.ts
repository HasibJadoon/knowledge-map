// ─── km-ar-linguistics-worker entry point ─────────────────────────────────────
// Owns DB_AL (km_arabic_linguistic). Single prefix: ar_ling_*.
// QR and AR call this worker for all linguistic truth (roots, lemmas, sarf,
// nahw, balagha). Never binds DB_QR or DB_AR.

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArLinguisticsEnv } from './env';

import { rootRoutes } from './routes/roots';
import { lemmaRoutes } from './routes/lemmas';
import { morphologyRoutes } from './routes/morphology';
import { nahwRoutes } from './routes/nahw';
import { balaghaRoutes } from './routes/balagha';
import { lexiconRoutes } from './routes/lexicon';
import { lexiconFiveLensRoutes } from './routes/lexicon_five_lens';
import { lexiconV2Routes } from './routes/lexicon_v2';
import { lexiconMufradatRoutes } from './routes/lexicon_mufradat';
import { lexiconLisanRoutes } from './routes/lexicon_lisan';
import { lexiconLaneRoutes }  from './routes/lexicon_lane';
import { scholarshipRoutes }  from './routes/scholarship';
import { expressionRoutes } from './routes/expressions';
import { nearSynonymRoutes } from './routes/near_synonyms';
import { sourceRagRoutes } from './routes/source_rag';
import { wordViewRoutes } from './routes/word_view';
import { wordAnalysisRoutes } from './routes/word_analysis';

const router = new Router<ArLinguisticsEnv>();

// Health
router.get('/health', async (_req, env) =>
  ok({ domain: 'ar-linguistics', db: 'DB_AL', db_ok: await dbHealth(env.DB_AL) }),
);

// Domain routes
rootRoutes(router);
lemmaRoutes(router);
morphologyRoutes(router);
nahwRoutes(router);
balaghaRoutes(router);
lexiconRoutes(router);
lexiconFiveLensRoutes(router);
lexiconV2Routes(router);
lexiconMufradatRoutes(router);
lexiconLisanRoutes(router);
lexiconLaneRoutes(router);
scholarshipRoutes(router);
expressionRoutes(router);
nearSynonymRoutes(router);
sourceRagRoutes(router);
wordViewRoutes(router);          // /al/verb-government/:root, /al/root-antonyms/:root, /al/expressions/by-root/:root
wordAnalysisRoutes(router);      // /al/word-analysis?roots= — deep root layer for the word modal

export default {
  fetch: (request: Request, env: ArLinguisticsEnv) => router.handle(request, env),
} satisfies ExportedHandler<ArLinguisticsEnv>;
