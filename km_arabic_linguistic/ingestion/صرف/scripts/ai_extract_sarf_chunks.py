from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterable


MODULE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUT_DIR = MODULE_DIR / "output"
DEFAULT_CHUNKS_PATH = DEFAULT_OUT_DIR / "sarf_source_chunks.jsonl"
DEFAULT_EXTRACTIONS_PATH = DEFAULT_OUT_DIR / "sarf_ai_extractions.json"
DEFAULT_SQL_PATH = DEFAULT_OUT_DIR / "sarf_ai_import.sql"
DEFAULT_SQL_CHUNKS_DIR = DEFAULT_OUT_DIR / "ai_chunks"

SYSTEM_PROMPT = """You extract Arabic linguistic knowledge from Sarf, Quranic lexicon, and verbal idiom source chunks.
Output JSON only and do not invent claims.
Prefer concise, source-grounded claims. If a claim is inferred from nearby source wording, mark confidence as needs_review.
Extract only information present in the chunk: Arabic terms, English terms, roots, wazn/patterns, verbal idioms, Quran references, and stable Sarf or lexicology concepts.
Do not summarize the entire page. Return short indexable keywords and concise evidence claims."""

ARABIC_RE = re.compile(r"[\u0600-\u06ff]{2,}")
QURAN_REF_RE = re.compile(r"\b(?:[1-9]|[1-9][0-9]|1[01][0-9]|114)\s*:\s*(?:[1-9]|[1-9][0-9]|[12][0-9]{2})\b")
PATTERN_RE = re.compile(r"(?:و[زﺯ]ن|pattern|form|Form)\s*[:：]?\s*([\u0600-\u06ffA-Za-z0-9() IVXivx._-]{2,40})")


EXTRACTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "keywords": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "keyword": {"type": "string"},
                    "kind": {
                        "type": "string",
                        "enum": ["arabic_term", "english_term", "root", "pattern", "quran_ref", "book_term", "concept"],
                    },
                    "confidence": {"type": "string", "enum": ["high", "medium", "needs_review"]},
                },
                "required": ["keyword", "kind", "confidence"],
            },
        },
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "claim_ar": {"type": "string"},
                    "claim_en": {"type": "string"},
                    "evidence_type": {
                        "type": "string",
                        "enum": ["lexicon_entry", "grammatical_rule", "classical_prose", "other"],
                    },
                    "quran_ref": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["high", "medium", "needs_review"]},
                },
                "required": ["claim_ar", "claim_en", "evidence_type", "quran_ref", "confidence"],
            },
        },
        "discipline_units": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name_ar": {"type": "string"},
                    "name_en": {"type": "string"},
                    "discipline": {"type": "string", "enum": ["sarf", "lexicology"]},
                    "unit_type": {"type": "string", "enum": ["concept", "rule", "pattern_family"]},
                    "description": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["high", "medium", "needs_review"]},
                },
                "required": ["name_ar", "name_en", "discipline", "unit_type", "description", "confidence"],
            },
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["keywords", "evidence", "discipline_units", "warnings"],
}


