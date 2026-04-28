#!/usr/bin/env python3
"""
Convert chunk JSONL → SQL INSERT statements for ar_ling_sources +
ar_ling_source_editions + ar_ling_source_chunks.

Outputs:
  <output_dir>/<layer>_sources.sql       (one row per unique source)
  <output_dir>/<layer>_sql/<layer>-chunks-NNN.sql   (4MB-split chunk inserts)

Usage:
    python3 _shared/chunks_to_sql.py --input <chunks.jsonl> --output-dir <dir> --layer irab
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def sql_val(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input",     required=True)
    ap.add_argument("--output-dir", required=True)
    ap.add_argument("--layer",     required=True, choices=["sarf","irab","balagha"])
    args = ap.parse_args()

    inp  = Path(args.input)
    odir = Path(args.output_dir); odir.mkdir(parents=True, exist_ok=True)
    chunks_dir = odir / f"{args.layer}_sql"; chunks_dir.mkdir(exist_ok=True)

    sources: dict[str, dict] = {}
    chunks: list[dict] = []
    with open(inp, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            c = json.loads(line)
            sid = c["source_id"]
            if sid not in sources:
                meta = c.get("meta_json") or {}
                sources[sid] = {
                    "id":          sid,
                    "title_ar":    meta.get("title_ar"),
                    "title_en":    c.get("source_title_en"),
                    "source_type": "lexicon" if c.get("chunk_kind")=="lexicon" else \
                                   "irab"    if args.layer=="irab" else \
                                   "balagha" if args.layer=="balagha" else \
                                   "morphology",
                    "author":      meta.get("author"),
                    "year":        meta.get("year"),
                }
            chunks.append(c)

    # 1) sources SQL
    src_file = odir / f"{args.layer}_sources.sql"
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(f"-- {args.layer} source registrations\n")
        for sid, s in sources.items():
            f.write(
                f"INSERT INTO ar_ling_sources "
                f"(id, title_ar, title_en, source_type, author_name, period_label, note_md) "
                f"VALUES ({sql_val(s['id'])}, {sql_val(s.get('title_ar'))}, {sql_val(s['title_en'])}, "
                f"{sql_val(s['source_type'])}, {sql_val(s.get('author'))}, {sql_val(s.get('year'))}, "
                f"NULL) "
                f"ON CONFLICT(id) DO UPDATE SET title_ar=excluded.title_ar, "
                f"title_en=excluded.title_en, source_type=excluded.source_type;\n"
            )
    print(f"Sources: {len(sources)} → {src_file}", file=sys.stderr)

    # 2) chunks SQL (4MB split)
    MAX_BYTES = 4_000_000
    state = {"buf": [], "size": 0, "idx": 1}
    files: list[Path] = []

    def flush():
        if not state["buf"]: return
        p = chunks_dir / f"{args.layer}-chunks-{state['idx']:03d}.sql"
        p.write_text("".join(state["buf"]), encoding="utf-8")
        files.append(p)
        state["idx"] += 1; state["buf"] = []; state["size"] = 0

    for c in chunks:
        meta = c.get("meta_json") or {}
        text = c.get("text_ar") or ""
        tokens = max(1, len(text.split()))
        stmt = (
            f"INSERT INTO ar_ling_source_chunks "
            f"(id, source_id, chunk_kind, chunk_seq, heading_norm, text_ar, page_no, tokens_approx, meta_json) "
            f"VALUES ({sql_val(c['id'])}, {sql_val(c['source_id'])}, {sql_val(c.get('chunk_kind'))}, "
            f"{sql_val(c.get('chunk_seq', 0))}, {sql_val(c.get('heading_norm'))}, "
            f"{sql_val(text)}, {sql_val(c.get('page_no'))}, {sql_val(tokens)}, {sql_val(meta)}) "
            f"ON CONFLICT(id) DO UPDATE SET text_ar=excluded.text_ar, meta_json=excluded.meta_json;\n"
        )
        sz = len(stmt.encode("utf-8"))
        if state["buf"] and state["size"] + sz > MAX_BYTES:
            flush()
        state["buf"].append(stmt); state["size"] += sz

    flush()
    print(f"Chunks: {len(chunks)} → {len(files)} SQL files in {chunks_dir}", file=sys.stderr)


if __name__ == "__main__":
    main()
