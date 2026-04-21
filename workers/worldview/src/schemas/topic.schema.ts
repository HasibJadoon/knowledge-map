// ─── Topic schemas & types ───────────────────────────────────────────────

export interface WvTopic {
  id: string;               // WV:ULID
  topic_key: string;
  title: string;
  title_ar: string | null;
  topic_domain: string;     // theology|ethics|anthropology|eschatology|prophethood|law|cosmology|psychology|sociology|history|worldview|modernity|coloniality|discernment|other
  parent_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  description_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvClaim {
  id: string;
  title: string;
  claim_text: string;
  claim_type: string;       // doctrinal|historical|moral|sociological|civilizational|comparative|theological|interpretive|other
  topic_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  person_id: string | null;
  school_id: string | null;
  certainty_level: string;  // assertion|position|hypothesis|question|consensus|contested
  status: string;           // active|...
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvClaimType {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface WvArgument {
  id: string;
  title: string;
  argument_text: string;
  argument_type: string;    // deductive|inductive|abductive|analogical|historical|moral|other
  topic_id: string | null;
  tradition_id: string | null;
  person_id: string | null;
  school_id: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface WvArgumentRelation {
  id: string;
  from_arg_id: string;
  to_arg_id: string | null;
  to_claim_id: string | null;
  relation_type: string;    // supports|contradicts|reframes|qualifies|synthesizes|inherits|answers|presupposes|other
  note: string | null;
  created_at: string;
}

export interface WvEvidenceItem {
  id: string;
  title: string | null;
  evidence_type: string;    // scriptural|historical|archaeological|testimonial|logical|statistical|comparative|traditional|other
  source_id: string | null;
  source_unit_id: string | null;
  locator: string | null;
  excerpt: string | null;
  qr_scope_ref: string | null;  // 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  al_concept_ref: string | null; // 'AL:<lemma_id>'
  cm_doc_ref: string | null;    // 'CM:<doc_id>'
  meta_json: string | null;
  created_at: string;
}

export interface WvClaimEvidenceLink {
  id: string;
  claim_id: string;
  evidence_id: string;
  link_role: string;        // supports|questions|illustrates|cites|counters|contextualizes
  note: string | null;
  created_at: string;
}

export interface WvQuestion {
  id: string;
  question_text: string;
  question_type: string;    // open|comparative|unresolved_tension|research_gap|polemical|other
  topic_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  status: string;           // open|partially_answered|closed
  meta_json: string | null;
  created_at: string;
}

export interface WvDebateCluster {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  topic_id: string | null;
  moral_axis_id: string | null;
  status: string;           // active|...
  created_at: string;
}

export interface WvDebateClusterMember {
  id: string;
  cluster_id: string;
  entity_type: string;      // claim|argument|question|value_position
  entity_id: string;
  stance: string | null;    // supporting|opposing|neutral|moderating
  created_at: string;
}

export interface WvValuePosition {
  id: string;
  moral_axis_id: string;
  tradition_id: string | null;
  school_id: string | null;
  person_id: string | null;
  position_title: string;
  position_text: string;
  position_type: string;    // normative|descriptive|critical|revisionist|comparative
  evidence_refs: string | null; // JSON [evidence_item_id]
  meta_json: string | null;
  created_at: string;
}

export interface TopicCreate {
  topic_key: string;
  title: string;
  title_ar?: string | null;
  topic_domain?: string;
  parent_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
}

export interface TopicPatch {
  title?: string;
  title_ar?: string | null;
  topic_domain?: string;
  parent_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  description_md?: string | null;
}

export interface ClaimCreate {
  title: string;
  claim_text: string;
  claim_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  person_id?: string | null;
  school_id?: string | null;
  certainty_level?: string;
  status?: string;
  meta_json?: string | null;
}

export interface ClaimPatch {
  title?: string;
  claim_text?: string;
  claim_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  person_id?: string | null;
  school_id?: string | null;
  certainty_level?: string;
  status?: string;
  meta_json?: string | null;
}

export interface ClaimTypeCreate {
  slug: string;
  title: string;
  description?: string | null;
}

export interface ArgumentCreate {
  title: string;
  argument_text: string;
  argument_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  person_id?: string | null;
  school_id?: string | null;
  meta_json?: string | null;
}

export interface ArgumentRelationCreate {
  from_arg_id: string;
  to_arg_id?: string | null;
  to_claim_id?: string | null;
  relation_type?: string;
  note?: string | null;
}

export interface EvidenceCreate {
  title?: string | null;
  evidence_type?: string;
  source_id?: string | null;
  source_unit_id?: string | null;
  locator?: string | null;
  excerpt?: string | null;
  qr_scope_ref?: string | null;
  al_concept_ref?: string | null;
  cm_doc_ref?: string | null;
  meta_json?: string | null;
}

export interface ClaimEvidenceLinkCreate {
  claim_id: string;
  evidence_id: string;
  link_role?: string;
  note?: string | null;
}

export interface QuestionCreate {
  question_text: string;
  question_type?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  status?: string;
  meta_json?: string | null;
}

export interface DebateClusterCreate {
  slug: string;
  title: string;
  description_md?: string | null;
  topic_id?: string | null;
  moral_axis_id?: string | null;
  status?: string;
}

export interface DebateClusterMemberCreate {
  cluster_id: string;
  entity_type: string;
  entity_id: string;
  stance?: string | null;
}

export interface ValuePositionCreate {
  moral_axis_id: string;
  position_title: string;
  position_text: string;
  tradition_id?: string | null;
  school_id?: string | null;
  person_id?: string | null;
  position_type?: string;
  evidence_refs?: string | null;
  meta_json?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateTopicCreate(body: unknown): SchemaValidationResult<TopicCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.topic_key !== 'string' || !b.topic_key.trim()) return { error: 'topic_key is required and must be a non-empty string' };
  data.topic_key = b.topic_key.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('topic_domain' in b) {
    if (typeof b.topic_domain !== 'string') return { error: 'topic_domain must be a string' };
    data.topic_domain = b.topic_domain;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
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

  return { data: data as unknown as TopicCreate };
}

export function validateTopicPatch(body: unknown): SchemaValidationResult<TopicPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('topic_domain' in b) {
    if (typeof b.topic_domain !== 'string') return { error: 'topic_domain must be a string' };
    data.topic_domain = b.topic_domain;
  }
  if ('parent_id' in b) {
    if (b.parent_id !== null && typeof b.parent_id !== 'string') return { error: 'parent_id must be a string or null' };
    data.parent_id = b.parent_id;
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

  return { data: data as unknown as TopicPatch };
}

export function validateClaimCreate(body: unknown): SchemaValidationResult<ClaimCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if (typeof b.claim_text !== 'string' || !b.claim_text.trim()) return { error: 'claim_text is required and must be a non-empty string' };
  data.claim_text = b.claim_text.trim();
  if ('claim_type' in b) {
    if (typeof b.claim_type !== 'string') return { error: 'claim_type must be a string' };
    data.claim_type = b.claim_type;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('person_id' in b) {
    if (b.person_id !== null && typeof b.person_id !== 'string') return { error: 'person_id must be a string or null' };
    data.person_id = b.person_id;
  }
  if ('school_id' in b) {
    if (b.school_id !== null && typeof b.school_id !== 'string') return { error: 'school_id must be a string or null' };
    data.school_id = b.school_id;
  }
  if ('certainty_level' in b) {
    if (typeof b.certainty_level !== 'string') return { error: 'certainty_level must be a string' };
    data.certainty_level = b.certainty_level;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ClaimCreate };
}

export function validateClaimPatch(body: unknown): SchemaValidationResult<ClaimPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('claim_text' in b) {
    if (typeof b.claim_text !== 'string') return { error: 'claim_text must be a string' };
    data.claim_text = b.claim_text;
  }
  if ('claim_type' in b) {
    if (typeof b.claim_type !== 'string') return { error: 'claim_type must be a string' };
    data.claim_type = b.claim_type;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('person_id' in b) {
    if (b.person_id !== null && typeof b.person_id !== 'string') return { error: 'person_id must be a string or null' };
    data.person_id = b.person_id;
  }
  if ('school_id' in b) {
    if (b.school_id !== null && typeof b.school_id !== 'string') return { error: 'school_id must be a string or null' };
    data.school_id = b.school_id;
  }
  if ('certainty_level' in b) {
    if (typeof b.certainty_level !== 'string') return { error: 'certainty_level must be a string' };
    data.certainty_level = b.certainty_level;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ClaimPatch };
}

export function validateClaimTypeCreate(body: unknown): SchemaValidationResult<ClaimTypeCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }

  return { data: data as unknown as ClaimTypeCreate };
}

export function validateArgumentCreate(body: unknown): SchemaValidationResult<ArgumentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if (typeof b.argument_text !== 'string' || !b.argument_text.trim()) return { error: 'argument_text is required and must be a non-empty string' };
  data.argument_text = b.argument_text.trim();
  if ('argument_type' in b) {
    if (typeof b.argument_type !== 'string') return { error: 'argument_type must be a string' };
    data.argument_type = b.argument_type;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('person_id' in b) {
    if (b.person_id !== null && typeof b.person_id !== 'string') return { error: 'person_id must be a string or null' };
    data.person_id = b.person_id;
  }
  if ('school_id' in b) {
    if (b.school_id !== null && typeof b.school_id !== 'string') return { error: 'school_id must be a string or null' };
    data.school_id = b.school_id;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ArgumentCreate };
}

export function validateArgumentRelationCreate(body: unknown): SchemaValidationResult<ArgumentRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.from_arg_id !== 'string' || !b.from_arg_id.trim()) return { error: 'from_arg_id is required and must be a non-empty string' };
  data.from_arg_id = b.from_arg_id.trim();
  if ('to_arg_id' in b) {
    if (b.to_arg_id !== null && typeof b.to_arg_id !== 'string') return { error: 'to_arg_id must be a string or null' };
    data.to_arg_id = b.to_arg_id;
  }
  if ('to_claim_id' in b) {
    if (b.to_claim_id !== null && typeof b.to_claim_id !== 'string') return { error: 'to_claim_id must be a string or null' };
    data.to_claim_id = b.to_claim_id;
  }
  if ('relation_type' in b) {
    if (typeof b.relation_type !== 'string') return { error: 'relation_type must be a string' };
    data.relation_type = b.relation_type;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as ArgumentRelationCreate };
}

