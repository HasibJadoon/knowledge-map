"""Single source of truth for source IDs, names, URLs, families.

Mirrors §4 of the technical doc. Used by downloaders, chunkers, and the SQL emitter.
"""
from __future__ import annotations

from .ids import src_id


def make_source_id(slug: str) -> str:
    return src_id("kmaps-sarf", slug)


SOURCES: dict[str, dict] = {
    # ---- Spine (already loaded elsewhere; registered for traceability) ----
    "SRC:QUL:WORD_ROOT": {
        "url": "https://qul.tarteel.ai/resources/morphology/76",
        "title_ar": "QUL - جذور الكلمات",
        "title_en": "QUL Word Root SQLite",
        "source_type": "morphology_spine",
        "family": "sarf_spine",
    },
    "SRC:QUL:WORD_LEMMA": {
        "url": "https://qul.tarteel.ai/resources/morphology/75",
        "title_ar": "QUL - لمَّات الكلمات",
        "title_en": "QUL Word Lemma SQLite",
        "source_type": "morphology_spine",
        "family": "sarf_spine",
    },
    "SRC:QUL:WORD_STEM": {
        "url": "https://qul.tarteel.ai/resources/morphology/77",
        "title_ar": "QUL - جذع الكلمات",
        "title_en": "QUL Word Stem SQLite",
        "source_type": "morphology_spine",
        "family": "sarf_spine",
    },
    "SRC:QAC": {
        "url": "https://corpus.quran.com/",
        "title_ar": "Quranic Arabic Corpus",
        "title_en": "Quranic Arabic Corpus",
        "source_type": "morphology_spine",
        "family": "sarf_spine",
    },
    "SRC:MASAQ": {
        "url": "https://data.mendeley.com/datasets/9yvrzxktmr/6",
        "title_ar": "MASAQ Dataset",
        "title_en": "MASAQ annotated Quran dataset",
        "source_type": "morphology_spine",
        "family": "sarf_spine",
    },

    # ---- QUL tafsir ----
    "SRC:QUL:TAFSIR:IBN_ASHUR": {
        "url": "https://qul.tarteel.ai/resources/tafsir/25",
        "title_ar": "تفسير ابن عاشور (QUL)",
        "title_en": "Ibn Ashur - QUL",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:QUL:TAFSIR:IBN_KATHIR": {
        "url": "https://qul.tarteel.ai/resources/tafsir/35",
        "title_ar": "تفسير ابن كثير (QUL)",
        "title_en": "Ibn Kathir - QUL",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },

    # ---- Shamela lexicons ----
    "SRC:SHAMELA:JABAL": {
        "url": "https://shamela.ws/book/21017",
        "title_ar": "المعجم الاشتقاقي",
        "title_en": "Jabal - Mu'jam Ishtiqaqi",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:SHAMELA:LISAN": {
        "url": "https://shamela.ws/book/1687",
        "title_ar": "لسان العرب",
        "title_en": "Lisan al-Arab",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:SHAMELA:RAGHIB": {
        "url": "https://shamela.ws/book/23636",
        "title_ar": "مفردات ألفاظ القرآن",
        "title_en": "Raghib - Mufradat",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:SHAMELA:BASAIR": {
        "url": "https://shamela.ws/book/9856",
        "title_ar": "بصائر ذوي التمييز",
        "title_en": "Basa'ir Dhawi al-Tamyiz",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:SHAMELA:MAQAYIS": {
        "url": "https://shamela.ws/book/21710",
        "title_ar": "مقاييس اللغة",
        "title_en": "Maqayis al-Lugha",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:SHAMELA:SAFI_JADWAL": {
        "url": "https://shamela.ws/book/22916",
        "title_ar": "الجدول في إعراب القرآن",
        "title_en": "Safi - al-Jadwal",
        "source_type": "tafsir_linguistic",
        "family": "sarf_spine",
    },
    "SRC:SHAMELA:DARWISH": {
        "url": "https://shamela.ws/book/2163",
        "title_ar": "إعراب القرآن وبيانه",
        "title_en": "Darwish - I'rab",
        "source_type": "tafsir_linguistic",
        "family": "sarf_spine",
    },
    "SRC:SHAMELA:DURR_MASUN": {
        "url": "https://shamela.ws/book/9057",
        "title_ar": "الدر المصون",
        "title_en": "al-Durr al-Masun",
        "source_type": "tafsir_linguistic",
        "family": "sarf_spine",
    },

    # ---- Shamela tafsir ----
    "SRC:SHAMELA:IBN_ASHUR_TAHRIR": {
        "url": "https://shamela.ws/book/9776",
        "title_ar": "التحرير والتنوير",
        "title_en": "Ibn Ashur - Tahrir wa Tanwir",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:KASHSHAF": {
        "url": "https://shamela.ws/book/23627",
        "title_ar": "الكشاف",
        "title_en": "Zamakhshari - al-Kashshaf",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:BAHR": {
        "url": "https://shamela.ws/book/23591",
        "title_ar": "البحر المحيط",
        "title_en": "Abu Hayyan - al-Bahr al-Muhit",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:ALUSI": {
        "url": "https://shamela.ws/book/22835",
        "title_ar": "روح المعاني",
        "title_en": "Alusi - Ruh al-Ma'ani",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:RAZI": {
        "url": "https://shamela.ws/book/23635",
        "title_ar": "مفاتيح الغيب",
        "title_en": "Razi - Mafatih al-Ghayb",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:TABARI": {
        "url": "https://shamela.ws/book/7798",
        "title_ar": "جامع البيان",
        "title_en": "Tabari - Jami' al-Bayan",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:IBN_KATHIR": {
        "url": "https://shamela.ws/book/8473",
        "title_ar": "تفسير ابن كثير",
        "title_en": "Ibn Kathir - Tafsir",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:MUHARRAR": {
        "url": "https://shamela.ws/book/23632",
        "title_ar": "المحرر الوجيز",
        "title_en": "Ibn Atiyya - al-Muharrar al-Wajiz",
        "source_type": "tafsir_linguistic",
        "family": "tafsir",
    },
    "SRC:SHAMELA:TIBYAN_UKBARI": {
        "url": "https://shamela.ws/book/22928",
        "title_ar": "التبيان في إعراب القرآن",
        "title_en": "al-Tibyan - Ukbari",
        "source_type": "tafsir_linguistic",
        "family": "sarf_spine",
    },

    # ---- External lexicon and academic ----
    "SRC:LANE": {
        "url": "https://lexicon.quranic-research.net/",
        "title_ar": "معجم لين",
        "title_en": "Lane Arabic-English Lexicon (quranic-research.net)",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:HAWRAMANI": {
        "url": "https://arabiclexicon.hawramani.com",
        "title_ar": "هوراماني - معجم",
        "title_en": "Hawramani Arabic Lexicon",
        "source_type": "classical_lexicon",
        "family": "lexicon",
    },
    "SRC:MIR_VERBAL_IDIOMS": {
        "url": "https://deepblue.lib.umich.edu/handle/2027.42/94553",
        "title_ar": "الأفعال الاصطلاحية في القرآن",
        "title_en": "Mustansir Mir - Verbal Idioms",
        "source_type": "academic_paper",
        "family": "idiom",
    },
    "SRC:SINAI_KEY_TERMS": {
        "url": "https://press.princeton.edu/books/hardcover/9780691241313/key-terms-of-the-quran",
        "title_ar": "مصطلحات القرآن المفتاحية",
        "title_en": "Nicolai Sinai - Key Terms",
        "source_type": "academic_paper",
        "family": "academic",
    },
}


# Shamela book IDs derived from SOURCES (used by the scraper).
def shamela_books() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for sid, meta in SOURCES.items():
        url = meta["url"]
        if "shamela.ws/book/" not in url:
            continue
        book_id = url.rstrip("/").rsplit("/", 1)[-1]
        out[sid] = {**meta, "book_id": book_id}
    return out


def all_sources() -> list[tuple[str, dict]]:
    return list(SOURCES.items())
