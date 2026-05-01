#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


MODULE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = MODULE_ROOT.parents[2]
SOURCES_DIR = MODULE_ROOT / "sources"
OUTPUT_DIR = MODULE_ROOT / "output"
EXTRACTED_DIR = OUTPUT_DIR / "extracted"
SCHEMA_DIR = MODULE_ROOT / "schema"

RAW_CHUNKS_PATH = OUTPUT_DIR / "raw_chunks.json"
MERGED_SETS_PATH = OUTPUT_DIR / "merged_near_synonym_sets.json"
MERGED_MEMBERS_PATH = OUTPUT_DIR / "merged_near_synonym_members.json"
EVIDENCE_PATH = OUTPUT_DIR / "near_synonym_evidence.json"
REVIEW_QUEUE_PATH = OUTPUT_DIR / "review_queue.json"
SQL_OUTPUT_PATH = OUTPUT_DIR / "d1_import_near_synonyms.sql"

QDEV_SOURCE_ID = "SRC:QDEV:SYNONYMS"
NQCM_SOURCE_ID = "SRC:NQCM:SYNONYMS"
KELANI_SOURCE_ID = "SRC:KELANI:MUTARADIFAT_QURAN"
QDEV_EDITION_ID = "SED:QDEV:SYNONYMS:GH_PAGES"
NQCM_EDITION_ID = "SED:NQCM:SYNONYMS:MASTER"
KELANI_EDITION_ID = "SED:KELANI:MUTARADIFAT_QURAN:PDF"

QDEV_REPO = "https://github.com/qurandev/synonyms.git"
NQCM_REPO = "https://github.com/nqcm/synonyms-in-quran.git"

QDEV_WEB_BASE = "https://qurandev.github.io/synonyms"
QDEV_BLOB_BASE = "https://github.com/qurandev/synonyms/blob/gh-pages"
NQCM_BLOB_BASE = "https://github.com/nqcm/synonyms-in-quran/blob/master"
KELANI_PDF_PATH = REPO_ROOT / "database" / "data" / "synonyms" / "مترادفات القرآن ( قرآن مجید کے ہم معنی الفاظ کا لغوی فرق) ۔ عبد الرحمٰن کیلانی ۔حق   .pdf"
KELANI_DATA_ROOT = REPO_ROOT / "database" / "data" / "synonyms" / "data-master"

ARABIC_DIACRITICS_RE = re.compile(r"[\u064B-\u065F\u0670\u06D6-\u06ED]")
ARABIC_SPACES_RE = re.compile(r"\s+")
TAG_RE = re.compile(r"<[^>]+>")
BARE_KEY_RE = re.compile(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)")
QURAN_REF_RE = re.compile(r"\b(\d{1,3}):(\d{1,3})\b")
ARABIC_TOKEN_RE = re.compile(r"[\u0600-\u06FF][\u0600-\u06FF\s\u0640\u064B-\u065F\u0670\u06D6-\u06ED]*")

BUCKWALTER_MAP = {
    "'": "ء",
    "|": "آ",
    ">": "أ",
    "<": "إ",
    "&": "ؤ",
    "}": "ئ",
    "A": "ا",
    "b": "ب",
    "p": "ة",
    "t": "ت",
    "v": "ث",
    "j": "ج",
    "H": "ح",
    "x": "خ",
    "d": "د",
    "*": "ذ",
    "r": "ر",
    "z": "ز",
    "s": "س",
    "$": "ش",
    "S": "ص",
    "D": "ض",
    "T": "ط",
    "Z": "ظ",
    "E": "ع",
    "g": "غ",
    "f": "ف",
    "q": "ق",
    "k": "ك",
    "l": "ل",
    "m": "م",
    "n": "ن",
    "h": "ه",
    "w": "و",
    "y": "ي",
    "Y": "ى",
}


@dataclass(frozen=True)
class SourceConfig:
    source_id: str
    edition_id: str
    source_name: str
    repo_url: str
    branch: str
    repo_dir: Path
    blob_base_url: str
    web_base_url: str | None = None


