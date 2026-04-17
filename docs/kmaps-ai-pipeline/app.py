"""
K-Maps FastAPI Tool Server
Exposes D1 (local SQLite copy) + Qdrant to Claude via HTTP.

Run: uvicorn app:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

import sqlite3
import os
import requests
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="K-Maps Tool Server", version="1.0")

QDRANT_URL  = os.getenv("QDRANT_URL",  "http://localhost:6333")
OLLAMA_URL  = os.getenv("OLLAMA_URL",  "http://localhost:11434")
D1_DB_PATH  = os.getenv("D1_DB_PATH",  "knowledgemap.db")
EMBED_MODEL = os.getenv("EMBED_MODEL", "qwen3-embedding")

qdrant = QdrantClient(url=QDRANT_URL)


# ── DB helper ────────────────────────────────────────────────────────────────
@contextmanager
def get_db():
    conn = sqlite3.connect(D1_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ── Embedding helper ─────────────────────────────────────────────────────────
def embed_query(text: str) -> list[float]:
    r = requests.post(
        f"{OLLAMA_URL}/api/embed",
        json={"model": EMBED_MODEL, "input": text},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["embeddings"][0]


# ── Request models ───────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    collection: str = "quran_tafsir_ibn_ashur"
    limit: int = 5
    score_threshold: float = 0.6


class SaveGraphRequest(BaseModel):
    chunk_id: str
    graph: dict


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "db": D1_DB_PATH, "qdrant": QDRANT_URL}


# ── Quran ────────────────────────────────────────────────────────────────────
@app.get("/ayah/{surah}/{ayah}")
def get_ayah(surah: int, ayah: int):
    with get_db() as db:
        row = db.execute(
            """SELECT surah, ayah,
                      text_uthmani_clean, text_uthmani, text_bare,
                      translation, verse_mark, page_number
               FROM ar_quran_ayah WHERE surah=? AND ayah=?""",
            (surah, ayah),
        ).fetchone()
    if not row:
        raise HTTPException(404, f"Ayah {surah}:{ayah} not found")
    return dict(row)


@app.get("/ayahs/{surah}/{from_ayah}/{to_ayah}")
def get_ayah_range(surah: int, from_ayah: int, to_ayah: int):
    with get_db() as db:
        rows = db.execute(
            """SELECT surah, ayah, text_uthmani_clean, text_uthmani,
                      text_bare, translation, verse_mark
               FROM ar_quran_ayah
               WHERE surah=? AND ayah BETWEEN ? AND ?
               ORDER BY ayah""",
            (surah, from_ayah, to_ayah),
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/surah/{surah_id}")
def get_surah(surah_id: int):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM ar_quran_surahs WHERE id=?", (surah_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, f"Surah {surah_id} not found")
    return dict(row)


# ── Tafsir Chunks ────────────────────────────────────────────────────────────
@app.get("/chunks/{ayah_ref}")
def get_chunks_for_ayah(ayah_ref: str, source: str = "ibn_ashur"):
    with get_db() as db:
        rows = db.execute(
            """SELECT * FROM ar_tafsir_chunks
               WHERE ayah_ref=? AND source_name=?
               ORDER BY chunk_index""",
            (ayah_ref, source),
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/chunk/{chunk_id}")
def get_chunk(chunk_id: str):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM ar_tafsir_chunks WHERE chunk_id=?", (chunk_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, f"Chunk {chunk_id} not found")
    return dict(row)


# ── Semantic Search ──────────────────────────────────────────────────────────
@app.post("/search_tafsir")
def search_tafsir(req: SearchRequest):
    vector  = embed_query(req.query)
    results = qdrant.search(
        collection_name=req.collection,
        query_vector=vector,
        limit=req.limit,
        score_threshold=req.score_threshold,
        with_payload=True,
    )
    return [
        {
            "score":      r.score,
            "chunk_id":   r.payload.get("chunk_id"),
            "title_en":   r.payload.get("title_en"),
            "title_ar":   r.payload.get("title_ar"),
            "chunk_kind": r.payload.get("chunk_kind"),
            "ayah_ref":   r.payload.get("ayah_ref"),
            "text":       r.payload.get("text"),
        }
        for r in results
    ]


# ── Graph Objects ────────────────────────────────────────────────────────────
@app.get("/concepts/{ayah_ref}")
def get_concepts(ayah_ref: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM km_tafsir_concepts WHERE ayah_ref=?", (ayah_ref,)
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/themes/{surah_no}")
def get_themes(surah_no: int):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM km_tafsir_themes WHERE surah_no=?", (surah_no,)
        ).fetchall()
    return [dict(r) for r in rows]


# ── Arabic ───────────────────────────────────────────────────────────────────
@app.get("/vocab/{root}")
def search_vocab_by_root(root: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM ar_vocab WHERE root=?", (root,)
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/grammar/{category}")
def get_grammar_rules(category: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM ar_grammar_rule WHERE category=? ORDER BY sort_order",
            (category,),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Save Graph ───────────────────────────────────────────────────────────────
@app.post("/save_graph")
def save_graph(req: SaveGraphRequest):
    g     = req.graph
    saved = {"concepts": 0, "claims": 0, "edges": 0, "themes": 0, "motifs": 0}

    with get_db() as db:
        for c in g.get("tafsir_layer", {}).get("concepts", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_concepts
                   (concept_id, label, label_ar, concept_type, description, ayah_ref)
                   VALUES (?,?,?,?,?,?)""",
                (c["id"], c["label"], c.get("label_ar"), c["concept_type"],
                 c.get("description"), c.get("ayah_ref")),
            )
            saved["concepts"] += 1

        for cl in g.get("tafsir_layer", {}).get("claims", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_claims
                   (claim_id, chunk_id, text, text_ar, claim_type, polarity)
                   VALUES (?,?,?,?,?,?)""",
                (cl["id"], req.chunk_id, cl["text"], cl.get("text_ar"),
                 cl["claim_type"], cl.get("polarity", "positive")),
            )
            saved["claims"] += 1

        for e in g.get("graph_layer", {}).get("edges", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_edges
                   (edge_id, from_id, from_type, to_id, to_type, edge_type, weight, chunk_id)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (e["id"], e["from"], e.get("from_type", "concept"),
                 e["to"],  e.get("to_type", "concept"),
                 e["edge_type"], e.get("weight", 1.0), req.chunk_id),
            )
            saved["edges"] += 1

        for t in g.get("pattern_layer", {}).get("themes", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_themes
                   (theme_id, label, label_ar, theme_scope, ayah_ref)
                   VALUES (?,?,?,?,?)""",
                (t["id"], t["label"], t.get("label_ar"),
                 t.get("theme_scope", "ayah"), t.get("ayah_ref")),
            )
            saved["themes"] += 1

        db.execute(
            "UPDATE ar_tafsir_chunks SET is_graph_extracted=1 WHERE chunk_id=?",
            (req.chunk_id,),
        )
        db.commit()

    return {"status": "saved", "chunk_id": req.chunk_id, **saved}
