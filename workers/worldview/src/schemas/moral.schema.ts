// ─── Moral schemas & types ───────────────────────────────────────────────

export interface WvMoralAxis {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  axis_type: string;         // relational|virtue|obligation|eschatological|structural|other
  description_md: string | null;
  domain_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface WvMoralNorm {
  id: string;
  moral_axis_id: string | null;
  tradition_id: string | null;
  title: string;
  norm_type: string;         // duty|prohibition|ideal|counsel|custom|taboo|other
  scope: string | null;      // universal|community|individual|ritual
  description_md: string | null;
  created_at: string;
}

export interface WvNormSource {
  id: string;
  norm_id: string;
  source_type: string;       // scripture|commentary|institution|thinker|tradition|legal
  source_ref: string;        // WV:source_id or external ref
  locator: string | null;
  excerpt: string | null;
  note: string | null;
  created_at: string;
}

export interface WvVirtueProfile {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  description_md: string | null;
  scripture_refs: string | null; // JSON [ref_string]
  created_at: string;
}

export interface WvViceProfile {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  description_md: string | null;
  created_at: string;
}

export interface WvCovenantFramework {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  parties: string | null;         // JSON [{role,identity}]
  covenant_type: string;          // unilateral|bilateral|universal|communal|conditional|eternal
  key_sign: string | null;
  key_obligation: string | null;
  memory_practice: string | null;
  renewal_pattern: string | null;
  description_md: string | null;
  corpus_refs: string | null;     // JSON [corpus_unit_id]
  meta_json: string | null;
  created_at: string;
}

export interface WvSacrificeFramework {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  sacrifice_type: string;         // ritual|moral|communal|testing|substitution|atonement|surrender|remembrance|other
  key_example: string | null;
  theological_role: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvRevelationModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  revelation_type: string;        // prophetic|scriptural|incarnational|recitational|mystical|legal|natural|spirit_based|other
  medium: string | null;          // word|law|person|spirit|scripture
  continuity: string | null;      // ongoing|closed|progressive|final
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvPropheticModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  model_role: string;             // messenger|exemplar|mediator|lawgiver|suffering_servant|reformer|warner|intercessor|other
  key_attributes: string | null;  // JSON [string]
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvDivineHumanRelation {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  relation_type: string;          // covenantal|filial|servant|mystical|contractual|fearful|other
  key_qualities: string | null;   // JSON [string]
  description_md: string | null;
  created_at: string;
}

export interface WvLawMoralityLink {
  id: string;
  tradition_id: string | null;
  law_system: string;
  morality_domain: string;
  link_type: string;              // grounds|expresses|teaches|enforces|supplements|transcends|other
  description_md: string | null;
  created_at: string;
}

export interface WvSalvationRedemptionModel {
  id: string;
  slug: string;
  title: string;
  tradition_id: string | null;
  model_type: string;             // moral|substitutionary|participatory|progressive|restorative|covenantal|mystical|other
  sin_diagnosis: string | null;
  remedy: string | null;
  final_hope: string | null;
  description_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface MoralAxisCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  axis_type?: string;
  description_md?: string | null;
  domain_id?: string | null;
  sort_order?: number;
}

export interface MoralNormCreate {
  title: string;
  moral_axis_id?: string | null;
  tradition_id?: string | null;
  norm_type?: string;
  scope?: string | null;
  description_md?: string | null;
}

export interface NormSourceCreate {
  norm_id: string;
  source_type?: string;
  source_ref: string;
  locator?: string | null;
  excerpt?: string | null;
  note?: string | null;
}

export interface VirtueProfileCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
  scripture_refs?: string | null;
}

export interface ViceProfileCreate {
  slug: string;
  title: string;
  title_ar?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
}

export interface CovenantFrameworkCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  parties?: string | null;
  covenant_type?: string;
  key_sign?: string | null;
  key_obligation?: string | null;
  memory_practice?: string | null;
  renewal_pattern?: string | null;
  description_md?: string | null;
  corpus_refs?: string | null;
  meta_json?: string | null;
}

export interface SacrificeFrameworkCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  sacrifice_type?: string;
  key_example?: string | null;
  theological_role?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface RevelationModelCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  revelation_type?: string;
  medium?: string | null;
  continuity?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface PropheticModelCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  model_role?: string;
  key_attributes?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