export function validateEvidenceCreate(body: unknown): SchemaValidationResult<EvidenceCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if ('evidence_type' in b) {
    if (typeof b.evidence_type !== 'string') return { error: 'evidence_type must be a string' };
    data.evidence_type = b.evidence_type;
  }
  if ('source_id' in b) {
    if (b.source_id !== null && typeof b.source_id !== 'string') return { error: 'source_id must be a string or null' };
    data.source_id = b.source_id;
  }
  if ('source_unit_id' in b) {
    if (b.source_unit_id !== null && typeof b.source_unit_id !== 'string') return { error: 'source_unit_id must be a string or null' };
    data.source_unit_id = b.source_unit_id;
  }
  if ('locator' in b) {
    if (b.locator !== null && typeof b.locator !== 'string') return { error: 'locator must be a string or null' };
    data.locator = b.locator;
  }
  if ('excerpt' in b) {
    if (b.excerpt !== null && typeof b.excerpt !== 'string') return { error: 'excerpt must be a string or null' };
    data.excerpt = b.excerpt;
  }
  if ('qr_scope_ref' in b) {
    if (b.qr_scope_ref !== null && typeof b.qr_scope_ref !== 'string') return { error: 'qr_scope_ref must be a string or null' };
    data.qr_scope_ref = b.qr_scope_ref;
  }
  if ('al_concept_ref' in b) {
    if (b.al_concept_ref !== null && typeof b.al_concept_ref !== 'string') return { error: 'al_concept_ref must be a string or null' };
    data.al_concept_ref = b.al_concept_ref;
  }
  if ('cm_doc_ref' in b) {
    if (b.cm_doc_ref !== null && typeof b.cm_doc_ref !== 'string') return { error: 'cm_doc_ref must be a string or null' };
    data.cm_doc_ref = b.cm_doc_ref;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as EvidenceCreate };
}

