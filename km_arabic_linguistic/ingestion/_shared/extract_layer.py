#!/usr/bin/env python3
"""
Unified per-layer LLM claim extractor (sarf/irab/balagha).

Processes PER AYAH (not per word) for efficiency — gpt-5-mini is a reasoning
model that uses 1-3k thinking tokens per call, so we batch all words in an
ayah into a single call. 6,236 ayahs × 3 layers vs 77,435 words × 3 = 12x faster.

For each ayah:
  1. Build query from all words (text + roots + lemmas)
  2. Retrieve top-K chunks from the layer's Qdrant collection
  3. Call gpt-5-mini with ayah-level prompt → claims tagged by word_index
  4. Emit SQL into ar_ling_source_claims (layer = sarf|irab|balagha)

Usage:
    python3 _shared/extract_layer.py --layer irab --scope S1 --limit 10
    python3 _shared/extract_layer.py --layer balagha --scope ALL --workers 5 --worker-id 0
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parents[1]   # ingestion/

LAYER_DIRS = {
    "sarf":    BASE / "صرف/kmaps-sarf",
    "irab":    BASE / "اعراب/kmaps-irab",
    "balagha": BASE / "بلاغة/kmaps-balagha",
}
LAYER_COLLECTIONS = {
    "sarf":    "kmaps_sarf_source_chunks",
    "irab":    "kmaps_irab_source_chunks",
    "balagha": "kmaps_balagha_source_chunks",
}

# spine.sqlite lives in sarf folder (shared across layers)
SPINE_DB = LAYER_DIRS["sarf"] / "data/raw/spine/spine.sqlite"

# Qdrant: each layer keeps its collection in its own qdrant_storage
# (sarf → data/qdrant_storage, irab/balagha → data/data/qdrant_storage)
QDRANT_PATHS = {
    "sarf":    LAYER_DIRS["sarf"]    / "data/qdrant_storage",
    "irab":    LAYER_DIRS["irab"]    / "data/data/qdrant_storage",
    "balagha": LAYER_DIRS["balagha"] / "data/data/qdrant_storage",
}
# Fallback used before layer is known; overridden per-call in retrieve_chunks()
QDRANT_PATH = QDRANT_PATHS["sarf"]

OLLAMA_URL  = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# ── Load .env (any layer's .env will do, sarf has the key) ─────────────────────
env_file = LAYER_DIRS["sarf"] / ".env"
if env_file.exists():
    for raw in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("'\""))


# ── IDs ────────────────────────────────────────────────────────────────────────
def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def sql_val(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(v).replace("'", "''") + "'"


# ── Spine load ─────────────────────────────────────────────────────────────────
def load_words(scope: str) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    s = scope.strip().upper()
    if s == "ALL":
        rows = cx.execute("SELECT * FROM qr_word_occurrences ORDER BY surah, ayah, word_index").fetchall()
    elif ":" in s:
        body = s.lstrip("S")
        sp, ap = body.split(":", 1)
        surah = int(sp)
        if "-" in ap:
            a1, a2 = ap.split("-")
            rows = cx.execute("SELECT * FROM qr_word_occurrences WHERE surah=? AND ayah BETWEEN ? AND ? ORDER BY ayah, word_index",
                              (surah, int(a1), int(a2))).fetchall()
        else:
            rows = cx.execute("SELECT * FROM qr_word_occurrences WHERE surah=? AND ayah=? ORDER BY word_index",
                              (surah, int(ap))).fetchall()
    else:
        surah = int(s.lstrip("S"))
        rows = cx.execute("SELECT * FROM qr_word_occurrences WHERE surah=? ORDER BY ayah, word_index", (surah,)).fetchall()
    cx.close()
    return [dict(r) for r in rows]


# ── Embedding + retrieval ──────────────────────────────────────────────────────
def embed_text(text: str) -> list[float]:
    body = json.dumps({"model": EMBED_MODEL, "input": text}).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/embed", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    return list(data.get("embeddings", [[]])[0])


def retrieve_chunks(collection: str, vector: list[float], surah: int, ayah: int, k: int = 12,
                    layer: str = "sarf") -> list[dict]:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qm
    qpath = QDRANT_PATHS.get(layer, QDRANT_PATH)
    cli = QdrantClient(path=str(qpath))
    existing = {c.name for c in cli.get_collections().collections}
    if collection not in existing: return []
    res = cli.search(collection_name=collection, query_vector=vector,
                     query_filter=qm.Filter(should=[
                         qm.FieldCondition(key="surah", match=qm.MatchValue(value=surah)),
                         qm.FieldCondition(key="ayah",  match=qm.MatchValue(value=ayah)),
                     ]),
                     limit=k, with_payload=True)
    if len(res) < 4:
        extra = cli.search(collection_name=collection, query_vector=vector, limit=k, with_payload=True)
        seen = {r.id for r in res}
        for r in extra:
            if r.id not in seen:
                res.append(r)
                if len(res) >= k: break
    return [{"chunk_id": r.payload.get("chunk_id"), "source_id": r.payload.get("source_id"),
             "source_title": r.payload.get("source_title"), "chunk_kind": r.payload.get("chunk_kind"),
             "text_ar": r.payload.get("text_ar", "")[:1500], "score": r.score}
            for r in res]


# ── Per-layer claim type dictionaries (per Tibyan + master docs) ──────────────
SARF_CLAIM_TYPES = [
    "root_core","root_image","root_extension","derived_family","sarf_pattern",
    "verb_form","form_flavour","masdar","participle","noun_type","weak_root",
    "hamzated_root","doubled_root","inflection","qiraat_morph_variant",
    "idiomatic_meaning","verb_preposition_frame","tadmeen_frame",
    "antonym_relation","near_synonym_sarf_difference","translation_loss",
    "academic_key_term_note",
]
IRAB_CLAIM_TYPES = [
    "irab","taalluq","taqdir","qiraat","ikhtilaf","wajh_irab",
    "semantic_effect","rule_reference","governance",
]
BALAGHA_CLAIM_TYPES = [
    "taqdim_takhir","iltifat","hasr_qasr","ijaaz","itnaab","musawat",
    "tashbih","istiarah","majaz","kinayah",
    "jinas","tibaq","muqabalah","saj","takrar",
    "asloob_hakim","naktah","surah_movement",
    "fasl_wasl","tarif_tankir","ijab_inshaa",
    "rule_reference",
]
LAYER_CLAIM_TYPES = {"sarf": SARF_CLAIM_TYPES, "irab": IRAB_CLAIM_TYPES, "balagha": BALAGHA_CLAIM_TYPES}

LAYER_PROMPTS = {
    "sarf": """You are extracting صرف (morphology) claims for K-Maps, processing one Quran ayah at a time.
