// ─── km-quran-worker entry point ──────────────────────────────────────────────
// Owns DB_QR (km_quran). All cross-domain reads go through service bindings
// AR_LINGUISTICS, WORLDVIEW, and CONTENT — never by binding their D1 databases.

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { QuranEnv } from './env';

import { surahRoutes } from './routes/surahs';
import { ayahRoutes } from './routes/ayahs';
import { passageRoutes } from './routes/passages';
import { wordRoutes } from './routes/words';
import { translationRoutes } from './routes/translations';
import { studyRoutes } from './routes/study';
import { pageRoutes } from './routes/pages';
import { menuRoutes } from './routes/menu';
import { readerRoutes } from './routes/reader';
import { vocabularyRoutes } from './routes/vocabulary';
import { morphologyRoutes } from './routes/morphology';
import { worldviewRoutes } from './routes/worldview';
import { tafsirRoutes } from './routes/tafsir';
import { irabRoutes } from './routes/irab';
import { iraabDisplayRoutes } from './routes/iraab-display';
import { tafsirDisplayRoutes } from './routes/tafsir-display';
import { lexiconRoutes } from './routes/lexicon';
import { depGraphRoutes } from './routes/dep-graphs';
import { mushafRoutes } from './routes/mushaf';

const router = new Router<QuranEnv>();

// Health
router.get('/health', async (_req, env) =>
  ok({ domain: 'quran', db: 'DB_QR', db_ok: await dbHealth(env.DB_QR) }),
);

// Domain routes
menuRoutes(router);          // GET /qr/menu — navigation dataset
surahRoutes(router);         // GET /qr/surahs, /qr/surahs/:id
readerRoutes(router);        // GET /qr/surahs/:id/reader — combined ayah+translation payload
vocabularyRoutes(router);    // GET /qr/surahs/:id/vocabulary — POS-grouped words
morphologyRoutes(router);    // GET /qr/surahs/:id/morphology — per-word morphology grid
worldviewRoutes(router);     // GET /qr/surahs/:id/worldview — Quran-scoped worldview projection data
ayahRoutes(router);          // GET /qr/ayahs, /qr/ayahs/search, /qr/ayahs/:s/:a
passageRoutes(router);       // GET /qr/passages, by-ayah, single, create, delete
wordRoutes(router);          // GET /qr/words, by-lemma, by-root
translationRoutes(router);   // GET /qr/translation-sources, /qr/translations
studyRoutes(router);         // GET /qr/study/surahs/:id — grid, passages, lesson, vocab, expressions
pageRoutes(router);          // GET /qr/pages/:page, /qr/surahs/:id/pages
mushafRoutes(router);        // GET /qr/mushaf/pages/:page — Quran.com-style Mushaf layout
tafsirRoutes(router);        // GET /qr/tafsir, /qr/scholars, /qr/works
tafsirDisplayRoutes(router); // GET /qr/tafsir/display, /qr/tafsir/display/sources, /search, /compare
irabRoutes(router);          // GET /qr/irab/book-sources, /qr/irab/book-entries
iraabDisplayRoutes(router);  // GET /qr/iraab/display, /qr/iraab/display/sources, /qr/iraab/display/search
lexiconRoutes(router);       // GET /qr/lexicon/lemmas, /qr/lexicon/roots
depGraphRoutes(router);      // GET /qr/irab/dep-graph/:surah/:ayah — SVG from R2; /meta — D1 metadata

export default {
  fetch: (request: Request, env: QuranEnv) => router.handle(request, env),
} satisfies ExportedHandler<QuranEnv>;