SOURCE_CONFIGS = {
    "qdev": SourceConfig(
        source_id=QDEV_SOURCE_ID,
        edition_id=QDEV_EDITION_ID,
        source_name="qurandev/synonyms",
        repo_url=QDEV_REPO,
        branch="gh-pages",
        repo_dir=SOURCES_DIR / "qurandev-synonyms",
        blob_base_url=QDEV_BLOB_BASE,
        web_base_url=QDEV_WEB_BASE,
    ),
    "nqcm": SourceConfig(
        source_id=NQCM_SOURCE_ID,
        edition_id=NQCM_EDITION_ID,
        source_name="nqcm/synonyms-in-quran",
        repo_url=NQCM_REPO,
        branch="master",
        repo_dir=SOURCES_DIR / "nqcm-synonyms-in-quran",
        blob_base_url=NQCM_BLOB_BASE,
    ),
}


SURAH_ALIASES = {
    "fatiha": 1,
    "fatihah": 1,
    "baqarah": 2,
    "aleimran": 3,
    "alimran": 3,
    "imran": 3,
    "nisa": 4,
    "maidah": 5,
    "anam": 6,
    "araf": 7,
    "anfal": 8,
    "tawbah": 9,
    "taubah": 9,
    "yunus": 10,
    "hud": 11,
    "yusuf": 12,
    "rad": 13,
    "ibraheem": 14,
    "ibrahim": 14,
    "hijr": 15,
    "nahl": 16,
    "isra": 17,
    "baniisrail": 17,
    "kahf": 18,
    "maryam": 19,
    "taha": 20,
    "anbiya": 21,
    "hajj": 22,
    "muminun": 23,
    "nur": 24,
    "furqan": 25,
    "furqaan": 25,
    "shuara": 26,
    "shuaraa": 26,
    "naml": 27,
    "qasas": 28,
    "qasa": 28,
    "ankabut": 29,
    "ankaboot": 29,
    "rum": 30,
    "luqman": 31,
    "sajdah": 32,
    "ahzab": 33,
    "saba": 34,
    "fatir": 35,
    "yasin": 36,
    "saffat": 37,
    "sad": 38,
    "zumar": 39,
    "ghafir": 40,
    "mumin": 40,
    "fussilat": 41,
    "shura": 42,
    "zukhruf": 43,
    "dukhan": 44,
    "jathiyah": 45,
    "ahqaf": 46,
    "muhammad": 47,
    "fath": 48,
    "hujurat": 49,
    "qaf": 50,
    "dhariyat": 51,
    "dhaariyat": 51,
    "tur": 52,
    "najm": 53,
    "qamar": 54,
    "rahman": 55,
    "rahmaan": 55,
    "waqiah": 56,
    "waqia": 56,
    "hadid": 57,
    "mujadilah": 58,
    "mujadala": 58,
    "hashr": 59,
    "mumtahanah": 60,
    "saff": 61,
    "jumuah": 62,
    "munafiqun": 63,
    "munafiqoon": 63,
    "taghabun": 64,
    "talaq": 65,
    "tahreem": 66,
    "tahrim": 66,
    "mulk": 67,
    "qalam": 68,
    "haqqah": 69,
    "haaqqah": 69,
    "maarij": 70,
    "maarijj": 70,
    "nuh": 71,
    "jinn": 72,
    "muzzammil": 73,
    "mudaththir": 74,
    "muddaththir": 74,
    "qiyamah": 75,
    "qiyama": 75,
    "insan": 76,
    "dahr": 76,
    "mursalat": 77,
    "naba": 78,
    "nabaa": 78,
    "naziat": 79,
    "naaziaat": 79,
    "abasa": 80,
    "takwir": 81,
    "infitar": 82,
    "mutaffifin": 83,
    "inshiqaq": 84,
    "buruj": 85,
    "tariq": 86,
    "ala": 87,
    "ghashiyah": 88,
    "ghaashiyah": 88,
    "fajr": 89,
    "balad": 90,
    "shams": 91,
    "layl": 92,
    "duha": 93,
    "sharh": 94,
    "inshirah": 94,
    "tin": 95,
    "alaq": 96,
    "qadr": 97,
    "bayyinah": 98,
    "zalzalah": 99,
    "adiyat": 100,
    "aadiyat": 100,
    "qariah": 101,
    "qaariyah": 101,
    "takathur": 102,
    "asr": 103,
    "humazah": 104,
    "fil": 105,
    "quraysh": 106,
    "maun": 107,
    "maaoon": 107,
    "kawthar": 108,
    "kafirun": 109,
    "nasr": 110,
    "masad": 111,
    "ikhlas": 112,
    "falaq": 113,
    "nas": 114,
}