def stable_id(prefix: str, *parts: object) -> str:
    raw = "|".join(str(part) for part in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def checksum(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def sql_string(value: object | None) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def insert(table: str, row: dict[str, object | None], update_columns: list[str]) -> str:
    cols = list(row)
    values = ", ".join(sql_string(row[col]) for col in cols)
    updates = ", ".join(f"{col}=excluded.{col}" for col in update_columns)
    return (
        f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({values}) "
        f"ON CONFLICT(id) DO UPDATE SET {updates};\n"
    )


def insert_ignore(table: str, row: dict[str, object | None]) -> str:
    cols = list(row)
    values = ", ".join(sql_string(row[col]) for col in cols)
    return f"INSERT OR IGNORE INTO {table} ({', '.join(cols)}) VALUES ({values});\n"


def load_local_env() -> None:
    candidates = []
    for base in [MODULE_DIR, *MODULE_DIR.parents]:
        candidates.extend([base / ".dev.vars", base / ".dev.vars.local", base / ".env", base / ".env.local"])
    seen: set[Path] = set()
    for path in candidates:
        if path in seen or not path.exists():
            continue
        seen.add(path)
        for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def read_chunks(path: Path) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                chunks.append(json.loads(line))
    return chunks


def read_existing(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    items = json.loads(path.read_text(encoding="utf-8"))
    return {item["chunk_id"]: item for item in items if isinstance(item, dict) and item.get("chunk_id")}


def normalize_extraction(payload: dict[str, Any], chunk: dict[str, Any], mode: str) -> dict[str, Any]:
    normalized = {
        "chunk_id": chunk["id"],
        "source_id": chunk["source_id"],
        "source_title_en": chunk.get("source_title_en"),
        "page_no": chunk.get("page_no"),
        "checksum": checksum(str(chunk.get("text_ar") or "")),
        "mode": mode,
        "model": os.getenv("OPENAI_MODEL", "gpt-5.5"),
        "keywords": [],
        "evidence": [],
        "discipline_units": [],
        "warnings": list(payload.get("warnings") or []),
    }
    seen_keywords: set[tuple[str, str]] = set()
    for item in payload.get("keywords") or []:
        if not isinstance(item, dict):
            continue
        keyword = str(item.get("keyword") or "").strip()
        kind = str(item.get("kind") or "book_term").strip() or "book_term"
        if not keyword or (keyword, kind) in seen_keywords:
            continue
        seen_keywords.add((keyword, kind))
        normalized["keywords"].append(
            {
                "keyword": keyword[:200],
                "kind": kind,
                "confidence": item.get("confidence") or "needs_review",
            }
        )

    for item in payload.get("evidence") or []:
        if not isinstance(item, dict):
            continue
        claim_ar = str(item.get("claim_ar") or "").strip()
        claim_en = str(item.get("claim_en") or "").strip()
        if not claim_ar and not claim_en:
            continue
        normalized["evidence"].append(
            {
                "claim_ar": claim_ar[:1200],
                "claim_en": claim_en[:1200],
                "evidence_type": item.get("evidence_type") or "other",
                "quran_ref": str(item.get("quran_ref") or "").strip(),
                "confidence": item.get("confidence") or "needs_review",
            }
        )

    seen_units: set[tuple[str, str]] = set()
    for item in payload.get("discipline_units") or []:
        if not isinstance(item, dict):
            continue
        name_ar = str(item.get("name_ar") or "").strip()
        name_en = str(item.get("name_en") or "").strip()
        if not name_ar and not name_en:
            continue
        key = (name_ar, name_en)
        if key in seen_units:
            continue
        seen_units.add(key)
        normalized["discipline_units"].append(
            {
                "name_ar": name_ar[:160] or name_en[:160],
                "name_en": name_en[:160] or name_ar[:160],
                "discipline": item.get("discipline") or "sarf",
                "unit_type": item.get("unit_type") or "concept",
                "description": str(item.get("description") or "").strip()[:1200],
                "confidence": item.get("confidence") or "needs_review",
            }
        )
    return normalized


def heuristic_extract(chunk: dict[str, Any]) -> dict[str, Any]:
    text = str(chunk.get("text_ar") or "")
    arabic_terms = []
    for match in ARABIC_RE.findall(text):
        if match not in arabic_terms:
            arabic_terms.append(match)
        if len(arabic_terms) >= 12:
            break
    quran_refs = list(dict.fromkeys(QURAN_REF_RE.findall(text)))[:12]
    patterns = []
    for match in PATTERN_RE.findall(text):
        cleaned = " ".join(match.split())[:80]
        if cleaned and cleaned not in patterns:
            patterns.append(cleaned)
        if len(patterns) >= 8:
            break

    keywords = [{"keyword": term, "kind": "arabic_term", "confidence": "needs_review"} for term in arabic_terms]
    keywords.extend({"keyword": ref, "kind": "quran_ref", "confidence": "needs_review"} for ref in quran_refs)
    keywords.extend({"keyword": pattern, "kind": "pattern", "confidence": "needs_review"} for pattern in patterns)

    evidence: list[dict[str, str]] = []
    for line in [line.strip() for line in text.splitlines() if line.strip()][:8]:
        if any(marker in line.lower() for marker in ("وزن", "root", "pattern", "form", "idiom", "معنى")):
            evidence.append(
                {
                    "claim_ar": line[:900],
                    "claim_en": "",
                    "evidence_type": "grammatical_rule" if "وزن" in line or "pattern" in line.lower() else "other",
                    "quran_ref": "",
                    "confidence": "needs_review",
                }
            )
    if not evidence and text.strip():
        evidence.append(
            {
                "claim_ar": text.strip()[:900],
                "claim_en": "",
                "evidence_type": "other",
                "quran_ref": quran_refs[0] if quran_refs else "",
                "confidence": "needs_review",
            }
        )

    discipline_units = []
    for pattern in patterns[:3]:
        discipline_units.append(
            {
                "name_ar": pattern,
                "name_en": pattern,
                "discipline": "sarf",
                "unit_type": "pattern_family",
                "description": f"Pattern extracted from {chunk.get('source_title_en') or chunk.get('source_id')}.",
                "confidence": "needs_review",
            }
        )
    return {
        "keywords": keywords[:30],
        "evidence": evidence[:8],
        "discipline_units": discipline_units,
        "warnings": ["heuristic_extraction"],
    }


def response_text(data: dict[str, Any]) -> str:
    if isinstance(data.get("output_text"), str):
        return data["output_text"]
    parts: list[str] = []
    for output in data.get("output") or []:
        if not isinstance(output, dict):
            continue
        for content in output.get("content") or []:
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                parts.append(str(content.get("text") or ""))
    return "".join(parts)


def openai_extract(chunk: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-5.5")
    timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "180"))
    max_chars = int(os.getenv("SARF_AI_MAX_CHARS", "7000"))
    max_output_tokens = int(os.getenv("SARF_AI_MAX_OUTPUT_TOKENS", "2200"))
    body = {
        "model": model,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "chunk_id": chunk["id"],
                        "source_id": chunk["source_id"],
                        "source_title": chunk.get("source_title_en"),
                        "heading": chunk.get("heading_norm"),
                        "page_no": chunk.get("page_no"),
                        "text": str(chunk.get("text_ar") or "")[:max_chars],
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "sarf_chunk_extraction",
                "strict": True,
                "schema": EXTRACTION_SCHEMA,
            }
        },
        "reasoning": {"effort": os.getenv("OPENAI_REASONING_EFFORT", "low")},
        "max_output_tokens": max_output_tokens,
    }
    request = urllib.request.Request(
        f"{base_url}/responses",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
    text = response_text(data)
    if not text:
        raise RuntimeError("OpenAI response did not include output text")
    return json.loads(text)


def extraction_to_sql(item: dict[str, Any]) -> list[str]:
    statements: list[str] = []
    source_ref = f"AL:{item['source_id']}"
    for keyword in item.get("keywords") or []:
        keyword_text = str(keyword["keyword"]).strip()
        kind = str(keyword.get("kind") or "book_term")
        row_id = stable_id("AL:SI:", item["source_id"], item["chunk_id"], kind, keyword_text)
        statements.append(
            insert(
                "ar_ling_source_index",
                {
                    "id": row_id,
                    "source_id": item["source_id"],
                    "keyword": keyword_text,
                    "chunk_id": item["chunk_id"],
                    "page_no": item.get("page_no"),
                    "note_md": json.dumps(
                        {
                            "kind": kind,
                            "confidence": keyword.get("confidence"),
                            "mode": item.get("mode"),
                            "model": item.get("model"),
                        },
                        ensure_ascii=False,
                    ),
                },
                ["source_id", "keyword", "chunk_id", "page_no", "note_md"],
            )
        )

    for evidence in item.get("evidence") or []:
        text_ar = str(evidence.get("claim_ar") or evidence.get("claim_en") or "").strip()
        text_en = str(evidence.get("claim_en") or "").strip() or None
        row_id = stable_id("AL:EVID:", item["source_id"], item["chunk_id"], evidence.get("evidence_type"), text_ar, text_en)
        statements.append(
            insert(
                "ar_ling_evidence_items",
                {
                    "id": row_id,
                    "evidence_type": evidence.get("evidence_type") or "other",
                    "text_ar": text_ar,
                    "text_en": text_en,
                    "qr_ref": f"QR:{evidence['quran_ref']}" if evidence.get("quran_ref") else None,
                    "source_ref": source_ref,
                    "locator_json": json.dumps(
                        {"chunk_id": item["chunk_id"], "page_no": item.get("page_no")},
                        ensure_ascii=False,
                    ),
                    "note_md": json.dumps(
                        {
                            "confidence": evidence.get("confidence"),
                            "mode": item.get("mode"),
                            "model": item.get("model"),
                            "source_title": item.get("source_title_en"),
                        },
                        ensure_ascii=False,
                    ),
                },
                ["evidence_type", "text_ar", "text_en", "qr_ref", "source_ref", "locator_json", "note_md"],
            )
        )

    for unit in item.get("discipline_units") or []:
        name_ar = str(unit.get("name_ar") or "").strip()
        name_en = str(unit.get("name_en") or name_ar).strip()
        discipline = unit.get("discipline") or "sarf"
        row_id = stable_id("AL:DU:", discipline, name_ar, name_en)
        container_id = "arl-dc-02" if discipline == "sarf" else "arl-dc-01"
        statements.append(
            insert_ignore(
                "ar_ling_discipline_units",
                {
                    "id": row_id,
                    "container_id": container_id,
                    "name_ar": name_ar or name_en,
                    "name_en": name_en or name_ar,
                    "unit_type": unit.get("unit_type") or "concept",
                    "description_md": unit.get("description") or None,
                    "seq": 0,
                },
            )
        )
    return statements


def write_sql_chunks(statements: Iterable[str], out_dir: Path, max_bytes: int) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("sarf-ai-*.sql"):
        old.unlink()
    paths: list[Path] = []
    chunk: list[str] = []
    chunk_bytes = 0
    index = 1
    for statement in statements:
        size = len(statement.encode("utf-8"))
        if chunk and chunk_bytes + size > max_bytes:
            path = out_dir / f"sarf-ai-{index:03}.sql"
            path.write_text("".join(chunk), encoding="utf-8")
            paths.append(path)
            index += 1
            chunk = []
            chunk_bytes = 0
        chunk.append(statement)
        chunk_bytes += size
    if chunk:
        path = out_dir / f"sarf-ai-{index:03}.sql"
        path.write_text("".join(chunk), encoding="utf-8")
        paths.append(path)
    return paths


def run(args: argparse.Namespace) -> dict[str, Any]:
    load_local_env()
    chunks = read_chunks(args.chunks_path)
    max_chunks = int(os.getenv("SARF_AI_MAX_CHUNKS", "0"))
    if args.max_chunks:
        max_chunks = args.max_chunks
    if max_chunks > 0:
        chunks = chunks[:max_chunks]
    existing = read_existing(args.extractions_path)
    require_openai = os.getenv("SARF_AI_REQUIRE_OPENAI", "").strip().lower() in {"1", "true", "yes"}
    heuristic_only = args.heuristic_only or os.getenv("SARF_AI_HEURISTIC_ONLY", "").strip().lower() in {"1", "true", "yes"}

    output: list[dict[str, Any]] = []
    for index, chunk in enumerate(chunks, start=1):
        chunk_checksum = checksum(str(chunk.get("text_ar") or ""))
        prior = existing.get(chunk["id"])
        if prior and prior.get("checksum") == chunk_checksum and prior.get("model") == os.getenv("OPENAI_MODEL", "gpt-5.5"):
            output.append(prior)
            print(f"[{index}/{len(chunks)}] reused {chunk['id']}", flush=True)
            continue
        mode = "ai"
        try:
            payload = heuristic_extract(chunk) if heuristic_only else openai_extract(chunk)
            if heuristic_only:
                mode = "heuristic"
        except (RuntimeError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if require_openai:
                raise
            payload = heuristic_extract(chunk)
            payload.setdefault("warnings", []).append(f"ai_fallback:{type(exc).__name__}")
            mode = "fallback"
        normalized = normalize_extraction(payload, chunk, mode)
        output.append(normalized)
        print(f"[{index}/{len(chunks)}] {mode} {chunk['id']}", flush=True)

    args.extractions_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    statements = ["-- Generated by ai_extract_sarf_chunks.py\n"]
    for item in output:
        statements.extend(extraction_to_sql(item))
    args.sql_path.write_text("".join(statements), encoding="utf-8")
    chunk_paths = write_sql_chunks(statements, args.sql_chunks_dir, args.max_sql_chunk_bytes)
    manifest = {
        "extractions": len(output),
        "sql_path": str(args.sql_path),
        "sql_chunks": [str(path) for path in chunk_paths],
        "model": os.getenv("OPENAI_MODEL", "gpt-5.5"),
    }
    (args.out_dir / "sarf_ai_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract Sarf/PDF source-index and evidence rows with GPT-5.5.")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--chunks-path", type=Path, default=DEFAULT_CHUNKS_PATH)
    parser.add_argument("--extractions-path", type=Path, default=DEFAULT_EXTRACTIONS_PATH)
    parser.add_argument("--sql-path", type=Path, default=DEFAULT_SQL_PATH)
    parser.add_argument("--sql-chunks-dir", type=Path, default=DEFAULT_SQL_CHUNKS_DIR)
    parser.add_argument("--max-chunks", type=int, default=0)
    parser.add_argument("--max-sql-chunk-bytes", type=int, default=4_000_000)
    parser.add_argument("--heuristic-only", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    result = run(parse_args())
    print(f"Generated {result['extractions']} Sarf AI extraction payloads and {len(result['sql_chunks'])} SQL chunks.")
