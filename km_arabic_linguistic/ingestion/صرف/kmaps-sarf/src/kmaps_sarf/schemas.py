"""JSON schemas for LLM structured output.

Two extraction modes per §10 of the technical doc:
  sarf_only_extraction: lexicon/sarf-spine/idiom chunks
  tafsir_sarf_extraction: tafsir chunks; only morphology-linked claims allowed
"""
from __future__ import annotations


CONFIDENCE_ENUM = ["needs_review", "checked", "approved", "rejected"]

SARF_CLAIM_TYPES = [
    "root_core", "root_image", "root_extension", "derived_family",
    "sarf_pattern", "verb_form", "form_flavour", "masdar", "participle",
    "noun_type", "weak_root", "hamzated_root", "doubled_root",
    "inflection", "qiraat_morph_variant", "idiomatic_meaning",
    "verb_preposition_frame", "tadmeen_frame", "antonym_relation",
    "near_synonym_sarf_difference", "translation_loss", "academic_key_term_note",
]

TAFSIR_SARF_CLAIM_TYPES = [
    "tafsir_root_activation", "tafsir_form_reason", "tafsir_lemma_preference",
    "tafsir_masdar_force", "tafsir_participle_state", "tafsir_weak_root_note",
    "tafsir_qiraat_morph_variant", "tafsir_verb_frame", "tafsir_tadmeen",
    "tafsir_idiom", "tafsir_cross_verse_usage", "tafsir_antonym_boundary",
    "tafsir_translation_loss", "tafsir_surah_vocabulary_flow",
]

PREPOSITIONS = ["ب", "ل", "على", "إلى", "عن", "من", "في", "مع", "بين", ""]
OPPOSITION_TYPES = ["direct", "conceptual", "gradational", "complementary", "directional", "moral_charge"]
FRAME_TYPES = ["direct", "prep_object", "double_object", "idiom", "tadmeen"]


def _str(min_len: int = 0, max_len: int = 1500) -> dict:
    return {"type": "string", "minLength": min_len, "maxLength": max_len}


def sarf_extraction_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["claims", "warnings"],
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "claim_type", "claim_ar", "claim_en", "quote_ar",
                        "root", "lemma", "pattern", "quran_ref",
                        "confidence", "needs_review_reason",
                    ],
                    "properties": {
                        "claim_type": {"type": "string", "enum": SARF_CLAIM_TYPES},
                        "claim_ar": _str(0, 1200),
                        "claim_en": _str(0, 1200),
                        "quote_ar": _str(0, 1500),
                        "root": _str(0, 40),
                        "lemma": _str(0, 60),
                        "pattern": _str(0, 60),
                        "quran_ref": _str(0, 16),
                        "confidence": {"type": "string", "enum": ["needs_review", "checked"]},
                        "needs_review_reason": _str(0, 240),
                    },
                },
            },
            "verb_frames": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "root", "lemma", "verb_form", "preposition", "frame_type",
                        "literal_meaning_en", "idiomatic_meaning_en", "idiomatic_meaning_ar",
                        "quran_uses", "confidence",
                    ],
                    "properties": {
                        "root": _str(0, 40),
                        "lemma": _str(0, 60),
                        "verb_form": _str(0, 8),
                        "preposition": {"type": "string", "enum": PREPOSITIONS},
                        "frame_type": {"type": "string", "enum": FRAME_TYPES},
                        "literal_meaning_en": _str(0, 600),
                        "idiomatic_meaning_en": _str(0, 600),
                        "idiomatic_meaning_ar": _str(0, 600),
                        "quran_uses": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["ref", "quote_ar"],
                                "properties": {"ref": _str(0, 16), "quote_ar": _str(0, 600)},
                            },
                        },
                        "confidence": {"type": "string", "enum": ["needs_review", "checked"]},
                    },
                },
            },
            "antonyms": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "arabic", "root", "opposition_type", "opposition_note",
                        "pair_insight", "quran_uses",
                    ],
                    "properties": {
                        "arabic": _str(0, 60),
                        "root": _str(0, 40),
                        "opposition_type": {"type": "string", "enum": OPPOSITION_TYPES},
                        "opposition_note": _str(0, 400),
                        "pair_insight": _str(0, 600),
                        "quran_uses": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["ref", "quote_ar"],
                                "properties": {"ref": _str(0, 16), "quote_ar": _str(0, 600)},
                            },
                        },
                    },
                },
            },
            "warnings": {"type": "array", "items": _str(0, 300)},
        },
    }


def tafsir_sarf_extraction_schema() -> dict:
    base = sarf_extraction_schema()
    # Tighten claim_type to the tafsir-allowed list:
    base["properties"]["claims"]["items"]["properties"]["claim_type"]["enum"] = TAFSIR_SARF_CLAIM_TYPES
    return base