export interface DivineHumanRelationCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  relation_type?: string;
  key_qualities?: string | null;
  description_md?: string | null;
}

export interface LawMoralityLinkCreate {
  law_system: string;
  morality_domain: string;
  tradition_id?: string | null;
  link_type?: string;
  description_md?: string | null;
}

export interface SalvationModelCreate {
  slug: string;
  title: string;
  tradition_id?: string | null;
  model_type?: string;
  sin_diagnosis?: string | null;
  remedy?: string | null;
  final_hope?: string | null;
  description_md?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateMoralAxisCreate(body: unknown): SchemaValidationResult<MoralAxisCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('axis_type' in b) {
    if (typeof b.axis_type !== 'string') return { error: 'axis_type must be a string' };
    data.axis_type = b.axis_type;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('domain_id' in b) {
    if (b.domain_id !== null && typeof b.domain_id !== 'string') return { error: 'domain_id must be a string or null' };
    data.domain_id = b.domain_id;
  }
  if ('sort_order' in b) {
    if (typeof b.sort_order !== 'number' || !Number.isFinite(b.sort_order)) return { error: 'sort_order must be a number' };
    data.sort_order = b.sort_order;
  }

  return { data: data as unknown as MoralAxisCreate };
}

export function validateMoralNormCreate(body: unknown): SchemaValidationResult<MoralNormCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('norm_type' in b) {
    if (typeof b.norm_type !== 'string') return { error: 'norm_type must be a string' };
    data.norm_type = b.norm_type;
  }
  if ('scope' in b) {
    if (b.scope !== null && typeof b.scope !== 'string') return { error: 'scope must be a string or null' };
    data.scope = b.scope;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as MoralNormCreate };
}

export function validateNormSourceCreate(body: unknown): SchemaValidationResult<NormSourceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.norm_id !== 'string' || !b.norm_id.trim()) return { error: 'norm_id is required and must be a non-empty string' };
  data.norm_id = b.norm_id.trim();
  if ('source_type' in b) {
    if (typeof b.source_type !== 'string') return { error: 'source_type must be a string' };
    data.source_type = b.source_type;
  }
  if (typeof b.source_ref !== 'string' || !b.source_ref.trim()) return { error: 'source_ref is required and must be a non-empty string' };
  data.source_ref = b.source_ref.trim();
  if ('locator' in b) {
    if (b.locator !== null && typeof b.locator !== 'string') return { error: 'locator must be a string or null' };
    data.locator = b.locator;
  }
  if ('excerpt' in b) {
    if (b.excerpt !== null && typeof b.excerpt !== 'string') return { error: 'excerpt must be a string or null' };
    data.excerpt = b.excerpt;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as NormSourceCreate };
}

export function validateVirtueProfileCreate(body: unknown): SchemaValidationResult<VirtueProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('scripture_refs' in b) {
    if (b.scripture_refs !== null && typeof b.scripture_refs !== 'string') return { error: 'scripture_refs must be a string or null' };
    data.scripture_refs = b.scripture_refs;
  }

  return { data: data as unknown as VirtueProfileCreate };
}

export function validateViceProfileCreate(body: unknown): SchemaValidationResult<ViceProfileCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as ViceProfileCreate };
}

export function validateCovenantFrameworkCreate(body: unknown): SchemaValidationResult<CovenantFrameworkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('parties' in b) {
    if (b.parties !== null && typeof b.parties !== 'string') return { error: 'parties must be a string or null' };
    data.parties = b.parties;
  }
  if ('covenant_type' in b) {
    if (typeof b.covenant_type !== 'string') return { error: 'covenant_type must be a string' };
    data.covenant_type = b.covenant_type;
  }
  if ('key_sign' in b) {
    if (b.key_sign !== null && typeof b.key_sign !== 'string') return { error: 'key_sign must be a string or null' };
    data.key_sign = b.key_sign;
  }
  if ('key_obligation' in b) {
    if (b.key_obligation !== null && typeof b.key_obligation !== 'string') return { error: 'key_obligation must be a string or null' };
    data.key_obligation = b.key_obligation;
  }
  if ('memory_practice' in b) {
    if (b.memory_practice !== null && typeof b.memory_practice !== 'string') return { error: 'memory_practice must be a string or null' };
    data.memory_practice = b.memory_practice;
  }
  if ('renewal_pattern' in b) {
    if (b.renewal_pattern !== null && typeof b.renewal_pattern !== 'string') return { error: 'renewal_pattern must be a string or null' };
    data.renewal_pattern = b.renewal_pattern;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('corpus_refs' in b) {
    if (b.corpus_refs !== null && typeof b.corpus_refs !== 'string') return { error: 'corpus_refs must be a string or null' };
    data.corpus_refs = b.corpus_refs;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CovenantFrameworkCreate };
}

