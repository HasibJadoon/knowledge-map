// ─── Module routing table ─────────────────────────────────────────────────────
// Maps /api/{key}/... → the correct service-binding Fetcher.
//
// publicGet = true  → unauthenticated GET requests are allowed (read-only data)
// publicGet = false → every request requires a valid Bearer JWT

import type { BackendEnv } from './env';

export type ModuleKey = 'qr' | 'wv' | 'worldview' | 'ar' | 'al' | 'cm' | 'pl' | 'core';

export interface ModuleConfig {
  binding:   keyof Pick<BackendEnv, 'QURAN' | 'WORLDVIEW' | 'ARABIC' | 'AR_LINGUISTICS' | 'CONTENT' | 'PLANNER' | 'CORE'>;
  publicGet: boolean;
}

export const MODULE_MAP: Record<ModuleKey, ModuleConfig> = {
  qr:   { binding: 'QURAN',          publicGet: true  },
  wv:   { binding: 'WORLDVIEW',      publicGet: true  },
  worldview: { binding: 'WORLDVIEW', publicGet: true  },
  ar:   { binding: 'ARABIC',         publicGet: false },
  al:   { binding: 'AR_LINGUISTICS', publicGet: false },
  cm:   { binding: 'CONTENT',        publicGet: false },
  pl:   { binding: 'PLANNER',        publicGet: false },
  core: { binding: 'CORE',           publicGet: true  }, // login / register are public
};
