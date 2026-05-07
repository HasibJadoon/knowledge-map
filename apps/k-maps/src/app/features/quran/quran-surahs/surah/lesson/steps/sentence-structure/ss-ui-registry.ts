// ── K-Maps Sentence Structure UI Registry ────────────────────────────────────
// Single source of truth for node colours, labels, and icons.
// Keyed by id_ref from the canonical ui_registry JSON spec.

export interface NodeUiDef {
  bg: string;
  text: string;
  border: string;
  label_ar: string;
}

// ── Full flat registry (id_ref → NodeUiDef) ──────────────────────────────────

export const UI_REGISTRY: Record<string, NodeUiDef> = {

  // ── word_types ──────────────────────────────────────────────────────────────
  noun:     { bg: '#34C759', text: '#FFFFFF', border: '#1E7D3A', label_ar: 'اسم' },
  verb:     { bg: '#FF3B30', text: '#FFFFFF', border: '#A61B14', label_ar: 'فعل' },
  particle: { bg: '#AF52DE', text: '#FFFFFF', border: '#6D28A9', label_ar: 'حرف' },

  // ── syntactic_functions ─────────────────────────────────────────────────────
  mubtada:        { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'مبتدأ' },
  khabar:         { bg: '#0EA5E9', text: '#FFFFFF', border: '#0369A1', label_ar: 'خبر' },
  ism_kana:       { bg: '#16A34A', text: '#FFFFFF', border: '#15803D', label_ar: 'اسم كان' },
  khabar_kana:    { bg: '#0284C7', text: '#FFFFFF', border: '#075985', label_ar: 'خبر كان' },
  ism_inna:       { bg: '#16A34A', text: '#FFFFFF', border: '#15803D', label_ar: 'اسم إن' },
  khabar_inna:    { bg: '#0284C7', text: '#FFFFFF', border: '#075985', label_ar: 'خبر إن' },
  verb_function:  { bg: '#EF4444', text: '#FFFFFF', border: '#B91C1C', label_ar: 'فعل' },
  fail:           { bg: '#16A34A', text: '#FFFFFF', border: '#15803D', label_ar: 'فاعل' },
  naib_fail:      { bg: '#059669', text: '#FFFFFF', border: '#047857', label_ar: 'نائب فاعل' },
  maful_bih:      { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C', label_ar: 'مفعول به' },
  maful_mutlaq:   { bg: '#B91C1C', text: '#FFFFFF', border: '#991B1B', label_ar: 'مفعول مطلق' },
  maful_fih:      { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'مفعول فيه' },
  maful_li_ajlih: { bg: '#F97316', text: '#FFFFFF', border: '#C2410C', label_ar: 'مفعول لأجله' },
  maful_maah:     { bg: '#8B5CF6', text: '#FFFFFF', border: '#6D28D9', label_ar: 'مفعول معه' },
  maful_awwal:    { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C', label_ar: 'مفعول أول' },
  maful_thani:    { bg: '#B91C1C', text: '#FFFFFF', border: '#991B1B', label_ar: 'مفعول ثان' },
  maful_thalith:  { bg: '#991B1B', text: '#FFFFFF', border: '#7F1D1D', label_ar: 'مفعول ثالث' },
  hal:            { bg: '#A855F7', text: '#FFFFFF', border: '#7E22CE', label_ar: 'حال' },
  tamyiz:         { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'تمييز' },
  mustathna:      { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563', label_ar: 'مستثنى' },
  munada:         { bg: '#EC4899', text: '#FFFFFF', border: '#BE185D', label_ar: 'منادى' },
  ism_la:         { bg: '#4B5563', text: '#FFFFFF', border: '#374151', label_ar: 'اسم لا' },
  khabar_la:      { bg: '#374151', text: '#FFFFFF', border: '#1F2937', label_ar: 'خبر لا' },
  mudaf:          { bg: '#0F766E', text: '#FFFFFF', border: '#115E59', label_ar: 'مضاف' },
  mudaf_ilayh:    { bg: '#14B8A6', text: '#FFFFFF', border: '#0F766E', label_ar: 'مضاف إليه' },
  ism_majrur:     { bg: '#7C3AED', text: '#FFFFFF', border: '#5B21B6', label_ar: 'اسم مجرور' },
  jar:            { bg: '#8B5CF6', text: '#FFFFFF', border: '#6D28D9', label_ar: 'جار' },
  majrur:         { bg: '#6D28D9', text: '#FFFFFF', border: '#5B21B6', label_ar: 'مجرور' },
  silat_almawsul: { bg: '#0F766E', text: '#FFFFFF', border: '#115E59', label_ar: 'صلة الموصول' },
  jawab_alshart:  { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'جواب الشرط' },
  jawab_alqasm:   { bg: '#A16207', text: '#FFFFFF', border: '#713F12', label_ar: 'جواب القسم' },

  // ── particle_types ──────────────────────────────────────────────────────────
  harf_jar:       { bg: '#7C3AED', text: '#FFFFFF', border: '#5B21B6', label_ar: 'حرف جر' },
  harf_nasb:      { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C', label_ar: 'حرف نصب' },
  harf_jazm:      { bg: '#6D28D9', text: '#FFFFFF', border: '#5B21B6', label_ar: 'حرف جزم' },
  harf_atf:       { bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8', label_ar: 'حرف عطف' },
  adat_shart:     { bg: '#8B5CF6', text: '#FFFFFF', border: '#6D28D9', label_ar: 'أداة شرط' },
  adat_istifham:  { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'أداة استفهام' },
  adat_nafy:      { bg: '#4B5563', text: '#FFFFFF', border: '#374151', label_ar: 'أداة نفي' },
  adat_nida:      { bg: '#EC4899', text: '#FFFFFF', border: '#BE185D', label_ar: 'أداة نداء' },
  adat_istithna:  { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563', label_ar: 'أداة استثناء' },
  adat_jawab:     { bg: '#22C55E', text: '#FFFFFF', border: '#15803D', label_ar: 'أداة جواب' },
  adat_tanbih:    { bg: '#F97316', text: '#FFFFFF', border: '#C2410C', label_ar: 'أداة تنبيه' },
  harf_tawkid:    { bg: '#DC2626', text: '#FFFFFF', border: '#991B1B', label_ar: 'حرف توكيد' },
  harf_tafsir:    { bg: '#10B981', text: '#FFFFFF', border: '#047857', label_ar: 'حرف تفسير' },
  harf_masdari:   { bg: '#14B8A6', text: '#FFFFFF', border: '#0F766E', label_ar: 'حرف مصدري' },

  // ── embedded_clause_functions ───────────────────────────────────────────────
  predicate_clause:          { bg: '#0EA5E9', text: '#FFFFFF', border: '#0369A1', label_ar: 'جملة خبر' },
  circumstantial_clause:     { bg: '#A855F7', text: '#FFFFFF', border: '#7E22CE', label_ar: 'جملة حال' },
  adjectival_clause:         { bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8', label_ar: 'جملة صفة' },
  relative_clause:           { bg: '#0F766E', text: '#FFFFFF', border: '#115E59', label_ar: 'جملة صلة' },
  conditional_answer_clause: { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'جملة جواب الشرط' },
  oath_answer_clause:        { bg: '#A16207', text: '#FFFFFF', border: '#713F12', label_ar: 'جملة جواب القسم' },
  object_slot_clause:        { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C', label_ar: 'جملة مفعول' },
  coordinated_clause:        { bg: '#7C3AED', text: '#FFFFFF', border: '#5B21B6', label_ar: 'جملة معطوفة' },
  independent_clause:        { bg: '#6366F1', text: '#FFFFFF', border: '#4338CA', label_ar: 'جملة مستأنفة' },
  interjected_clause:        { bg: '#A855F7', text: '#FFFFFF', border: '#7E22CE', label_ar: 'جملة اعتراضية' },
  tafsir_clause:             { bg: '#10B981', text: '#FFFFFF', border: '#047857', label_ar: 'جملة تفسيرية' },
  quoted_speech:             { bg: '#EC4899', text: '#FFFFFF', border: '#BE185D', label_ar: 'مقول القول' },

  // ── phrase_types ────────────────────────────────────────────────────────────
  prepositional_generic: { bg: '#06B6D4', text: '#FFFFFF', border: '#0E7490', label_ar: 'شبه جملة' },
  jar_majrur:            { bg: '#0891B2', text: '#FFFFFF', border: '#0E7490', label_ar: 'جار ومجرور' },
  zarf:                  { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'ظرف' },
  zarf_zaman:            { bg: '#EAB308', text: '#111827', border: '#A16207', label_ar: 'ظرف زمان' },
  zarf_makan:            { bg: '#F97316', text: '#FFFFFF', border: '#C2410C', label_ar: 'ظرف مكان' },
  idafa_phrase:          { bg: '#10B981', text: '#FFFFFF', border: '#047857', label_ar: 'مركب إضافي' },
  adjectival_phrase:     { bg: '#3B82F6', text: '#FFFFFF', border: '#1D4ED8', label_ar: 'مركب وصفي' },
  coordinative_phrase:   { bg: '#7C3AED', text: '#FFFFFF', border: '#5B21B6', label_ar: 'مركب عطفي' },
  substitution_phrase:   { bg: '#6366F1', text: '#FFFFFF', border: '#4338CA', label_ar: 'مركب بدلي' },
  emphatic_phrase:       { bg: '#DC2626', text: '#FFFFFF', border: '#991B1B', label_ar: 'مركب توكيدي' },
  vocative_construction: { bg: '#EC4899', text: '#FFFFFF', border: '#BE185D', label_ar: 'تركيب ندائي' },
  exception_construction:{ bg: '#4B5563', text: '#FFFFFF', border: '#374151', label_ar: 'تركيب استثنائي' },
  masdar_muawwal:        { bg: '#14B8A6', text: '#FFFFFF', border: '#0F766E', label_ar: 'مصدر مؤول' },

  // ── dependent_functions ─────────────────────────────────────────────────────
  naat:         { bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8', label_ar: 'نعت' },
  mawsuf:       { bg: '#3B82F6', text: '#FFFFFF', border: '#1D4ED8', label_ar: 'منعوت' },
  tawkid:       { bg: '#DC2626', text: '#FFFFFF', border: '#991B1B', label_ar: 'توكيد' },
  badal:        { bg: '#6366F1', text: '#FFFFFF', border: '#4338CA', label_ar: 'بدل' },
  atf_bayan:    { bg: '#10B981', text: '#FFFFFF', border: '#047857', label_ar: 'عطف بيان' },
  atf_nasaq:    { bg: '#7C3AED', text: '#FFFFFF', border: '#5B21B6', label_ar: 'عطف نسق' },
  maatuf:       { bg: '#8B5CF6', text: '#FFFFFF', border: '#6D28D9', label_ar: 'معطوف' },
  maatuf_alayh: { bg: '#6D28D9', text: '#FFFFFF', border: '#5B21B6', label_ar: 'معطوف عليه' },

  // ── case ────────────────────────────────────────────────────────────────────
  raf:   { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'مرفوع' },
  nasb:  { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C', label_ar: 'منصوب' },
  jarr:  { bg: '#7C3AED', text: '#FFFFFF', border: '#5B21B6', label_ar: 'مجرور' },
  jazm:  { bg: '#6D28D9', text: '#FFFFFF', border: '#5B21B6', label_ar: 'مجزوم' },
  mabni: { bg: '#4B5563', text: '#FFFFFF', border: '#374151', label_ar: 'مبني' },

  // ── verb_tense ──────────────────────────────────────────────────────────────
  past:       { bg: '#92400E', text: '#FFFFFF', border: '#78350F', label_ar: 'ماض' },
  present:    { bg: '#EF4444', text: '#FFFFFF', border: '#B91C1C', label_ar: 'مضارع' },
  imperative: { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'أمر' },

  // ── verb_voice ──────────────────────────────────────────────────────────────
  active:  { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'معلوم' },
  passive: { bg: '#8E8E93', text: '#FFFFFF', border: '#6B6B70', label_ar: 'مجهول' },

  // ── verb_mood ───────────────────────────────────────────────────────────────
  indicative:  { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'مرفوع' },
  subjunctive: { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C', label_ar: 'منصوب' },
  jussive:     { bg: '#6D28D9', text: '#FFFFFF', border: '#5B21B6', label_ar: 'مجزوم' },

  // ── clause_slot_status ──────────────────────────────────────────────────────
  has_i3rab_slot: { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'له محل' },
  no_i3rab_slot:  { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563', label_ar: 'لا محل' },

  // ── definiteness ────────────────────────────────────────────────────────────
  definite:   { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'معرفة' },
  indefinite: { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563', label_ar: 'نكرة' },

  // ── number ──────────────────────────────────────────────────────────────────
  singular: { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'مفرد' },
  dual:     { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'مثنى' },
  plural:   { bg: '#0EA5E9', text: '#FFFFFF', border: '#0369A1', label_ar: 'جمع' },

  // ── gender ──────────────────────────────────────────────────────────────────
  masculine: { bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8', label_ar: 'مذكر' },
  feminine:  { bg: '#EC4899', text: '#FFFFFF', border: '#BE185D', label_ar: 'مؤنث' },
  common:    { bg: '#8B5CF6', text: '#FFFFFF', border: '#6D28D9', label_ar: 'مشترك' },

  // ── person ──────────────────────────────────────────────────────────────────
  first_person:  { bg: '#22C55E', text: '#FFFFFF', border: '#16A34A', label_ar: 'متكلم' },
  second_person: { bg: '#F59E0B', text: '#111827', border: '#B45309', label_ar: 'مخاطب' },
  third_person:  { bg: '#6366F1', text: '#FFFFFF', border: '#4338CA', label_ar: 'غائب' },
};

// ── Color resolution priority (highest → lowest) ─────────────────────────────
const PRIORITY_KEYS = [
  'word_type',
  'syntactic_function',
  'clause_type',
  'phrase_type',
  'particle_type',
  'dependent_function',
] as const;

export const DEFAULT_UI: NodeUiDef = {
  bg: '#1e1e1e', text: '#9ca3af', border: '#2a2a2a', label_ar: '',
};

/** Resolve the primary colour for a node from its registry_refs object. */
export function resolveNodeUi(refs?: Record<string, string | null> | null): NodeUiDef {
  if (!refs) return DEFAULT_UI;
  for (const key of PRIORITY_KEYS) {
    const val = refs[key];
    if (val && UI_REGISTRY[val]) return UI_REGISTRY[val];
  }
  // Fallback: first non-null value that matches the registry
  for (const val of Object.values(refs)) {
    if (val && UI_REGISTRY[val]) return UI_REGISTRY[val];
  }
  return DEFAULT_UI;
}

/** Look up a single id_ref (case chip, tense chip, etc.) */
export function lookupUi(idRef: string | null | undefined): NodeUiDef {
  if (!idRef) return DEFAULT_UI;
  return UI_REGISTRY[idRef] ?? DEFAULT_UI;
}
