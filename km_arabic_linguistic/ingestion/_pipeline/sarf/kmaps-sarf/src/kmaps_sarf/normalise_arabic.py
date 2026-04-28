from __future__ import annotations

import re
import unicodedata

ARABIC_DIACRITICS = re.compile(r"[ً-ْٰـ]")  # tashkeel + tatweel
TATWEEL = "ـ"

ALEF_VARIANTS = {"آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا"}
YA_VARIANTS = {"ى": "ي"}
TA_MARBUTA = {"ة": "ه"}


def strip_diacritics(text: str) -> str:
    return ARABIC_DIACRITICS.sub("", text or "").replace(TATWEEL, "")


def normalise_arabic(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = strip_diacritics(text)
    out = []
    for ch in text:
        ch = ALEF_VARIANTS.get(ch, ch)
        ch = YA_VARIANTS.get(ch, ch)
        ch = TA_MARBUTA.get(ch, ch)
        out.append(ch)
    return "".join(out).strip()


def normalise_root(text: str) -> str:
    """Normalize root: collapse whitespace, separate letters with single space."""
    if not text:
        return ""
    bare = strip_diacritics(text)
    letters = [c for c in bare if not c.isspace()]
    return " ".join(letters)


_QURAN_REF_RE = re.compile(r"\b(\d{1,3})\s*[:،]\s*(\d{1,3})\b")


def find_quran_refs(text: str) -> list[str]:
    refs: list[str] = []
    for s, a in _QURAN_REF_RE.findall(text or ""):
        s_i, a_i = int(s), int(a)
        if 1 <= s_i <= 114 and 1 <= a_i <= 286:
            ref = f"{s_i}:{a_i}"
            if ref not in refs:
                refs.append(ref)
    return refs
