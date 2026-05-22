// ─── Module routing table ─────────────────────────────────────────────────────
// Maps /api/{key}/... → the correct service-binding Fetcher.
//
// publicGet = true  → unauthenticated GET requests are allowed (read-only data)
// publicGet = false → every request requires a valid Bearer JWT

import type { BackendEnv } from './env';

export type ModuleKey =
  | 'qr' | 'wv' | 'worldview' | 'ar' | 'al' | 'cm' | 'pl' | 'core'
  | 'planner' | 'week' | 'st' | 'studio';

export interface ModuleConfig {
  binding:   keyof Pick<BackendEnv, 'QURAN' | 'WORLDVIEW' | 'ARABIC' | 'AR_LINGUISTICS' | 'CONTENT' | 'PLANNER' | 'STUDIO' | 'CORE'>;
  publicGet: boolean;
}

export const MODULE_MAP: Record<ModuleKey, ModuleConfig> = {
  qr:   { binding: 'QURAN',          publicGet: true  },
  wv:   { binding: 'WORLDVIEW',      publicGet: true  },
  worldview: { binding: 'WORLDVIEW', publicGet: true  },
  ar:   { binding: 'ARABIC',         publicGet: false },
  al:   { binding: 'AR_LINGUISTICS', publicGet: true  },
  cm:   { binding: 'CONTENT',        publicGet: false },
  pl:   { binding: 'PLANNER',        publicGet: false },
  core: { binding: 'CORE',           publicGet: true  }, // login / register are public
  // Weekly-sprint planner API (sp_planner) — same worker as `pl`.
  planner: { binding: 'PLANNER',     publicGet: false },
  week:    { binding: 'PLANNER',     publicGet: false },
  // Episode Studio — build podcast / tutorial / talking-head episodes.
  st:     { binding: 'STUDIO',       publicGet: false },
  studio: { binding: 'STUDIO',       publicGet: false },
};