export function validateSacrificeFrameworkCreate(body: unknown): SchemaValidationResult<SacrificeFrameworkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('sacrifice_type' in b) {
    if (typeof b.sacrifice_type !== 'string') return { error: 'sacrifice_type must be a string' };
    data.sacrifice_type = b.sacrifice_type;
  }
  if ('key_example' in b) {
    if (b.key_example !== null && typeof b.key_example !== 'string') return { error: 'key_example must be a string or null' };
    data.key_example = b.key_example;
  }
  if ('theological_role' in b) {
    if (b.theological_role !== null && typeof b.theological_role !== 'string') return { error: 'theological_role must be a string or null' };
    data.theological_role = b.theological_role;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as SacrificeFrameworkCreate };
}

export function validateRevelationModelCreate(body: unknown): SchemaValidationResult<RevelationModelCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('revelation_type' in b) {
    if (typeof b.revelation_type !== 'string') return { error: 'revelation_type must be a string' };
    data.revelation_type = b.revelation_type;
  }
  if ('medium' in b) {
    if (b.medium !== null && typeof b.medium !== 'string') return { error: 'medium must be a string or null' };
    data.medium = b.medium;
  }
  if ('continuity' in b) {
    if (b.continuity !== null && typeof b.continuity !== 'string') return { error: 'continuity must be a string or null' };
    data.continuity = b.continuity;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as RevelationModelCreate };
}

export function validatePropheticModelCreate(body: unknown): SchemaValidationResult<PropheticModelCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('model_role' in b) {
    if (typeof b.model_role !== 'string') return { error: 'model_role must be a string' };
    data.model_role = b.model_role;
  }
  if ('key_attributes' in b) {
    if (b.key_attributes !== null && typeof b.key_attributes !== 'string') return { error: 'key_attributes must be a string or null' };
    data.key_attributes = b.key_attributes;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as PropheticModelCreate };
}

export function validateDivineHumanRelationCreate(body: unknown): SchemaValidationResult<DivineHumanRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('relation_type' in b) {
    if (typeof b.relation_type !== 'string') return { error: 'relation_type must be a string' };
    data.relation_type = b.relation_type;
  }
  if ('key_qualities' in b) {
    if (b.key_qualities !== null && typeof b.key_qualities !== 'string') return { error: 'key_qualities must be a string or null' };
    data.key_qualities = b.key_qualities;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as DivineHumanRelationCreate };
}

export function validateLawMoralityLinkCreate(body: unknown): SchemaValidationResult<LawMoralityLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.law_system !== 'string' || !b.law_system.trim()) return { error: 'law_system is required and must be a non-empty string' };
  data.law_system = b.law_system.trim();
  if (typeof b.morality_domain !== 'string' || !b.morality_domain.trim()) return { error: 'morality_domain is required and must be a non-empty string' };
  data.morality_domain = b.morality_domain.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('link_type' in b) {
    if (typeof b.link_type !== 'string') return { error: 'link_type must be a string' };
    data.link_type = b.link_type;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }

  return { data: data as unknown as LawMoralityLinkCreate };
}

export function validateSalvationModelCreate(body: unknown): SchemaValidationResult<SalvationModelCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('model_type' in b) {
    if (typeof b.model_type !== 'string') return { error: 'model_type must be a string' };
    data.model_type = b.model_type;
  }
  if ('sin_diagnosis' in b) {
    if (b.sin_diagnosis !== null && typeof b.sin_diagnosis !== 'string') return { error: 'sin_diagnosis must be a string or null' };
    data.sin_diagnosis = b.sin_diagnosis;
  }
  if ('remedy' in b) {
    if (b.remedy !== null && typeof b.remedy !== 'string') return { error: 'remedy must be a string or null' };
    data.remedy = b.remedy;
  }
  if ('final_hope' in b) {
    if (b.final_hope !== null && typeof b.final_hope !== 'string') return { error: 'final_hope must be a string or null' };
    data.final_hope = b.final_hope;
  }
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as SalvationModelCreate };
}
