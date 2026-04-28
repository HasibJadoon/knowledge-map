from __future__ import annotations

import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
STAGING_DIR = DATA_DIR / "staging"
OUTPUT_DIR = PROJECT_ROOT / "output"


def load_env() -> None:
    for path in [PROJECT_ROOT / ".env", PROJECT_ROOT / ".env.local"]:
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def parse_scope(spec: str | None) -> dict:
    """Parse SARF_SCOPE strings:
        ALL              -> {"all": True}
        S1               -> {"surah": 1}
        S12:1-7          -> {"surah": 12, "ayah_from": 1, "ayah_to": 7}
        S73:4            -> {"surah": 73, "ayah_from": 4, "ayah_to": 4}
    """
    s = (spec or "S1").strip().upper()
    if s == "ALL":
        return {"all": True}
    if not s.startswith("S"):
        raise ValueError(f"bad SARF_SCOPE: {spec!r}")
    body = s[1:]
    if ":" in body:
        surah_part, ayah_part = body.split(":", 1)
        surah = int(surah_part)
        if "-" in ayah_part:
            a1, a2 = ayah_part.split("-", 1)
            return {"surah": surah, "ayah_from": int(a1), "ayah_to": int(a2)}
        a = int(ayah_part)
        return {"surah": surah, "ayah_from": a, "ayah_to": a}
    return {"surah": int(body)}


def scope_label(scope: dict) -> str:
    if scope.get("all"):
        return "ALL"
    s = scope["surah"]
    a1 = scope.get("ayah_from")
    a2 = scope.get("ayah_to")
    if a1 is None:
        return f"S{s}"
    if a1 == a2:
        return f"S{s}:{a1}"
    return f"S{s}:{a1}-{a2}"