def ensure_dirs() -> None:
    for path in (SOURCES_DIR, OUTPUT_DIR, EXTRACTED_DIR, SCHEMA_DIR):
        path.mkdir(parents=True, exist_ok=True)


def load_local_env() -> None:
    candidates = []
    for base in [MODULE_ROOT, *MODULE_ROOT.parents]:
        candidates.extend(
            [
                base / ".dev.vars",
                base / ".dev.vars.local",
                base / ".env",
                base / ".env.local",
            ]
        )
    seen = set()
    for path in candidates:
        if path in seen or not path.exists():
            continue
        seen.add(path)
        for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            os.environ.setdefault(key, value)


def bool_from_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"", "0", "false", "no", "off"}


def wrangler_config_path() -> Path:
    configured = os.getenv("WRANGLER_CONFIG")
    if configured:
        return Path(configured)
    return REPO_ROOT / "wrangler.toml"


def d1_database_name(domain: str) -> str:
    domain = domain.lower()
    if domain == "al":
        return os.getenv("KM_AL_D1_DATABASE_NAME", "km_arabic_linguistic")
    if domain == "qr":
        return os.getenv("KM_QR_D1_DATABASE_NAME", "km_quran")
    raise ValueError(f"Unsupported D1 domain: {domain}")


def chunked(values: Iterable[Any], size: int = 200) -> Iterable[list[Any]]:
    batch: list[Any] = []
    for value in values:
        batch.append(value)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


class D1Client:
    def __init__(self, domain: str, *, require_remote: bool = True) -> None:
        self.domain = domain.lower()
        self.database_name = d1_database_name(self.domain)
        self.config_path = wrangler_config_path()
        self.remote = bool_from_env(f"KM_{self.domain.upper()}_D1_REMOTE", require_remote)

    def is_available(self) -> bool:
        return bool(shutil.which("wrangler")) and self.config_path.exists()

    def query(self, sql: str) -> list[dict[str, Any]]:
        if not self.is_available():
            raise RuntimeError(f"Wrangler D1 access is unavailable for {self.domain}")
        command = [
            "wrangler",
            "d1",
            "execute",
            self.database_name,
            "--config",
            str(self.config_path),
            "--json",
            "--command",
            sql,
        ]
        if self.remote:
            command.append("--remote")
        last_error = None
        for attempt in range(3):
            completed = subprocess.run(command, capture_output=True, text=True)
            if completed.returncode == 0:
                payload = json.loads(completed.stdout or "[]")
                if not payload:
                    return []
                first = payload[0]
                if not first.get("success", False):
                    raise RuntimeError(f"D1 query was not successful for {self.domain}: {completed.stdout.strip()}")
                return first.get("results") or []
            detail = completed.stderr.strip() or completed.stdout.strip()
            last_error = detail or f"Wrangler D1 query failed for {self.domain}"
            if "fetch failed" not in last_error.lower():
                break
            time.sleep(1 + attempt)
        raise RuntimeError(last_error or f"Wrangler D1 query failed for {self.domain}")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def read_text_lossy(path: Path) -> str:
    data = path.read_bytes()
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def load_loose_json(path: Path) -> Any:
    raw = path.read_text(encoding="utf-8-sig")
    patched = BARE_KEY_RE.sub(r'\1"\2"\3', raw)
    return json.loads(patched)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stable_token(text: str, uppercase: bool = True) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", text.strip())
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    if not normalized:
        normalized = "X" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]
    return normalized.upper() if uppercase else normalized.lower()


