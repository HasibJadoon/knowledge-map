// ─── DomainRepo — ar_curriculum_domain + ar_curriculum_domain_phrase + ar_curriculum_scenario ───────────────
// Semantic domain registry for contextual acquisition.
// Domains group phrases and scenarios; scenarios carry vocab_set JSON.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Domain {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface DomainCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface DomainPhrase {
  id: string;
  domain_id: string;
  arabic: string;
  transliteration: string | null;
  meaning_en: string;
  usage_context: string | null;
  level: string | null;
  vocab_id: string | null;    // link to ar_vocabulary if exists
  created_at: string;
}

export interface DomainPhraseCreate {
  arabic: string;
  transliteration?: string | null;
  meaning_en: string;
  usage_context?: string | null;
  level?: string | null;
  vocab_id?: string | null;
}

export interface Scenario {
  id: string;
  domain_id: string;
  title: string;
  title_ar: string | null;
  scenario_type: string;      // dialogue|reading|listening|writing|speaking|other
  level: string | null;
  description_md: string | null;
  vocab_set_json: string | null;  // JSON [vocab_id]
  meta_json: string | null;
  created_at: string;
}

export interface ScenarioCreate {
  title: string;
  title_ar?: string | null;
  scenario_type?: string;
  level?: string | null;
  description_md?: string | null;
  vocab_set_json?: string | null;
  meta_json?: string | null;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const DOMAIN_COLS = `id, slug, title, title_ar, description, sort_order, created_at`;

const PHRASE_COLS = `id, domain_id, arabic, transliteration, meaning_en,
  usage_context, level, vocab_id, created_at`;

const SCENARIO_COLS = `id, domain_id, title, title_ar, scenario_type,
  level, description_md, vocab_set_json, meta_json, created_at`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class DomainRepo {
  constructor(private db: D1Database) {}

  // ── Domains ──────────────────────────────────────────────────────────────────

  list(opts: PaginateOptions = {}) {
    return paginate<Domain>(
      this.db,
      `SELECT ${DOMAIN_COLS} FROM ar_curriculum_domain ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_domain`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<Domain | null> {
    return queryOne<Domain>(
      this.db,
      `SELECT ${DOMAIN_COLS} FROM ar_curriculum_domain WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<Domain | null> {
    return queryOne<Domain>(
      this.db,
      `SELECT ${DOMAIN_COLS} FROM ar_curriculum_domain WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: DomainCreate): Promise<Domain> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_domain
         (id, slug, title, title_ar, description, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.title,
        input.title_ar ?? null,
        input.description ?? null,
        input.sort_order ?? 0,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  // ── Domain phrases ───────────────────────────────────────────────────────────

  phrases(domainId: string, level: string | null = null, opts: PaginateOptions = {}) {
    const where  = level ? 'WHERE domain_id = ? AND level = ?' : 'WHERE domain_id = ?';
    const params = level ? [domainId, level] : [domainId];
    return paginate<DomainPhrase>(
      this.db,
      `SELECT ${PHRASE_COLS} FROM ar_curriculum_domain_phrase ${where} ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_domain_phrase ${where}`,
      params,
      opts,
    );
  }

  async createPhrase(domainId: string, input: DomainPhraseCreate): Promise<DomainPhrase> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_domain_phrase
         (id, domain_id, arabic, transliteration, meaning_en,
          usage_context, level, vocab_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        domainId,
        input.arabic,
        input.transliteration ?? null,
        input.meaning_en,
        input.usage_context ?? null,
        input.level ?? null,
        input.vocab_id ?? null,
        now,
      ],
    );
    return (await queryOne<DomainPhrase>(
      this.db,
      `SELECT ${PHRASE_COLS} FROM ar_curriculum_domain_phrase WHERE id = ?`,
      [id],
    ))!;
  }

  // ── Scenarios ────────────────────────────────────────────────────────────────

  scenarios(domainId: string, opts: PaginateOptions = {}) {
    return paginate<Scenario>(
      this.db,
      `SELECT ${SCENARIO_COLS} FROM ar_curriculum_scenario WHERE domain_id = ? ORDER BY created_at`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_scenario WHERE domain_id = ?`,
      [domainId],
      opts,
    );
  }

  findScenario(id: string): Promise<Scenario | null> {
    return queryOne<Scenario>(
      this.db,
      `SELECT ${SCENARIO_COLS} FROM ar_curriculum_scenario WHERE id = ?`,
      [id],
    );
  }

  async createScenario(domainId: string, input: ScenarioCreate): Promise<Scenario> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_scenario
         (id, domain_id, title, title_ar, scenario_type, level,
          description_md, vocab_set_json, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        domainId,
        input.title,
        input.title_ar ?? null,
        input.scenario_type ?? 'dialogue',
        input.level ?? null,
        input.description_md ?? null,
        input.vocab_set_json ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findScenario(id))!;
  }
}