Return a JSON object with keys "claims" (array) and "warnings" (array of strings).
Each claim must have: word_index (int, which word in the ayah this claim is about), claim_type (one of the sarf types), source_quote_ar (exact substring from a chunk), claim_ar, claim_en, root, lemma, confidence ("high"|"medium"|"low"|"needs_review"), needs_review_reason.
Optional: device_branch, device_subtype, quran_ref.
Extract ONLY morphology: root meaning, wazn/pattern, verb form flavour, idioms, antonyms, translation loss nuance.
DO NOT extract i'rab (case/role) or balagha (rhetoric).
If nothing found, return {"claims": [], "warnings": []}.
IMPORTANT: source_quote_ar MUST be an exact substring of one of the provided source chunks.""",

    "irab": """You are extracting إعراب (Quranic grammar/syntax) claims for K-Maps from التبيان للعكبري and similar works, processing one Quran ayah at a time.
Return a JSON object with keys "claims" (array) and "warnings" (array of strings).
Each claim must have: word_index (int, which word in the ayah), claim_type (one of: irab, taalluq, taqdir, qiraat_irab, ikhtilaf_irab, wajh_irab, semantic_effect, rule_reference, dirasat_note), source_quote_ar (exact substring from a chunk), claim_ar, claim_en, root, lemma, confidence ("high"|"medium"|"low"|"needs_review"), needs_review_reason.
Optional: device_branch, device_subtype, quran_ref.
Extract parsing claims:
  - irab: grammatical role (مبتدأ، خبر، فاعل، مفعول به، حال، تمييز، نعت، مجرور)
  - taalluq: jar-majrur or zarf attachment to governor
  - taqdir: elided word required by syntax
  - qiraat_irab: reading variant affecting case
  - ikhtilaf_irab: grammarian disagreement (Basran vs Kufan, etc.)
  - wajh_irab: alternative analysis
  - semantic_effect: meaning from grammatical structure
  - rule_reference: grammatical rule cited