def stable_hash(prefix: str, *parts: Any, length: int = 12) -> str:
    payload = "||".join(str(part) for part in parts)
    digest = hashlib.sha256(f"{prefix}::{payload}".encode("utf-8")).hexdigest()
    return digest[:length].upper()


def clean_spaces(text: str) -> str:
    return ARABIC_SPACES_RE.sub(" ", text).strip()


def arabic_clean(text: str | None) -> str:
    if not text:
        return ""
    text = text.replace("\u0640", "")
    return clean_spaces(text)


def arabic_bare(text: str | None, *, search_key: bool = False) -> str:
    cleaned = arabic_clean(text)
    cleaned = ARABIC_DIACRITICS_RE.sub("", cleaned)
    cleaned = (
        cleaned.replace("أ", "ا")
        .replace("إ", "ا")
        .replace("آ", "ا")
        .replace("ٱ", "ا")
        .replace("ى", "ي")
    )
    if search_key:
        cleaned = cleaned.replace("ة", "ه")
    return clean_spaces(cleaned)


def strip_markdown_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---"):
        return {}, text
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, flags=re.DOTALL)
    if not match:
        return {}, text
    block = match.group(1)
    meta: dict[str, Any] = {}
    current_key: str | None = None
    for line in block.splitlines():
        if not line.strip():
            continue
        if re.match(r"^\s+-\s+", line) and current_key:
            if not isinstance(meta.get(current_key), list):
                meta[current_key] = []
            meta[current_key].append(line.split("-", 1)[1].strip())
            continue
        if ":" in line:
            key, value = line.split(":", 1)
            current_key = key.strip()
            meta[current_key] = value.strip().strip('"')
    return meta, text[match.end() :]


def strip_html(text: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|section|article|li|tr|table|h1|h2|h3|h4|h5|h6)>", "\n", text)
    text = TAG_RE.sub(" ", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


def markdown_to_text(text: str) -> str:
    meta, body = strip_markdown_frontmatter(text)
    lines: list[str] = []
    if meta.get("title"):
        lines.append(str(meta["title"]))
    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue
        line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"^!!!\s+\w+\s*", "", line)
        line = re.sub(r"^\[\^.+?\]:\s*", "", line)
        line = line.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
        line = strip_html(line)
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        line = re.sub(r"\[\^([^\]]+)\]", "", line)
        line = re.sub(r"^\d+\.\s*", "", line)
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return "\n".join(line.rstrip() for line in text.splitlines()).strip()


def find_title_from_html(text: str, fallback: str) -> str:
    title_match = re.search(r"(?is)<title>(.*?)</title>", text)
    if title_match:
        title = strip_html(title_match.group(1))
        if title:
            return title
    header_match = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", text)
    if header_match:
        title = strip_html(header_match.group(1))
        if title:
            return title
    return fallback


def first_heading_from_markdown(text: str, fallback: str) -> str:
    meta, body = strip_markdown_frontmatter(text)
    if meta.get("title"):
        return str(meta["title"])
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return fallback


def git_clone_or_update(config: SourceConfig) -> None:
    ensure_dirs()
    if not shutil.which("git"):
        raise SystemExit("git is required for 01_clone_sources.py")
    git_dir = config.repo_dir / ".git"
    if not git_dir.exists():
        if config.repo_dir.exists():
            shutil.rmtree(config.repo_dir)
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--branch",
                config.branch,
                config.repo_url,
                str(config.repo_dir),
            ],
            check=True,
        )
        return
    remote_result = subprocess.run(
        ["git", "config", "--get", "remote.origin.url"],
        cwd=config.repo_dir,
        capture_output=True,
        text=True,
    )
    if remote_result.returncode != 0 or remote_result.stdout.strip() != config.repo_url:
        shutil.rmtree(config.repo_dir)
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--branch",
                config.branch,
                config.repo_url,
                str(config.repo_dir),
            ],
            check=True,
        )
        return
    subprocess.run(["git", "fetch", "--depth", "1", "origin", config.branch], cwd=config.repo_dir, check=True)
    subprocess.run(["git", "checkout", config.branch], cwd=config.repo_dir, check=True)
    subprocess.run(["git", "reset", "--hard", f"origin/{config.branch}"], cwd=config.repo_dir, check=True)