export function validateClaimEvidenceLinkCreate(body: unknown): SchemaValidationResult<ClaimEvidenceLinkCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.claim_id !== 'string' || !b.claim_id.trim()) return { error: 'claim_id is required and must be a non-empty string' };
  data.claim_id = b.claim_id.trim();
  if (typeof b.evidence_id !== 'string' || !b.evidence_id.trim()) return { error: 'evidence_id is required and must be a non-empty string' };
  data.evidence_id = b.evidence_id.trim();
  if ('link_role' in b) {
    if (typeof b.link_role !== 'string') return { error: 'link_role must be a string' };
    data.link_role = b.link_role;
  }
  if ('note' in b) {
    if (b.note !== null && typeof b.note !== 'string') return { error: 'note must be a string or null' };
    data.note = b.note;
  }

  return { data: data as unknown as ClaimEvidenceLinkCreate };
}

export function validateQuestionCreate(body: unknown): SchemaValidationResult<QuestionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.question_text !== 'string' || !b.question_text.trim()) return { error: 'question_text is required and must be a non-empty string' };
  data.question_text = b.question_text.trim();
  if ('question_type' in b) {
    if (typeof b.question_type !== 'string') return { error: 'question_type must be a string' };
    data.question_type = b.question_type;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as QuestionCreate };
}

