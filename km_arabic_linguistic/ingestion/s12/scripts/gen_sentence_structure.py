#!/usr/bin/env python3
"""
Generate qr_ss_* sentence structure SQL for Surah 12 using Mahmoud Safi's
"al-Jadwal fi I'rab al-Quran" as source.

Safi provides per-ayah word-by-word irab analysis. We use qwen3 to extract:
  - qr_ss_occ_sentence  (sentence-level: declarative, nominal, verbal etc.)
  - qr_ss_occ_clause    (clause-level: main, relative, conditional etc.)
  - qr_ss_occ_phrase    (phrase-level: NP, VP, PP, AP etc.)
  - qr_ss_syntax_relations (grammatical dependency: subject, object, predicate etc.)

Output: s12/sql/s12_qr_sentence_structure.sql
        (deploy to km_quran)

Usage:
    python3 s12/scripts/gen_sentence_structure.py
    python3 s12/scripts/gen_sentence_structure.py --dry-run
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, sqlite3, sys, time, urllib.request
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE       = Path(__file__).resolve().parents[2]       # ingestion/
SAFI_DB    = BASE / "../Tafsirs/al-jadwal-fi-i-rab-al-quran.db"
SPINE_DB   = BASE / "صرف/kmaps-sarf/data/raw/spine/spine.sqlite"
OUT_DIR    = Path(__file__).resolve().parents[1] / "sql"
OUT_SQL    = OUT_DIR / "s12_qr_sentence_structure.sql"
CACHE_DIR  = Path(__file__).resolve().parents[1] / "cache/ss"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

HTML_TAG   = re.compile(r'<[^>]+>')
MULTI_SPC  = re.compile(r'  +')

# ── ID generation ──────────────────────────────────────────────────────────────
def uid(*parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return "QR:SS:" + hashlib.sha1(raw.encode()).hexdigest()[:20]

def sv(v) -> str:
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

# ── HTML strip ─────────────────────────────────────────────────────────────────
def strip_html(text: str) -> str:
    if not text: return ""
    text = html.unescape(text)
    text = HTML_TAG.sub(' ', text)
    return MULTI_SPC.sub(' ', text).strip()

# ── Load Safi DB ───────────────────────────────────────────────────────────────
def load_safi_s12() -> dict[int, str]:
    """Returns {ayah_num: clean_text} for all S12 ayahs with content."""
    cx = sqlite3.connect(SAFI_DB)
    rows = cx.execute(
        "SELECT ayah_key, text FROM tafsir WHERE ayah_key LIKE '12:%' ORDER BY ayah_key"
    ).fetchall()
    cx.close()
    result = {}
    for ayah_key, text in rows:
        clean = strip_html(text)
        if clean:
            try:
                ayah_num = int(ayah_key.split(":")[1])
                result[ayah_num] = clean
            except (ValueError, IndexError):
                pass
    return result

# ── Load spine words for an ayah ───────────────────────────────────────────────
def load_spine_words(ayah: int) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT word_index, word_text, root, lemma FROM qr_word_occurrences "
        "WHERE surah=12 AND ayah=? ORDER BY word_index", (ayah,)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]

# ── LLM call ──────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a Quranic Arabic syntax expert extracting sentence structure from Mahmoud Safi's "al-Jadwal fi I'rab al-Quran".

Given Safi's irab analysis for ONE ayah, extract the sentence structure as structured JSON.

Return ONLY valid JSON with these keys:
{
  "sentences": [
    {
      "ayah_from": int,
      "ayah_to": int,
      "word_start": int,   // 1-based word index where sentence starts (null = whole ayah)
      "word_end": int,     // 1-based word index where sentence ends (null = whole ayah)
      "sentence_kind": string,  // "declarative"|"nominal"|"verbal"|"interrogative"|"imperative"|"conditional"|"exclamatory"|"oath"|"answer"|"fragment"
      "discourse_role": string, // brief: "main narrative"|"parenthetical"|"divine address"|"command"|"quotation" etc.
      "note_ar": string,        // brief Arabic note about sentence structure (optional, can be "")
      "clauses": [
        {
          "clause_order": int,  // 1-based
          "clause_type": string,  // "main"|"relative"|"conditional_if"|"conditional_then"|"adverbial_time"|"adverbial_place"|"adverbial_manner"|"nominal_complement"|"object_clause"|"explanatory"|"purpose"
          "word_start": int,   // 1-based
          "word_end": int,     // 1-based
          "head_word_index": int,  // main verb/noun word index (null if unknown)
          "note_ar": string    // brief Arabic analysis note
        }
      ],
      "syntax_relations": [
        {
          "word_index": int,      // 1-based word position
          "word_ar": string,      // Arabic word
          "relation_type": string, // "subject"|"predicate"|"object_direct"|"object_indirect"|"adjective"|"appositive"|"circumstantial_hal"|"specification_tamyiz"|"vocative"|"exception"|"adverb"|"complement_jar_majrur"|"complement_zarf"|"coordinated"
          "governor_word_index": int,  // word that governs this word (null if none)
          "irab_position": string,  // grammatical position in Arabic: "مبتدأ"|"خبر"|"فاعل"|"مفعول به" etc.
          "irab_case": string,   // "مرفوع"|"منصوب"|"مجرور"|"مجزوم"|""
          "note_ar": string      // excerpt from Safi explaining this word's irab
        }
      ]
    }
  ],
  "warnings": []
}

IMPORTANT:
- Base everything on Safi's explicit analysis — do not guess
- word_start/word_end are 1-based positions in the ayah
- If the ayah has multiple sentences (e.g. continuation from prev or split), model them separately
- Keep notes concise — max 200 chars
- If Safi doesn't have enough detail for clauses/relations, return empty arrays
"""