def git_rev(config: SourceConfig) -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=config.repo_dir,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def blob_url(config: SourceConfig, rel_path: str) -> str:
    return f"{config.blob_base_url}/{rel_path.replace(os.sep, '/')}"


def published_url(config: SourceConfig, rel_path: str) -> str | None:
    if not config.web_base_url:
        return None
    return f"{config.web_base_url}/{rel_path.replace(os.sep, '/')}"


def chunk_id(prefix: str, rel_path: str, suffix: str | None = None) -> str:
    base = rel_path.replace("\\", "/").strip("/")
    base = re.sub(r"\.[A-Za-z0-9]+$", "", base)
    base = re.sub(r"[^A-Za-z0-9/._-]+", "-", base)
    base = base.replace("/", "--")
    base = re.sub(r"-{2,}", "-", base).strip("-").upper() or "ROOT"
    if suffix:
        base = f"{base}--{stable_token(suffix)}"
    return f"CHK:{prefix}:{base}"


def load_raw_chunks() -> list[dict[str, Any]]:
    payload = read_json(RAW_CHUNKS_PATH, default=[])
    return payload if isinstance(payload, list) else []


def save_raw_chunks(chunks: Iterable[dict[str, Any]]) -> None:
    ordered = sorted(chunks, key=lambda item: (item["source_id"], item["source_path"], item.get("chunk_seq", 0), item["id"]))
    write_json(RAW_CHUNKS_PATH, ordered)