export function validateDebateClusterCreate(body: unknown): SchemaValidationResult<DebateClusterCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.slug !== 'string' || !b.slug.trim()) return { error: 'slug is required and must be a non-empty string' };
  data.slug = b.slug.trim();
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('description_md' in b) {
    if (b.description_md !== null && typeof b.description_md !== 'string') return { error: 'description_md must be a string or null' };
    data.description_md = b.description_md;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }

  return { data: data as unknown as DebateClusterCreate };
}

export function validateDebateClusterMemberCreate(body: unknown): SchemaValidationResult<DebateClusterMemberCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.cluster_id !== 'string' || !b.cluster_id.trim()) return { error: 'cluster_id is required and must be a non-empty string' };
  data.cluster_id = b.cluster_id.trim();
  if (typeof b.entity_type !== 'string' || !b.entity_type.trim()) return { error: 'entity_type is required and must be a non-empty string' };
  data.entity_type = b.entity_type.trim();
  if (typeof b.entity_id !== 'string' || !b.entity_id.trim()) return { error: 'entity_id is required and must be a non-empty string' };
  data.entity_id = b.entity_id.trim();
  if ('stance' in b) {
    if (b.stance !== null && typeof b.stance !== 'string') return { error: 'stance must be a string or null' };
    data.stance = b.stance;
  }

  return { data: data as unknown as DebateClusterMemberCreate };
}

export function validateValuePositionCreate(body: unknown): SchemaValidationResult<ValuePositionCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.moral_axis_id !== 'string' || !b.moral_axis_id.trim()) return { error: 'moral_axis_id is required and must be a non-empty string' };
  data.moral_axis_id = b.moral_axis_id.trim();
  if (typeof b.position_title !== 'string' || !b.position_title.trim()) return { error: 'position_title is required and must be a non-empty string' };
  data.position_title = b.position_title.trim();
  if (typeof b.position_text !== 'string' || !b.position_text.trim()) return { error: 'position_text is required and must be a non-empty string' };
  data.position_text = b.position_text.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('school_id' in b) {
    if (b.school_id !== null && typeof b.school_id !== 'string') return { error: 'school_id must be a string or null' };
    data.school_id = b.school_id;
  }
  if ('person_id' in b) {
    if (b.person_id !== null && typeof b.person_id !== 'string') return { error: 'person_id must be a string or null' };
    data.person_id = b.person_id;
  }
  if ('position_type' in b) {
    if (typeof b.position_type !== 'string') return { error: 'position_type must be a string' };
    data.position_type = b.position_type;
  }
  if ('evidence_refs' in b) {
    if (b.evidence_refs !== null && typeof b.evidence_refs !== 'string') return { error: 'evidence_refs must be a string or null' };
    data.evidence_refs = b.evidence_refs;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as ValuePositionCreate };
}
