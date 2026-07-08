// Typed contracts for the Morph Display Layer.
// The layer VOCABULARY is fixed (component); the CONTENT is data. Each layer casts
// `block.data as XData` — closing the `data: any` gap on the wire.

import { MorphBlockVm, Lang, Tri } from '../../../../../../../shared/services/quran/quran-surah.service';

/** Inputs every per-layer body component receives (from the host). */
export interface MorphBlockBody {
  block: MorphBlockVm;
  lang: Lang;
  heroWord?: string;   // bare lemma — used by the synthesis weave centre
}

// ── per-layer data shapes ─────────────────────────────────────────────────────
export interface RootDnaData { letters: string[]; core_ar?: string; frequency_quran?: number; }
export interface SarfData {
  pattern_ar?: string; from_ar?: string; to_ar?: string; rule?: string;
  features?: { k: string; v: string }[];
}
export interface DerivationsData { groups?: { form_ar: string; items: { ar: string; en: string }[] }[]; }
export interface IrabData { role_ar?: string; role_en?: string; position_ar?: string; sign_ar?: string; sources?: string[]; }
export interface LexiconData { entries?: { source: string; death: string; shade_ar: string; shade_en: string }[]; }
export interface SynthesisStrand { kind: string; badge: string; source: string; ar: string; en: string; concept?: string; icon?: string; }
export interface SynthesisData { output?: string | Tri; strands?: SynthesisStrand[]; }
export interface BalaghaData { formula_ar?: string; formula_en?: string; refs?: string[]; }
export interface MetaphorData { source_ar?: string; target_ar?: string; mapping?: string; }
export interface KindredEntry { ar: string; en: string; note: string; }
export interface KindredData { synonyms?: KindredEntry[]; contrast?: KindredEntry[]; }
export interface TranslatorsData { renderings?: { translator: string; text: string; reading: string }[]; }
export interface OccurrenceItem {
  ayah_key: string; kind_ar: string; en: string; text_ar: string; note?: string; note_en?: string;
  motif?: string; focus?: boolean; icon?: string;
}
export interface OccurrencesData { items?: OccurrenceItem[]; }
export interface DevelopmentData { stages?: { label_ar: string; label_en: string; note: string }[]; }
export interface TafsirData { entries?: { scholar: string; work: string; text: string }[]; }
export interface UsageMapData { axes?: { ar: string; en: string }[]; rows?: { ref: string; label: string; weights: number[] }[]; }
export interface StoryMovement {
  no: string; motif?: string; en: string; ar: string; accent?: string; text: string; text_en?: string;
  chips?: { ar: string; en: string }[]; icon?: string;
}
export interface MasterStoryData {
  medallion_ar?: string; medallion_root?: string; dropcap?: string;
  threads?: string[]; movements?: StoryMovement[];
}
export interface AttestationWitness {
  era_ar: string; era_en: string; kind_ar: string; phrase_ar: string; gloss_en: string;
  image_ar?: string; image_en?: string; motif?: string; lex_source?: string; lex_ar?: string; lex_en?: string; icon?: string;
}
export interface AttestationsData { witnesses?: AttestationWitness[]; }
export interface ConstellationCenter { ar: string; root: string; }
export interface ConstellationNode { ar?: string; label?: string; en?: string; ur?: string; ring?: number; angle?: number; kind?: string; }
export interface ConstellationData { center?: ConstellationCenter | string; nodes?: ConstellationNode[]; }