DO NOT extract sarf (morphology) or balagha (rhetoric).
IMPORTANT: source_quote_ar MUST be an exact substring of one of the provided source chunks.
If nothing found, return {"claims": [], "warnings": []}.""",

    "balagha": """You are extracting بلاغة (rhetoric) claims for K-Maps from al-Jurjani, al-Sakkaki, al-Baqillani, al-Suyuti, and tafsir balagha sections, processing one Quran ayah at a time.
Return a JSON object with keys "claims" (array) and "warnings" (array of strings).
Each claim must have: word_index (int, primary word or 0 for ayah-level device), claim_type (balagha type), source_quote_ar (exact substring from a chunk), claim_ar, claim_en, device_branch (maani|bayan|badi|other), device_subtype, root, lemma, confidence ("high"|"medium"|"low"|"needs_review"), needs_review_reason.
Optional: quran_ref, rhetorical_effect.
Extract rhetoric devices:
  - معاني (maani): taqdim_takhir, hasr_qasr, ijaaz, itnaab, fasl_wasl, tarif_tankir, ijab_inshaa, iltifat
  - بيان (bayan): tashbih, istiarah, majaz, kinayah
  - بديع (badi): jinas, tibaq, muqabalah, saj, takrar
  - Plus: asloob_hakim, naktah, surah_movement
