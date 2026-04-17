"""
K-Maps Claude Graph Extraction Worker
Reads un-extracted chunks from local D1, calls Claude, saves graph objects
back via the FastAPI tool server.

Usage:
  python extract_graph.py --ayah 12:3 --source ibn_ashur
  python extract_graph.py --ayah 12:3 --model claude-sonnet-4-6   # for quality
"""

import json
import re
import argparse
import sqlite3
import httpx
import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client      = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
D1_DB_PATH  = os.getenv("D1_DB_PATH",  "knowledgemap.db")
TOOL_SERVER = "http://localhost:8000"

# Change to claude-sonnet-4-6 for higher quality extractions
DEFAULT_MODEL = "claude-haiku-4-5"

SYSTEM_PROMPT = """You are an expert in Quranic Arabic, classical Islamic scholarship, and knowledge graph construction.

You extract structured knowledge from tafsir (Quranic exegesis) chunks.
Your output MUST be valid JSON matching the schema provided — no markdown, no explanation, JSON only.
Be precise, scholarly, and comprehensive. Do not invent content not present in the source text."""


def build_prompt(chunk: dict, ayah_text: str) -> str:
    return f"""Extract a unified knowledge graph from this tafsir chunk.

== AYAH ==
{ayah_text}

== CHUNK ==
Source: {chunk['source_name']} | {chunk.get('title_en', '')}
Kind: {chunk['chunk_kind']}
Arabic Title: {chunk.get('title_ar', '')}
Text: {chunk['text']}

== OUTPUT JSON SCHEMA ==
Return ONLY this JSON, no markdown, no explanation:

{{
  "source_ref": {{
    "chunk_id": "{chunk['chunk_id']}",
    "source_name": "{chunk['source_name']}",
    "ayah_ref": "{chunk['ayah_ref']}",
    "chunk_kind": "{chunk['chunk_kind']}"
  }},
  "linguistic_layer": {{
    "lexical_items": [
      {{"word_ar": "...", "root": "...", "meaning_en": "...", "note": "..."}}
    ],
    "morphology_notes": [
      {{"word_ar": "...", "form": "...", "parsing": "...", "significance": "..."}}
    ],
    "syntax_notes": [
      {{"construction": "...", "rule": "...", "significance": "..."}}
    ]
  }},
  "tafsir_layer": {{
    "concepts": [
      {{"id": "concept:LABEL:N", "label": "...", "label_ar": "...",
        "concept_type": "theological|linguistic|ethical|legal|narrative|rhetorical",
        "description": "...", "ayah_ref": "{chunk['ayah_ref']}"}}
    ],
    "claims": [
      {{"id": "claim:VERB:N", "text": "...", "text_ar": "...",
        "claim_type": "assertion|command|prohibition|description|promise|warning",
        "polarity": "positive|negative|conditional"}}
    ],
    "evidences": [
      {{"id": "evidence:N", "claim_id": "claim:...", "quote_ar": "...",
        "quote_en": "...", "evidence_type": "textual|lexical|logical|hadith"}}
    ]
  }},
  "graph_layer": {{
    "edges": [
      {{"id": "edge:N", "from": "concept:...", "from_type": "concept|claim",
        "to": "concept:...", "to_type": "concept|claim",
        "edge_type": "supports|contradicts|elaborates|illustrates|causes|requires|part_of|related",
        "weight": 1.0, "note": "..."}}
    ]
  }},
  "pattern_layer": {{
    "motifs": [
      {{"id": "motif:N", "label": "...", "label_ar": "...",
        "motif_type": "narrative|theological|rhetorical|structural|intertextual"}}
    ],
    "themes": [
      {{"id": "theme:N", "label": "...", "label_ar": "...",
        "theme_scope": "ayah|passage|surah|quran", "ayah_ref": "{chunk['ayah_ref']}"}}
    ]
  }},
  "structure_layer": {{
    "segments": [
      {{"id": "seg:N", "label": "...", "segment_type": "intro|body|conclusion|transition|elaboration",
        "summary": "...", "order_index": 1}}
    ]
  }}
}}"""


def extract_for_ayah(ayah_ref: str, source: str = "ibn_ashur", model: str = DEFAULT_MODEL):
    db = sqlite3.connect(D1_DB_PATH)
    db.row_factory = sqlite3.Row

    # Get ayah text
    surah, ayah = map(int, ayah_ref.split(":"))
    row = db.execute(
        "SELECT text_uthmani_clean, translation FROM ar_quran_ayah WHERE surah=? AND ayah=?",
        (surah, ayah),
    ).fetchone()
    ayah_text = f"{row['text_uthmani_clean']}\n{row['translation']}" if row else ayah_ref

    # Get un-extracted chunks
    chunks = db.execute(
        """SELECT * FROM ar_tafsir_chunks
           WHERE ayah_ref=? AND source_name=? AND is_graph_extracted=0
           ORDER BY chunk_index""",
        (ayah_ref, source),
    ).fetchall()

    if not chunks:
        print(f"✅ No unextracted chunks for {ayah_ref} / {source} — all done.")
        db.close()
        return

    print(f"📖 Extracting graph — {len(chunks)} chunks | {ayah_ref} | {source}")
    print(f"   Model: {model}\n")

    total_in  = 0
    total_out = 0

    for chunk in chunks:
        chunk = dict(chunk)
        title = chunk.get("title_en") or chunk["chunk_kind"]
        print(f"  → chunk {chunk['chunk_index']:02d}: {title}")

        prompt = build_prompt(chunk, ayah_text)

        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()

        # Parse JSON safely
        try:
            graph = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    graph = json.loads(match.group())
                except json.JSONDecodeError:
                    print(f"  ⚠️  JSON parse failed for chunk {chunk['chunk_id']}")
                    continue
            else:
                print(f"  ⚠️  No JSON found for chunk {chunk['chunk_id']}")
                continue

        # Save via tool server
        resp = httpx.post(
            f"{TOOL_SERVER}/save_graph",
            json={"chunk_id": chunk["chunk_id"], "graph": graph},
            timeout=30,
        )
        result = resp.json()

        usage    = response.usage
        total_in  += usage.input_tokens
        total_out += usage.output_tokens
        print(f"     saved: {result} | tokens: {usage.input_tokens}in/{usage.output_tokens}out")

    db.close()

    # Cost estimate
    if "haiku" in model:
        cost = (total_in * 0.25 + total_out * 1.25) / 1_000_000
    else:
        cost = (total_in * 3.0 + total_out * 15.0) / 1_000_000

    print(f"\n✅ Extraction complete for {ayah_ref}")
    print(f"   Tokens: {total_in:,} in / {total_out:,} out")
    print(f"   Estimated cost: ${cost:.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Claude graph extractor for K-Maps tafsir")
    parser.add_argument("--ayah",   required=True, help="e.g. 12:3")
    parser.add_argument("--source", default="ibn_ashur")
    parser.add_argument("--model",  default=DEFAULT_MODEL,
                        help="claude-haiku-4-5 (cheap) or claude-sonnet-4-6 (quality)")
    args = parser.parse_args()
    extract_for_ayah(args.ayah, args.source, args.model)
