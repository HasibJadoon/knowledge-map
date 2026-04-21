// ─── Domain schemas & types ───────────────────────────────────────────────────

export interface ArDomain {
  id: string;                        // AR:ULID
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface ArDomainCreate {
  title: string;
  slug?: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface ArDomainPatch {
  slug?: string;
  title?: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

// ─── Domain Phrase ────────────────────────────────────────────────────────────

export interface ArDomainPhrase {
  id: string;                        // AR:ULID
  domain_id: string;
  arabic: string;
  transliteration: string | null;
  meaning_en: string;
  usage_context: string | null;
  level: string | null;              // A1–C2
  vocab_id: string | null;
  created_at: string;
}

export interface ArDomainPhraseCreate {
  domain_id: string;
  arabic: string;
  meaning_en: string;
  transliteration?: string | null;
  usage_context?: string | null;
  level?: string | null;
  vocab_id?: string | null;
}

export interface ArDomainPhrasePatch {
  arabic?: string;
  transliteration?: string | null;
  meaning_en?: string;
  usage_context?: string | null;
  level?: string | null;
  vocab_id?: string | null;
}

// ─── Scenario ─────────────────────────────────────────────────────────────────

export interface ArScenario {
  id: string;                        // AR:ULID
  domain_id: string;
  title: string;
  title_ar: string | null;
  scenario_type: string;
  level: string | null;              // A1–C2
  description_md: string | null;
  vocab_set_json: string | null;     // JSON [vocab_id]
  meta_json: string | null;
  created_at: string;
}

export interface ArScenarioCreate {
  domain_id: string;
  title: string;
  scenario_type?: string;
  level?: string | null;
  description_md?: string | null;
  title_ar?: string | null;
}

export interface ArScenarioPatch {
  title?: string;
  title_ar?: string | null;
  scenario_type?: string;
  level?: string | null;
  description_md?: string | null;
  vocab_set_json?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateArDomainCreate(
  body: unknown,
): { data: ArDomainCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      title: (b.title as string).trim(),
      slug: typeof b.slug === 'string' ? b.slug.trim() : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
      description: typeof b.description === 'string' ? b.description : b.description === null ? null : undefined,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    },
  };
}

export function validateArDomainPhraseCreate(
  body: unknown,
): { data: ArDomainPhraseCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.domain_id || typeof b.domain_id !== 'string') {
    return { error: 'domain_id is required and must be a string' };
  }
  if (!b.arabic || typeof b.arabic !== 'string' || b.arabic.trim() === '') {
    return { error: 'arabic is required and must be a non-empty string' };
  }
  if (!b.meaning_en || typeof b.meaning_en !== 'string' || b.meaning_en.trim() === '') {
    return { error: 'meaning_en is required and must be a non-empty string' };
  }

  return {
    data: {
      domain_id: b.domain_id as string,
      arabic: (b.arabic as string).trim(),
      meaning_en: (b.meaning_en as string).trim(),
      transliteration: typeof b.transliteration === 'string' ? b.transliteration : b.transliteration === null ? null : undefined,
      usage_context: typeof b.usage_context === 'string' ? b.usage_context : b.usage_context === null ? null : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      vocab_id: typeof b.vocab_id === 'string' ? b.vocab_id : b.vocab_id === null ? null : undefined,
    },
  };
}

export function validateArScenarioCreate(
  body: unknown,
): { data: ArScenarioCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!b.domain_id || typeof b.domain_id !== 'string') {
    return { error: 'domain_id is required and must be a string' };
  }
  if (!b.title || typeof b.title !== 'string' || b.title.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }

  return {
    data: {
      domain_id: b.domain_id as string,
      title: (b.title as string).trim(),
      scenario_type: typeof b.scenario_type === 'string' ? b.scenario_type : undefined,
      level: typeof b.level === 'string' ? b.level : b.level === null ? null : undefined,
      description_md: typeof b.description_md === 'string' ? b.description_md : b.description_md === null ? null : undefined,
      title_ar: typeof b.title_ar === 'string' ? b.title_ar : b.title_ar === null ? null : undefined,
    },
  };
}