DO NOT extract morphology or grammar.
IMPORTANT: source_quote_ar MUST be an exact substring of one of the provided source chunks.
If nothing found, return {"claims": [], "warnings": []}.""",
}


def make_schema(layer: str) -> tuple[str, dict]:
    claim_types = LAYER_CLAIM_TYPES[layer]
    def _str(n=1200): return {"type": "string", "minLength": 0, "maxLength": n}
    schema = {
        "type": "object", "additionalProperties": False,
        "required": ["claims", "warnings"],
        "properties": {
            "claims": {"type": "array", "items": {
                "type": "object", "additionalProperties": False,
                "required": ["claim_type","source_quote_ar","claim_ar","claim_en",
                             "device_branch","device_subtype","root","lemma","quran_ref","confidence","needs_review_reason"],
                "properties": {
                    "claim_type":      {"type":"string","enum":claim_types},
                    "source_quote_ar": _str(1500),
                    "claim_ar":        _str(1200),
                    "claim_en":        _str(1200),
                    "device_branch":   _str(20),
                    "device_subtype":  _str(60),
                    "root":            _str(40),
                    "lemma":           _str(60),
                    "quran_ref":       _str(20),
                    "confidence":      {"type":"string","enum":["high","medium","low","needs_review"]},
                    "needs_review_reason": _str(240),
                },
            }},
            "warnings": {"type": "array", "items": _str(300)},
        },
    }
    return f"{layer}_extraction", schema


def _build_user_payload(layer: str, ayah_words: list[dict], chunks: list[dict]) -> str:
    first = ayah_words[0]
    payload = {
        "ayah_ref": f"S{first['surah']}:A{first['ayah']}",
        "words": [
            {
                "word_index":     w["word_index"],
                "word_text":      w.get("word_text"),
                "root":           w.get("root"),
                "lemma":          w.get("lemma"),
                "pos":            w.get("pos"),
                "morphology_tag": w.get("morphology_tag"),
            }
            for w in ayah_words
        ],
        "source_chunks": [
            {"chunk_id": c["chunk_id"], "source_title": c["source_title"],
             "text_ar": c["text_ar"][:1200]}
            for c in chunks[:6]
        ],
    }
    return json.dumps(payload, ensure_ascii=False)


# ── Claim-type normalization maps (fix LLM hallucinated types) ─────────────────
_BALAGHA_NORM = {
    "maani": "ijaaz", "معاني": "ijaaz", "بديع": "jinas", "جناس": "jinas",
    "badi:jinas": "jinas", "bayan": "tashbih", "بيان": "tashbih",
    "مقابلة": "muqabalah", "badi": "tibaq", "ijaz": "ijaaz",
    "muaqabalah": "muqabalah", "mucabalah": "muqabalah",
    "mukabalah / parallelism": "muqabalah",
    "tibaq / muqabalah (antithesis / contrast)": "tibaq",
    "طباق/مقابلة": "tibaq", "مقابلة/طباق (سنابل خضر ويابسات)": "muqabalah",
    "التفات": "iltifat", "iltifat (shift in address / vocative)": "iltifat",
    "الالتفات (التبدّل في المتكلم / إلتفات)": "iltifat",
    "حصر/قصر (hasr_qasr)": "hasr_qasr",
    "تشبيه / تصوير مجازي": "tashbih",
    "استعارة/تشخيص (تجسيد النفس كفاعل)": "istiarah",
    "أسلوب حكيم / حركة السرد": "asloob_hakim",
    "أسلوب حكيم (استئناف بياني)": "asloob_hakim",
    "أسلوب إنشائي / أسلوب الأمر (حكمي)": "ijab_inshaa",
    "استفهام إنشائي / إنشائيّ مقنع": "ijab_inshaa",
    "تحرك السورة / انتقال سردي": "surah_movement",
    "تحريك موضوعي/مَوْضِع السورة": "surah_movement",
    "surah_movement (تأطير/إحالة سياقية)": "surah_movement",
    "use_of_إِنَّ_for_emphasis": "ijab_inshaa",
    "توكيد بـ(إِنَّ ... لَ)": "ijab_inshaa",
    "توكيد/تصحيح بالمقابلة (استدراك بـ «بل») / بلاغة التصويب": "muqabalah",
    "kinayah (excuse/indirect attribution)": "kinayah",
    "تمييز/ترتيب الوصف (اقتصاد اللفظ)": "ijaaz",
    "جناس (تجانس لفظي)": "jinas",
    "تنبيه": "rule_reference",
    "إسلاف جواب": "rule_reference",
    "معاني (إعجاز/إيجاز)": "ijaaz",
    "بديع (مقابلة)": "muqabalah",
}
_IRAB_NORM = {
    "qiraat": "qiraat_irab",
    "ikhtilaf": "ikhtilaf_irab",
}
CLAIM_TYPE_NORM = {"balagha": _BALAGHA_NORM, "irab": _IRAB_NORM, "sarf": {}}

VALID_CLAIM_TYPES = {
    "sarf":    set(SARF_CLAIM_TYPES),
    "irab":    set(IRAB_CLAIM_TYPES),
    "balagha": set(BALAGHA_CLAIM_TYPES),
}


def normalize_claim_types(layer: str, claims: list[dict]) -> list[dict]:
    """Normalize and filter claims to valid claim_types only."""
    norm_map  = CLAIM_TYPE_NORM.get(layer, {})
    valid_set = VALID_CLAIM_TYPES[layer]
    out = []
    for c in claims:
        ct = c.get("claim_type", "")
        ct = norm_map.get(ct, ct)
        if ct not in valid_set:
            # Last-chance fuzzy: substring match
            matched = next((v for k, v in norm_map.items() if k in ct or ct in k), None)
            ct = matched or ct
        if ct in valid_set:
            c = {**c, "claim_type": ct}
            out.append(c)
        # else: silently drop truly unrecognizable types
    return out


def call_llm_ollama(layer: str, ayah_words: list[dict], chunks: list[dict]) -> dict:
    """Call local Ollama (qwen2.5:32b or configured model)."""
    model   = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5:32b")
    timeout = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "300"))

    body = {
        "model":   model,
        "think":   False,       # suppress <think> block (qwen3/qwen2.5 support)
        "stream":  False,
        "format":  "json",      # Ollama JSON mode
        "options": {"temperature": 0.1, "num_predict": 2048},
        "messages": [
            {"role": "system", "content": LAYER_PROMPTS[layer]},
            {"role": "user",   "content": _build_user_payload(layer, ayah_words, chunks)},
        ],
    }
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=json.dumps(body, ensure_ascii=False).encode(),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read())
            import re
            raw = data.get("message", {}).get("content", "") or ""
            # Strip any stray <think>…</think> blocks
            raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
            if not raw:
                return {"claims": [], "warnings": ["empty content from ollama"]}
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                # Try to extract JSON object from surrounding text
                m = re.search(r'\{.*\}', raw, re.DOTALL)
                if m:
                    result = json.loads(m.group())
                else:
                    return {"claims": [], "warnings": [f"json parse failed: {raw[:120]}"]}
            return result
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 3:
                time.sleep(3 * attempt)
            else:
                raise RuntimeError(f"Ollama connection failed: {e}")
    return {"claims": [], "warnings": ["all 3 ollama retries failed"]}


def call_llm_openai(layer: str, ayah_words: list[dict], chunks: list[dict]) -> dict:
    """Call OpenAI API (fallback when OLLAMA_LLM_MODEL is not set)."""
    api_key  = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set and Ollama not configured")
    model    = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    timeout  = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "180"))

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": LAYER_PROMPTS[layer]},
            {"role": "user",   "content": _build_user_payload(layer, ayah_words, chunks)},
        ],
        "response_format": {"type": "json_object"},
        "max_completion_tokens": 6000,
    }
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(body, ensure_ascii=False).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST",
    )
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read())
            text = data["choices"][0]["message"].get("content") or ""
            if not text:
                return {"claims": [], "warnings": ["empty content"]}
            return json.loads(text)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"OpenAI HTTP {e.code}: {e.read()[:200].decode('utf-8', 'replace')}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 3: time.sleep(2 ** attempt)
            else: raise
    return {"claims": [], "warnings": ["all 3 retries failed"]}


def validate_and_fix_claims(layer: str, claims: list[dict], chunks: list[dict],
                             ayah_words: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Feedback loop: validate source_quote_ar against actual chunk text.
    Returns (valid_claims, flagged_claims).
    Flagged claims have confidence downgraded and needs_review_reason updated.
    If >30% are flagged, triggers a single self-correction LLM call.
    """
    all_chunk_text = " ".join(c.get("text_ar","") for c in chunks)
    valid, flagged = [], []

    for claim in claims:
        sq = (claim.get("source_quote_ar") or "").strip()
        if not sq or sq in all_chunk_text:
            valid.append(claim)
        else:
            # Try partial match (first 20 chars)
            partial = sq[:20]
            if partial and partial in all_chunk_text:
                valid.append(claim)
            else:
                claim = {**claim,
                         "confidence": "needs_review",
                         "needs_review_reason": (
                             (claim.get("needs_review_reason") or "") +
                             " [source_quote_ar not found in chunks — may be hallucinated]"
                         ).strip()}
                flagged.append(claim)

    # If >40% flagged: run one self-correction pass
    if flagged and len(flagged) / max(len(claims), 1) > 0.4:
        correction_prompt = (
            f"The following {len(flagged)} claims have source_quote_ar strings "
            f"that do NOT appear in the provided source chunks. "
            f"Please re-examine the chunks and either:\n"
            f"(a) Correct source_quote_ar to an exact substring that actually appears in the chunks, or\n"
            f"(b) Return the claim with confidence='needs_review' if no matching text exists.\n\n"
            f"Flagged claims:\n{json.dumps(flagged, ensure_ascii=False)}"
        )
        use_ollama = os.getenv("USE_OLLAMA", "1") != "0"
        try:
            if use_ollama:
                body = {
                    "model":   os.getenv("OLLAMA_LLM_MODEL", "qwen2.5:32b"),
                    "think":   False, "stream": False, "format": "json",
                    "options": {"temperature": 0.05, "num_predict": 1024},
                    "messages": [
                        {"role": "system", "content": LAYER_PROMPTS[layer]},
                        {"role": "user",   "content":
                            _build_user_payload(layer, ayah_words, chunks) +
                            "\n\nSELF-CORRECTION REQUEST:\n" + correction_prompt},
                    ],
                }
                req = urllib.request.Request(f"{OLLAMA_URL}/api/chat",
                    data=json.dumps(body, ensure_ascii=False).encode(),
                    headers={"Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(req, timeout=120) as r:
                    d = json.loads(r.read())
                import re as _re
                raw = d.get("message",{}).get("content","") or ""
                raw = _re.sub(r"<think>.*?</think>","",raw,flags=_re.DOTALL).strip()
                corrected = json.loads(raw) if raw else {}
                corrected_claims = corrected.get("claims", [])
                if corrected_claims:
                    corrected_claims = normalize_claim_types(layer, corrected_claims)
                    # Replace flagged with corrected
                    return valid + corrected_claims, []
        except Exception:
            pass  # self-correction failed — keep originals as flagged

    # Include flagged (with downgraded confidence) in output
    return valid + flagged, flagged


def call_llm(layer: str, ayah_words: list[dict], chunks: list[dict]) -> dict:
    """Route to Ollama (default) or OpenAI, normalize types, run feedback validation."""
    use_ollama = os.getenv("USE_OLLAMA", "1") != "0"
    if use_ollama:
        result = call_llm_ollama(layer, ayah_words, chunks)
    else:
        result = call_llm_openai(layer, ayah_words, chunks)

    # Normalize claim_types to valid enum values
    if result.get("claims"):
        result["claims"] = normalize_claim_types(layer, result["claims"])

    # Feedback loop: validate source quotes, self-correct if needed
    if result.get("claims") and chunks:
        result["claims"], flagged = validate_and_fix_claims(
            layer, result["claims"], chunks, ayah_words)
        if flagged:
            result.setdefault("warnings", []).append(
                f"{len(flagged)} claims had unverifiable source_quote_ar — marked needs_review")

    return result


# ── SQL emit (always into ar_ling_source_claims, generic table) ───────────────
def emit_claim_sql(layer: str, claim: dict, src_chunk: dict, surah: int, ayah: int,
                   word_index: int, run_id: str) -> str:
    cid = stable_id(f"AL:CLAIM:{layer.upper()}:",
                    src_chunk.get("source_id"), src_chunk.get("chunk_id"),
                    claim.get("claim_type"), surah, ayah, word_index,
                    claim.get("source_quote_ar","")[:30])
    payload = {k: v for k, v in claim.items()
               if k not in ("claim_type","source_quote_ar","root","lemma","word_index")}
    return (
        f"INSERT INTO ar_ling_source_claims "
        f"(id, layer, claim_type, source_id, chunk_id, surah, ayah_from, ayah_to, word_index, "
        f"source_quote_ar, claim_payload, confidence, run_id, created_at) "
        f"VALUES ({sql_val(cid)},{sql_val(layer)},{sql_val(claim.get('claim_type'))},"
        f"{sql_val(src_chunk.get('source_id'))},{sql_val(src_chunk.get('chunk_id'))},"
        f"{surah},{ayah},{ayah},{word_index},"
        f"{sql_val(claim.get('source_quote_ar') or '')},"
        f"{sql_val(payload)},"
        f"{sql_val(claim.get('confidence','pending'))},"
        f"{sql_val(run_id)},datetime('now')) "
        f"ON CONFLICT(id) DO UPDATE SET claim_payload=excluded.claim_payload, "
        f"confidence=excluded.confidence;\n"
    )


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--layer",     required=True, choices=["sarf","irab","balagha"])
    ap.add_argument("--scope",     default="ALL")
    ap.add_argument("--limit",     type=int, default=0)
    ap.add_argument("--retrieve-k", type=int, default=12)
    ap.add_argument("--workers",   type=int, default=1)
    ap.add_argument("--worker-id", type=int, default=0)
    args = ap.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY missing", file=sys.stderr); sys.exit(1)

    layer  = args.layer
    layer_dir = LAYER_DIRS[layer]
    collection = LAYER_COLLECTIONS[layer]
    suffix = f"-w{args.worker_id}" if args.workers > 1 else ""

    claims_dir = layer_dir / "data/staging/claims"
    sql_dir    = claims_dir / "sql"
    claims_dir.mkdir(parents=True, exist_ok=True)
    sql_dir.mkdir(parents=True, exist_ok=True)

    done_file = claims_dir / f"done{suffix}.txt"
    done: set[str] = set()
    if done_file.exists():
        done = set(done_file.read_text(encoding="utf-8").splitlines())

    # Load words and group by ayah
    all_words = load_words(args.scope)

    # Group into ayahs: list of (surah, ayah, [words...])
    ayahs = []
    for (s, a), grp in itertools.groupby(all_words, key=lambda w: (w["surah"], w["ayah"])):
        ayahs.append((s, a, list(grp)))

    if args.limit > 0: ayahs = ayahs[:args.limit]
    # Distribute across workers by ayah index
    ayahs = [(s, a, ws) for j, (s, a, ws) in enumerate(ayahs) if j % args.workers == args.worker_id]
    # Filter already done (done key = "S:A")
    ayahs = [(s, a, ws) for s, a, ws in ayahs if f"{s}:{a}" not in done]

    print(f"[{layer} w{args.worker_id}] To process: {len(ayahs):,} ayahs", file=sys.stderr)

    run_id = stable_id(f"AL:RUN:{layer.upper()}:", args.scope, args.workers, args.worker_id)

    done_fh = open(done_file, "a", encoding="utf-8")
    sql_state = {"buf": [], "buf_bytes": 0, "idx": 1}
    sql_prefix = f"{layer}-claims{suffix}"

    def flush_sql():
        if not sql_state["buf"]: return
        p = sql_dir / f"{sql_prefix}-{sql_state['idx']:04d}.sql"
        p.write_text("".join(sql_state["buf"]), encoding="utf-8")
        sql_state["idx"] += 1; sql_state["buf"] = []; sql_state["buf_bytes"] = 0

    def append_sql(stmt: str):
        sz = len(stmt.encode("utf-8"))
        if sql_state["buf"] and sql_state["buf_bytes"] + sz > 4_000_000: flush_sql()
        sql_state["buf"].append(stmt); sql_state["buf_bytes"] += sz

    n_ok = n_err = n_claims = 0
    for i, (s, a, ayah_words) in enumerate(ayahs):
        akey = f"{s}:{a}"
        try:
            # Build query from all words in the ayah
            q = " ".join(filter(None, [
                " ".join(w.get("word_text","") for w in ayah_words),
                " ".join(set(w.get("root","") for w in ayah_words if w.get("root"))),
            ]))
            try:
                vec = embed_text(q)
                chunks = retrieve_chunks(collection, vec, s, a, k=args.retrieve_k, layer=layer)
            except Exception as e:
                chunks = []

            # Skip ayahs with no relevant chunks to avoid noise
            if len(chunks) == 0:
                done_fh.write(akey + "\n"); done_fh.flush()
                n_ok += 1
                continue

            result = call_llm(layer, ayah_words, chunks)
            claim_file = claims_dir / f"{s}_{a}.json"
            claim_file.write_text(json.dumps({"layer": layer, "ayah_key": akey,
                                              "result": result, "n_chunks": len(chunks)},
                                             ensure_ascii=False, indent=2), encoding="utf-8")

            src_chunk = chunks[0] if chunks else {"source_id": "UNKNOWN", "chunk_id": "UNKNOWN"}
            for claim in result.get("claims") or []:
                wi = int(claim.get("word_index") or 1)
                append_sql(emit_claim_sql(layer, claim, src_chunk, s, a, wi, run_id))
                n_claims += 1

            done_fh.write(akey + "\n"); done_fh.flush()
            n_ok += 1
            if i % 50 == 0:
                pct = i / max(len(ayahs),1) * 100
                print(f"  [{layer} w{args.worker_id}] {i:,}/{len(ayahs):,} ({pct:.0f}%) "
                      f"ok={n_ok} claims={n_claims} err={n_err}", file=sys.stderr)
            time.sleep(0.05)
        except Exception as e:
            print(f"  [{layer} w{args.worker_id}] ERROR {akey}: {e}", file=sys.stderr)
            n_err += 1
            if n_err > 30:
                print(f"Too many errors, stopping", file=sys.stderr); break

    flush_sql(); done_fh.close()
    print(f"\n[{layer} w{args.worker_id}] Done. ok={n_ok} claims={n_claims} err={n_err}\n"
          f"SQL files: {sql_state['idx']-1}", file=sys.stderr)


if __name__ == "__main__":
    main()