def upsert_raw_chunks(incoming: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    existing = {chunk["id"]: chunk for chunk in load_raw_chunks()}
    for chunk in incoming:
        existing[chunk["id"]] = chunk
    save_raw_chunks(existing.values())
    return list(existing.values())


def dedup_chunks_by_checksum(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deduplicate a list of chunks by content checksum.

    When two or more chunks share the same checksum (identical content), only
    the first one is kept as the canonical record.  All duplicate source paths
    are collected into ``metadata["source_refs"]`` on the canonical chunk so no
    provenance information is lost.  This keeps the ingestion store clean while
    preserving every location where the duplicated content appeared.

    Args:
        chunks: List of chunk dicts, each containing at least ``"id"``,
                ``"checksum"``, ``"source_path"``, and ``"metadata"``.

    Returns:
        Deduplicated list (order of first occurrence preserved).
    """
    seen: dict[str, dict[str, Any]] = {}  # checksum → canonical chunk
    for chunk in chunks:
        cs = chunk.get("checksum") or chunk["id"]
        if cs not in seen:
            # First occurrence — make it canonical; seed source_refs
            canonical = dict(chunk)
            meta = dict(canonical.get("metadata") or {})
            meta.setdefault("source_refs", [canonical.get("source_path", "")])
            canonical["metadata"] = meta
            seen[cs] = canonical
        else:
            # Duplicate content — merge provenance into the canonical chunk
            canonical = seen[cs]
            ref = chunk.get("source_path", "")
            refs: list[str] = canonical["metadata"].setdefault("source_refs", [])
            if ref and ref not in refs:
                refs.append(ref)
            # Also carry forward any page-range info when present
            chunk_meta = chunk.get("metadata") or {}
            if "page_start" in chunk_meta:
                dup_ranges: list[dict] = canonical["metadata"].setdefault("duplicate_page_ranges", [])
                dup_ranges.append(
                    {
                        "source_path": chunk.get("source_path", ""),
                        "page_start": chunk_meta["page_start"],
                        "page_end": chunk_meta["page_end"],
                    }
                )
    return list(seen.values())


def split_text_sections(title: str, text: str, source_path: str, *, min_len: int = 900) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    current_title = title
    current_lines: list[str] = []
    part = 1
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if re.match(r"^(##+|[A-Z][A-Za-z0-9 _'/-]{1,80}$)", line) and current_lines and len("\n".join(current_lines)) >= min_len:
            sections.append(
                {
                    "section_title": current_title,
                    "section_text": "\n".join(current_lines).strip(),
                    "section_suffix": f"part-{part}",
                }
            )
            part += 1
            current_title = line.lstrip("#").strip() or title
            current_lines = []
            continue
        current_lines.append(raw_line)
    if current_lines:
        sections.append(
            {
                "section_title": current_title,
                "section_text": "\n".join(current_lines).strip(),
                "section_suffix": None if part == 1 else f"part-{part}",
            }
        )
    return sections


def quran_refs_from_text(text: str) -> list[str]:
    refs = []
    seen = set()
    for match in QURAN_REF_RE.finditer(text or ""):
        ref = f"{int(match.group(1))}:{int(match.group(2))}"
        if ref not in seen:
            refs.append(ref)
            seen.add(ref)
    return refs


def normalize_surah_name(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"surah|sura|surat", "", name)
    name = re.sub(r"[^a-z]+", "", name)
    return name


def surah_name_to_number(name: str | None) -> int | None:
    if not name:
        return None
    return SURAH_ALIASES.get(normalize_surah_name(name))


def extract_markdown_quote_refs(text: str) -> list[str]:
    refs: list[str] = []
    seen = set()
    for match in re.finditer(r'!!!\s+quote\s+"([^"]+)"', text):
        label = match.group(1)
        if "-" not in label:
            continue
        surah_name, ayah_part = label.rsplit("-", 1)
        surah = surah_name_to_number(surah_name)
        ayah_part = ayah_part.strip()
        if not surah:
            continue
        if re.match(r"^\d+\s*-\s*\d+$", ayah_part):
            start, end = [int(part.strip()) for part in ayah_part.split("-", 1)]
            for ayah in range(start, end + 1):
                ref = f"{surah}:{ayah}"
                if ref not in seen:
                    refs.append(ref)
                    seen.add(ref)
            continue
        if ayah_part.isdigit():
            ref = f"{surah}:{int(ayah_part)}"
            if ref not in seen:
                refs.append(ref)
                seen.add(ref)
    return refs


def top_arabic_terms(text: str, *, limit: int = 12) -> list[str]:
    counts: dict[str, int] = {}
    for match in ARABIC_TOKEN_RE.finditer(text or ""):
        token = clean_spaces(match.group(0))
        if len(token) < 2:
            continue
        bare = arabic_bare(token)
        if len(bare) < 2:
            continue
        counts[token] = counts.get(token, 0) + 1
    return [term for term, _ in sorted(counts.items(), key=lambda item: (-item[1], len(item[0]), item[0]))[:limit]]


def buckwalter_to_arabic(text: str | None) -> str | None:
    if not text:
        return None
    mapped = "".join(BUCKWALTER_MAP[ch] for ch in text if ch in BUCKWALTER_MAP)
    return mapped or None


def root_text_from_value(text: str | None) -> str | None:
    if not text:
        return None
    stripped = clean_spaces(text).replace("-", "").replace(" ", "")
    if re.search(r"[\u0600-\u06FF]", stripped):
        letters = [char for char in stripped if re.search(r"[\u0621-\u064A]", char)]
        return "-".join(letters) if letters else None
    mapped = buckwalter_to_arabic(stripped)
    if not mapped:
        return None
    return "-".join(mapped)


def confidence_to_score(confidence: str | None) -> float:
    mapping = {
        "high": 1.0,
        "medium": 0.75,
        "low": 0.5,
        "needs_review": 0.25,
    }
    return mapping.get((confidence or "needs_review").strip().lower(), 0.25)


def sql_quote(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def sql_json(value: Any) -> str:
    if value is None:
        return "NULL"
    return sql_quote(json.dumps(value, ensure_ascii=False, separators=(",", ":")))


def insert_statement(table: str, row: dict[str, Any], *, update_columns: Iterable[str] | None = None) -> str:
    columns = list(row.keys())
    values = [sql_quote(row[column]) for column in columns]
    sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)})"
    if update_columns:
        update_sql = ", ".join(f"{column}=excluded.{column}" for column in update_columns)
        sql += f" ON CONFLICT(id) DO UPDATE SET {update_sql}"
    return sql + ";"


def maybe_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]