def call_llm(ayah: int, words: list[dict], safi_text: str) -> dict:
    words_list = " ".join(f"[{w['word_index']}]{w['word_text']}" for w in words)
    user_msg = (
        f"SURAH 12, AYAH {ayah}\n"
        f"Words (word_index): {words_list}\n\n"
        f"Safi's I'rab Analysis:\n{safi_text[:3000]}"
    )
    body = json.dumps({
        "model": LLM_MODEL,
        "think": False,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 4096},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
    }).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            resp = json.loads(r.read())
        content = resp.get("message", {}).get("content", "")
    except Exception as e:
        return {"sentences": [], "warnings": [f"LLM error: {e}"]}
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    try:
        return json.loads(content)
    except Exception:
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
        return {"sentences": [], "warnings": ["JSON parse failed"]}

# ── SQL generation ─────────────────────────────────────────────────────────────
def to_sql(ayah: int, data: dict) -> list[str]:
    stmts = []
    for sent in data.get("sentences", []):
        if not sent: continue
        sent_id = uid("sent", 12, ayah, sent.get("ayah_from", ayah),
                      sent.get("word_start"), sent.get("sentence_kind"))
        stmts.append(
            f"INSERT OR IGNORE INTO qr_ss_occ_sentence "
            f"(id,surah,ayah_from,ayah_to,word_start_index,word_end_index,"
            f"sentence_kind,discourse_role,note_md) VALUES ("
            f"{sv(sent_id)},12,"
            f"{sent.get('ayah_from', ayah)},{sent.get('ayah_to', ayah)},"
            f"{sv(sent.get('word_start'))},{sv(sent.get('word_end'))},"
            f"{sv(sent.get('sentence_kind','declarative'))},"
            f"{sv(sent.get('discourse_role',''))},"
            f"{sv(sent.get('note_ar',''))});"
        )
        # Clauses
        for cl in sent.get("clauses", []):
            cl_id = uid("cl", sent_id, cl.get("clause_order"), cl.get("clause_type"))
            stmts.append(
                f"INSERT OR IGNORE INTO qr_ss_occ_clause "
                f"(id,sentence_id,parent_clause_id,clause_order,surah,"
                f"ayah_from,ayah_to,word_start_index,word_end_index,"
                f"clause_type,note_md) VALUES ("
                f"{sv(cl_id)},{sv(sent_id)},NULL,"
                f"{cl.get('clause_order',1)},12,"
                f"{sent.get('ayah_from',ayah)},{sent.get('ayah_to',ayah)},"
                f"{sv(cl.get('word_start'))},{sv(cl.get('word_end'))},"
                f"{sv(cl.get('clause_type','main'))},"
                f"{sv(cl.get('note_ar',''))});"
            )
        # Syntax relations
        for rel in sent.get("syntax_relations", []):
            rel_id = uid("rel", sent_id, rel.get("word_index"), rel.get("relation_type"))
            stmts.append(
                f"INSERT OR IGNORE INTO qr_ss_syntax_relations "
                f"(id,sentence_id,surah,ayah,word_index,word_ar,relation_type,"
                f"governor_word_index,irab_position,irab_case,note_md) VALUES ("
                f"{sv(rel_id)},{sv(sent_id)},12,{ayah},"
                f"{sv(rel.get('word_index'))},{sv(rel.get('word_ar',''))},"
                f"{sv(rel.get('relation_type',''))},"
                f"{sv(rel.get('governor_word_index'))},"
                f"{sv(rel.get('irab_position',''))},"
                f"{sv(rel.get('irab_case',''))},"
                f"{sv(rel.get('note_ar','')[:400])});"
            )
    return stmts

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ayah", type=int, default=None, help="Process only this ayah")
    parser.add_argument("--resume", action="store_true", help="Skip ayahs already in cache")
    args = parser.parse_args()

    OUT_DIR.mkdir(exist_ok=True)
    CACHE_DIR.mkdir(exist_ok=True)

    safi_data = load_safi_s12()
    ayahs = sorted(safi_data.keys())
    if args.ayah:
        ayahs = [args.ayah] if args.ayah in safi_data else []

    print(f"\n{'='*60}")
    print(f"  Safi → S12 Sentence Structure")
    print(f"  Source ayahs: {len(safi_data)}/111 | Model: {LLM_MODEL}")
    print(f"{'='*60}\n")

    if args.dry_run:
        print(f"DRY RUN — would process {len(ayahs)} ayahs:")
        print(f"  {ayahs[:20]}{'...' if len(ayahs)>20 else ''}")
        return

    all_stmts = []
    ok = 0; skipped = 0; failed = 0

    for i, ayah in enumerate(ayahs):
        cache_file = CACHE_DIR / f"12_{ayah}.json"

        # Resume: skip if cache exists and has sentences
        if args.resume and cache_file.exists():
            cached = json.loads(cache_file.read_text())
            if cached.get("sentences"):
                stmts = to_sql(ayah, cached)
                all_stmts.extend(stmts)
                skipped += 1
                continue

        words = load_spine_words(ayah)
        safi_text = safi_data[ayah]

        t0 = time.time()
        result = call_llm(ayah, words, safi_text)
        elapsed = time.time() - t0

        n_sent = len(result.get("sentences", []))
        n_cl   = sum(len(s.get("clauses", [])) for s in result.get("sentences", []))
        n_rel  = sum(len(s.get("syntax_relations", [])) for s in result.get("sentences", []))
        warns  = result.get("warnings", [])

        # Cache
        cache_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))

        stmts = to_sql(ayah, result)
        all_stmts.extend(stmts)

        status = f"✓ {n_sent}s/{n_cl}cl/{n_rel}rel"
        if warns:
            status += f" ⚠ {warns[0][:40]}"
        print(f"  [{i+1}/{len(ayahs)}] 12:{ayah:<4} {status:40} {elapsed:.1f}s")
        ok += 1

        # Flush every 15 ayahs
        if ok % 15 == 0:
            OUT_SQL.write_text("\n".join(all_stmts), encoding="utf-8")
            print(f"    └─ flushed {len(all_stmts)} stmts to {OUT_SQL.name}")

    # Final write
    OUT_SQL.write_text("\n".join(all_stmts), encoding="utf-8")
    print(f"\n{'='*60}")
    print(f"  Done: {ok} processed | {skipped} from cache | {failed} failed")
    print(f"  SQL: {len(all_stmts)} statements → {OUT_SQL}")
    print(f"\n  Deploy to km_quran:")
    print(f"  wrangler d1 execute km_quran --remote --file {OUT_SQL} \\")
    print(f"    --config /Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/workers/quran/wrangler.toml")

if __name__ == "__main__":
    main()
