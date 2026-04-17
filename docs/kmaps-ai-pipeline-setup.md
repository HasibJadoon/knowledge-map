# K-Maps AI Pipeline — Complete Mac M4 Setup Guide

> Claude as LLM · Ollama (qwen3-embedding) for vectors · Qdrant for search · FastAPI for tool serving  
> Cost-effective, local-first, production-ready

---

## Architecture Overview

```
Classical Arabic Tafsir Text
        ↓
  [ Chunker script ]           ← you write JSON chunks manually / via script
        ↓
  [ Ollama qwen3-embedding ]   ← LOCAL, free, runs on your M4
        ↓
  [ Qdrant ]                   ← LOCAL Docker container, vector store
        ↓
  [ FastAPI tool server ]      ← Python server bridging D1 + Qdrant
        ↓
  [ Claude API ]               ← Anthropic API — reasoning, extraction, graph build
        ↓
  [ D1 knowledgemap ]          ← Cloudflare D1, stores structured graph objects
```

**Cost model:**
- Embedding: FREE (Ollama local)
- Vector DB: FREE (Qdrant local)
- LLM: Claude API only (pay per token)
  - `claude-haiku-4-5` — bulk extraction, ~$0.25/M input tokens
  - `claude-sonnet-4-6` — quality analysis, ~$3/M input tokens
  - A full tafsir surah extraction run ≈ $2–8 total

---

## Phase 1 — System Dependencies

### 1.1 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# After install, add to PATH (M1/M2/M3/M4 Macs)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 1.2 Python 3.11+

```bash
brew install python@3.11
python3.11 --version   # should say Python 3.11.x

# Set as default
echo 'alias python=python3.11' >> ~/.zshrc
echo 'alias pip=pip3.11' >> ~/.zshrc
source ~/.zshrc
```

### 1.3 Docker Desktop

Download from https://www.docker.com/products/docker-desktop/  
Install the Apple Silicon (M-chip) version, then:

```bash
docker --version   # verify install
# Make sure Docker Desktop is running in menu bar
```

### 1.4 Node / Wrangler (you likely already have this)

```bash
brew install node
npm install -g wrangler
wrangler --version
```

---

## Phase 2 — Qdrant (Vector Database)

Qdrant runs locally in Docker. All your vectors stay on your Mac.

```bash
# Pull Qdrant image
docker pull qdrant/qdrant

# Run Qdrant (persistent storage in ~/qdrant_storage)
mkdir -p ~/qdrant_storage

docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v ~/qdrant_storage:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant

# Verify it's running
curl http://localhost:6333/health
# → {"title":"qdrant - vector search engine","version":"..."}
```

**Qdrant dashboard** — open http://localhost:6333/dashboard in browser.

To restart after Mac reboot:
```bash
docker start qdrant
```

---

## Phase 3 — Ollama (Local Embedding Model)

Ollama runs models natively on Apple Silicon. You use it **only for embeddings** — Claude handles all reasoning.

### 3.1 Install Ollama

```bash
brew install ollama
```

Or download from https://ollama.com/download — the .app version works fine.

### 3.2 Start Ollama and Pull the Embedding Model

```bash
# Start Ollama service
ollama serve &

# Pull the multilingual embedding model (Arabic + English)
ollama pull qwen3-embedding

# Verify
ollama list
# should show: qwen3-embedding   ...   active
```

### 3.3 Test the Embedding

```bash
curl http://localhost:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-embedding",
    "input": "source_type: tafsir\nsource_name: ibn_ashur\ntext: الم تلك آيات الكتاب المبين"
  }'
# → {"embeddings": [[0.023, -0.011, ...]]}   (long vector)
```

**Autostart Ollama on login:**  
Open Ollama.app → it adds itself to Login Items automatically.

---

## Phase 4 — Anthropic API (Claude as LLM)

### 4.1 Get Your API Key

1. Go to https://console.anthropic.com
2. API Keys → Create Key
3. Copy the key (starts with `sk-ant-...`)

### 4.2 Set Up Environment Variable

```bash
# Add to ~/.zshrc (persistent)
echo 'export ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE"' >> ~/.zshrc
source ~/.zshrc

# Verify
echo $ANTHROPIC_API_KEY
```

### 4.3 Cost-Effective Model Selection

| Use Case | Model | Cost |
|---|---|---|
| Bulk tafsir extraction | `claude-haiku-4-5` | cheapest |
| Graph quality review | `claude-sonnet-4-6` | balanced |
| Deep analysis | `claude-opus-4-6` | premium |

**Rule of thumb:** Use `haiku` for all automated pipeline runs. Switch to `sonnet` only when reviewing specific surahs for quality.

---

## Phase 5 — Python Project Setup

### 5.1 Create Project Directory

```bash
cd ~/Documents  # or wherever you keep projects
mkdir kmaps-ai-pipeline
cd kmaps-ai-pipeline

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# You should see (venv) in your prompt
```

### 5.2 Install Python Dependencies

```bash
pip install \
  fastapi \
  uvicorn[standard] \
  qdrant-client \
  anthropic \
  requests \
  python-dotenv \
  httpx \
  pydantic \
  aiohttp \
  python-multipart

# Save requirements
pip freeze > requirements.txt
```

### 5.3 Create .env File

```bash
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434
D1_DB_PATH=/path/to/your/local/knowledgemap.db
EMBED_MODEL=qwen3-embedding
EOF
```

**For D1_DB_PATH:** When working locally, you can use a local SQLite copy of your D1 DB:
```bash
# Export D1 to local SQLite for dev
wrangler d1 export knowledgemap --output=knowledgemap.db
# Then set D1_DB_PATH to that file path
```

---

## Phase 6 — D1 Migration (New Tables)

Create this file in your K-Maps repo:

**`Database/migrations/2026-04-17_tafsir_graph_schema.sql`**

```sql
-- ============================================================
-- TAFSIR CHUNKS — raw + embedded chunks
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_tafsir_chunks (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_id         TEXT NOT NULL UNIQUE,       -- e.g. ibn_ashur:12:3:chunk:1
  source_name      TEXT NOT NULL,              -- 'ibn_ashur'|'ibn_kathir'|'tabari'
  source_book      TEXT,                       -- 'al_tahrir_wa_al_tanwir'
  surah_no         INTEGER NOT NULL,
  ayah_start       INTEGER NOT NULL,
  ayah_end         INTEGER NOT NULL,
  ayah_ref         TEXT NOT NULL,              -- '12:3'
  chunk_index      INTEGER NOT NULL,
  chunk_kind       TEXT NOT NULL,
    -- 'verse_header'|'discourse_link'|'rhetoric'|'lexical'|'syntax'
    -- |'grammar'|'semantic'|'theology'|'closing_implication'|'morphology'
  title_ar         TEXT,
  title_en         TEXT,
  text             TEXT NOT NULL,
  topic_tags       TEXT,                       -- JSON array
  embedding_input  TEXT,                       -- structured key:value text for embedding
  is_embedded      INTEGER DEFAULT 0,          -- 0|1
  is_graph_extracted INTEGER DEFAULT 0,        -- 0|1
  qdrant_id        TEXT,                       -- UUID in Qdrant
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_atc_surah      ON ar_tafsir_chunks(surah_no, ayah_start);
CREATE INDEX IF NOT EXISTS idx_atc_source     ON ar_tafsir_chunks(source_name, chunk_kind);
CREATE INDEX IF NOT EXISTS idx_atc_embedded   ON ar_tafsir_chunks(is_embedded, is_graph_extracted);

-- ============================================================
-- GRAPH OBJECTS — extracted from chunks via Claude
-- ============================================================

CREATE TABLE IF NOT EXISTS km_tafsir_concepts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id   TEXT NOT NULL UNIQUE,           -- 'concept:sabr:1'
  label        TEXT NOT NULL,                  -- 'Patience'
  label_ar     TEXT,                           -- 'الصبر'
  concept_type TEXT NOT NULL,
    -- 'theological'|'linguistic'|'ethical'|'legal'|'narrative'|'rhetorical'
  description  TEXT,
  source_name  TEXT,
  ayah_ref     TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS km_tafsir_claims (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id   TEXT NOT NULL UNIQUE,
  chunk_id   TEXT NOT NULL REFERENCES ar_tafsir_chunks(chunk_id),
  text       TEXT NOT NULL,
  text_ar    TEXT,
  claim_type TEXT NOT NULL,
    -- 'assertion'|'command'|'prohibition'|'description'|'promise'|'warning'
  polarity   TEXT DEFAULT 'positive',         -- 'positive'|'negative'|'conditional'
  confidence REAL DEFAULT 0.9,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS km_tafsir_evidences (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id  TEXT NOT NULL UNIQUE,
  chunk_id     TEXT NOT NULL REFERENCES ar_tafsir_chunks(chunk_id),
  claim_id     TEXT REFERENCES km_tafsir_claims(claim_id),
  quote_ar     TEXT NOT NULL,
  quote_en     TEXT,
  evidence_type TEXT DEFAULT 'textual',       -- 'textual'|'lexical'|'logical'|'hadith'
  note         TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS km_tafsir_edges (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  edge_id    TEXT NOT NULL UNIQUE,
  from_id    TEXT NOT NULL,                   -- concept_id or claim_id
  from_type  TEXT NOT NULL,                   -- 'concept'|'claim'
  to_id      TEXT NOT NULL,
  to_type    TEXT NOT NULL,
  edge_type  TEXT NOT NULL,
    -- 'supports'|'contradicts'|'elaborates'|'illustrates'|'causes'
    -- |'requires'|'part_of'|'instance_of'|'related'
  weight     REAL DEFAULT 1.0,
  note       TEXT,
  chunk_id   TEXT REFERENCES ar_tafsir_chunks(chunk_id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS km_tafsir_motifs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  motif_id   TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,                   -- 'Revelation descends with purpose'
  label_ar   TEXT,
  motif_type TEXT NOT NULL,
    -- 'narrative'|'theological'|'rhetorical'|'structural'|'intertextual'
  surah_no   INTEGER,
  frequency  INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS km_tafsir_themes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id    TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,                  -- 'Divine Knowledge'
  label_ar    TEXT,
  theme_scope TEXT NOT NULL,                  -- 'ayah'|'passage'|'surah'|'quran'
  surah_no    INTEGER,
  ayah_ref    TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS km_tafsir_structure_segments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id   TEXT NOT NULL UNIQUE,
  surah_no     INTEGER NOT NULL,
  ayah_start   INTEGER NOT NULL,
  ayah_end     INTEGER NOT NULL,
  order_index  INTEGER NOT NULL,
  label        TEXT NOT NULL,                 -- 'Introduction'|'Core Argument'|'Conclusion'
  segment_type TEXT NOT NULL,
    -- 'intro'|'body'|'conclusion'|'transition'|'elaboration'
  summary      TEXT,
  source_name  TEXT DEFAULT 'ibn_ashur',
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Junction tables: chunk ↔ motif, chunk ↔ theme, chunk ↔ concept
CREATE TABLE IF NOT EXISTS km_chunk_concept (
  chunk_id   TEXT NOT NULL REFERENCES ar_tafsir_chunks(chunk_id),
  concept_id TEXT NOT NULL REFERENCES km_tafsir_concepts(concept_id),
  PRIMARY KEY (chunk_id, concept_id)
);

CREATE TABLE IF NOT EXISTS km_chunk_motif (
  chunk_id TEXT NOT NULL REFERENCES ar_tafsir_chunks(chunk_id),
  motif_id TEXT NOT NULL REFERENCES km_tafsir_motifs(motif_id),
  PRIMARY KEY (chunk_id, motif_id)
);

CREATE TABLE IF NOT EXISTS km_chunk_theme (
  chunk_id TEXT NOT NULL REFERENCES ar_tafsir_chunks(chunk_id),
  theme_id TEXT NOT NULL REFERENCES km_tafsir_themes(theme_id),
  PRIMARY KEY (chunk_id, theme_id)
);

-- Lexicon tables (Lane / Lisan al-Arab)
CREATE TABLE IF NOT EXISTS ar_lexicon_sources (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,                   -- 'lane'|'lisan'|'mufradat'
  title_en   TEXT,
  title_ar   TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_lexicon_entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lexicon_id      INTEGER NOT NULL REFERENCES ar_lexicon_sources(id),
  root            TEXT NOT NULL,              -- trilateral root e.g. ك-ت-ب
  headword        TEXT,
  page_ref        TEXT,                       -- 'vol2:p435'
  raw_text        TEXT,                       -- full entry text
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lexicon_root ON ar_lexicon_entries(root);

CREATE TABLE IF NOT EXISTS ar_lexicon_chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id     INTEGER NOT NULL REFERENCES ar_lexicon_entries(id),
  chunk_index  INTEGER NOT NULL,
  chunk_kind   TEXT,                          -- 'definition'|'usage'|'etymology'|'example'
  text         TEXT NOT NULL,
  embedding_input TEXT,
  is_embedded  INTEGER DEFAULT 0,
  qdrant_id    TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);
```

**Run migration on production D1:**
```bash
cd /path/to/knowledge-map
wrangler d1 execute knowledgemap \
  --file=Database/migrations/2026-04-17_tafsir_graph_schema.sql \
  --remote
```

---

## Phase 7 — Create the Qdrant Collection

Run this **once** to set up the collection before ingesting:

**`kmaps-ai-pipeline/setup_qdrant.py`**

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(url="http://localhost:6333")

# qwen3-embedding produces 1024-dim vectors
VECTOR_SIZE = 1024

collections = [
    "quran_tafsir_ibn_ashur",
    "quran_tafsir_ibn_kathir",
    "arabic_lexicon_lane",
    "arabic_lexicon_lisan",
]

for name in collections:
    if not client.collection_exists(name):
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"✅ Created collection: {name}")
    else:
        print(f"⏭  Already exists: {name}")

print("\nAll collections ready.")
```

```bash
cd kmaps-ai-pipeline
source venv/bin/activate
python setup_qdrant.py
```

---

## Phase 8 — Ingest Pipeline

**`kmaps-ai-pipeline/ingest_from_file.py`**

```python
"""
K-Maps Tafsir Ingest Pipeline
Usage: python ingest_from_file.py --file chunks/ibn_ashur_12_3.json
"""

import json
import argparse
import uuid
import requests
from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# ── Config ─────────────────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/embed"
EMBED_MODEL  = "qwen3-embedding"
QDRANT_URL   = "http://localhost:6333"

# ── Embedding ───────────────────────────────────────────────────────────────
def embed_text(text: str) -> list[float]:
    """Call Ollama to embed text. Returns float list."""
    r = requests.post(
        OLLAMA_URL,
        json={"model": EMBED_MODEL, "input": text},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["embeddings"][0]

# ── Main ────────────────────────────────────────────────────────────────────
def ingest(file_path: str, dry_run: bool = False):
    data = json.loads(Path(file_path).read_text(encoding="utf-8"))

    collection = data["collection_name"]
    records    = data["records"]

    qdrant = QdrantClient(url=QDRANT_URL)

    print(f"📦 Ingesting {len(records)} chunks → collection: {collection}")
    print(f"   Embedding model: {data.get('embedding_model', EMBED_MODEL)}\n")

    points = []
    for i, record in enumerate(records):
        chunk_id        = record["id"]
        embedding_input = record["embedding_input"]
        payload         = record["payload"]

        print(f"  [{i+1}/{len(records)}] Embedding: {chunk_id}")

        if not dry_run:
            vector = embed_text(embedding_input)
        else:
            vector = [0.0] * 1024  # dummy for dry run

        # Use a deterministic UUID from the chunk_id string
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))

        # Store point_id back in payload for cross-referencing
        payload["qdrant_point_id"] = point_id
        payload["chunk_id"]        = chunk_id

        points.append(PointStruct(
            id      = point_id,
            vector  = vector,
            payload = payload,
        ))

    if not dry_run:
        # Upsert in batches of 50
        batch_size = 50
        for start in range(0, len(points), batch_size):
            batch = points[start:start + batch_size]
            qdrant.upsert(collection_name=collection, points=batch)
            print(f"  ✅ Upserted batch {start//batch_size + 1} ({len(batch)} points)")
    else:
        print("\n[DRY RUN] No data written.")

    print(f"\n🎉 Done! {len(points)} chunks embedded and stored in Qdrant.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest tafsir chunks into Qdrant")
    parser.add_argument("--file",    required=True, help="Path to JSON chunk file")
    parser.add_argument("--dry-run", action="store_true", help="Test without writing")
    args = parser.parse_args()

    ingest(args.file, dry_run=args.dry_run)
```

**Run it:**
```bash
python ingest_from_file.py --file chunks/ibn_ashur_12_3.json
# or test first:
python ingest_from_file.py --file chunks/ibn_ashur_12_3.json --dry-run
```

---

## Phase 9 — FastAPI Tool Server

**`kmaps-ai-pipeline/app.py`**

```python
"""
K-Maps FastAPI Tool Server
Exposes D1 (local SQLite) + Qdrant data to Claude via HTTP.

Run: uvicorn app:app --reload --port 8000
"""

import sqlite3
from pathlib import Path
from contextlib import contextmanager
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="K-Maps Tool Server", version="1.0")

QDRANT_URL  = os.getenv("QDRANT_URL",  "http://localhost:6333")
OLLAMA_URL  = os.getenv("OLLAMA_URL",  "http://localhost:11434")
D1_DB_PATH  = os.getenv("D1_DB_PATH",  "knowledgemap.db")
EMBED_MODEL = os.getenv("EMBED_MODEL", "qwen3-embedding")

qdrant = QdrantClient(url=QDRANT_URL)

# ── D1 / SQLite helper ───────────────────────────────────────────────────────
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

# ── Models ───────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    collection: str = "quran_tafsir_ibn_ashur"
    limit: int = 5
    score_threshold: float = 0.6

class SaveGraphRequest(BaseModel):
    chunk_id: str
    graph: dict  # full extraction result from Claude

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "db": D1_DB_PATH}

# --- Quran -------------------------------------------------------------------

@app.get("/ayah/{surah}/{ayah}")
def get_ayah(surah: int, ayah: int):
    """Fetch Quran ayah text + translation from D1."""
    with get_db() as db:
        row = db.execute(
            """SELECT surah, ayah,
                      text_uthmani_clean, text_uthmani, text_bare,
                      translation, verse_mark, page_number
               FROM ar_quran_ayah
               WHERE surah=? AND ayah=?""",
            (surah, ayah),
        ).fetchone()
    if not row:
        raise HTTPException(404, f"Ayah {surah}:{ayah} not found")
    return dict(row)

@app.get("/ayahs/{surah}/{from_ayah}/{to_ayah}")
def get_ayah_range(surah: int, from_ayah: int, to_ayah: int):
    """Fetch a range of ayahs."""
    with get_db() as db:
        rows = db.execute(
            """SELECT surah, ayah,
                      text_uthmani_clean, text_uthmani, text_bare,
                      translation, verse_mark
               FROM ar_quran_ayah
               WHERE surah=? AND ayah BETWEEN ? AND ?
               ORDER BY ayah""",
            (surah, from_ayah, to_ayah),
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/surah/{surah_id}")
def get_surah(surah_id: int):
    """Fetch surah metadata."""
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM ar_quran_surahs WHERE id=?", (surah_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, f"Surah {surah_id} not found")
    return dict(row)

# --- Tafsir Chunks -----------------------------------------------------------

@app.get("/chunks/{ayah_ref}")
def get_chunks_for_ayah(ayah_ref: str, source: str = "ibn_ashur"):
    """Get all tafsir chunks for a given ayah ref (e.g. 12:3)."""
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
    """Fetch a specific chunk by ID."""
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM ar_tafsir_chunks WHERE chunk_id=?", (chunk_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, f"Chunk {chunk_id} not found")
    return dict(row)

# --- Semantic Search ---------------------------------------------------------

@app.post("/search_tafsir")
def search_tafsir(req: SearchRequest):
    """Embed query and search Qdrant for semantically similar tafsir chunks."""
    vector = embed_query(req.query)
    results = qdrant.search(
        collection_name=req.collection,
        query_vector=vector,
        limit=req.limit,
        score_threshold=req.score_threshold,
        with_payload=True,
    )
    return [
        {
            "score":    r.score,
            "chunk_id": r.payload.get("chunk_id"),
            "title_en": r.payload.get("title_en"),
            "title_ar": r.payload.get("title_ar"),
            "chunk_kind": r.payload.get("chunk_kind"),
            "ayah_ref": r.payload.get("ayah_ref"),
            "text":     r.payload.get("text"),
        }
        for r in results
    ]

# --- Graph Objects -----------------------------------------------------------

@app.get("/concepts/{ayah_ref}")
def get_concepts(ayah_ref: str):
    """Get extracted concepts for an ayah."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM km_tafsir_concepts WHERE ayah_ref=?", (ayah_ref,)
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/themes/{surah_no}")
def get_themes(surah_no: int):
    """Get all themes for a surah."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM km_tafsir_themes WHERE surah_no=?", (surah_no,)
        ).fetchall()
    return [dict(r) for r in rows]

# --- Arabic ------------------------------------------------------------------

@app.get("/vocab/{root}")
def search_vocab_by_root(root: str):
    """Get vocabulary entries by Arabic root."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM ar_vocab WHERE root=?", (root,)
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/grammar/{category}")
def get_grammar_rules(category: str):
    """Get grammar rules by category."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM ar_grammar_rule WHERE category=? ORDER BY sort_order",
            (category,),
        ).fetchall()
    return [dict(r) for r in rows]

# --- Save Graph (from Claude extraction) ------------------------------------

@app.post("/save_graph")
def save_graph(req: SaveGraphRequest):
    """Persist Claude-extracted graph objects to D1."""
    g = req.graph
    saved = {"concepts": 0, "claims": 0, "edges": 0, "themes": 0, "motifs": 0}

    with get_db() as db:
        # Concepts
        for c in g.get("tafsir_layer", {}).get("concepts", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_concepts
                   (concept_id, label, label_ar, concept_type, description, ayah_ref)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (c["id"], c["label"], c.get("label_ar"), c["concept_type"],
                 c.get("description"), c.get("ayah_ref")),
            )
            saved["concepts"] += 1

        # Claims
        for cl in g.get("tafsir_layer", {}).get("claims", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_claims
                   (claim_id, chunk_id, text, text_ar, claim_type, polarity)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (cl["id"], req.chunk_id, cl["text"], cl.get("text_ar"),
                 cl["claim_type"], cl.get("polarity", "positive")),
            )
            saved["claims"] += 1

        # Edges
        for e in g.get("graph_layer", {}).get("edges", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_edges
                   (edge_id, from_id, from_type, to_id, to_type, edge_type, weight, chunk_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (e["id"], e["from"], e.get("from_type", "concept"),
                 e["to"],  e.get("to_type",   "concept"),
                 e["edge_type"], e.get("weight", 1.0), req.chunk_id),
            )
            saved["edges"] += 1

        # Themes
        for t in g.get("pattern_layer", {}).get("themes", []):
            db.execute(
                """INSERT OR IGNORE INTO km_tafsir_themes
                   (theme_id, label, label_ar, theme_scope, ayah_ref)
                   VALUES (?, ?, ?, ?, ?)""",
                (t["id"], t["label"], t.get("label_ar"),
                 t.get("theme_scope", "ayah"), t.get("ayah_ref")),
            )
            saved["themes"] += 1

        # Mark chunk as graph-extracted
        db.execute(
            "UPDATE ar_tafsir_chunks SET is_graph_extracted=1 WHERE chunk_id=?",
            (req.chunk_id,),
        )
        db.commit()

    return {"status": "saved", "chunk_id": req.chunk_id, **saved}
```

**Run the server:**
```bash
cd kmaps-ai-pipeline
source venv/bin/activate
uvicorn app:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## Phase 10 — Claude Graph Extraction Worker

**`kmaps-ai-pipeline/extract_graph.py`**

```python
"""
K-Maps Claude Graph Extraction Worker
Reads un-extracted chunks from D1, calls Claude, saves graph objects.

Usage: python extract_graph.py --ayah 12:3 --source ibn_ashur
"""

import json
import argparse
import sqlite3
import httpx
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv
import os

load_dotenv()

client     = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
D1_DB_PATH = os.getenv("D1_DB_PATH", "knowledgemap.db")
TOOL_SERVER = "http://localhost:8000"

# Model choice — change to claude-sonnet-4-6 for higher quality
EXTRACT_MODEL = "claude-haiku-4-5"

# ── Extraction Prompt ────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert in Quranic Arabic, classical Islamic scholarship, and knowledge graph construction.

You extract structured knowledge from tafsir (Quranic exegesis) chunks.
Your output MUST be valid JSON matching the schema provided.
Be precise, scholarly, and comprehensive. Do not invent content not present in the source text."""

def build_extraction_prompt(chunk: dict, ayah_text: str) -> str:
    return f"""Extract a unified knowledge graph from this tafsir chunk.

== AYAH ==
{ayah_text}

== CHUNK ==
Source: {chunk['source_name']} | {chunk.get('title_en', '')}
Kind: {chunk['chunk_kind']}
Arabic Title: {chunk.get('title_ar', '')}
Text: {chunk['text']}

== OUTPUT JSON SCHEMA ==
Return ONLY this JSON structure, no markdown, no explanation:

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

# ── Main extraction loop ─────────────────────────────────────────────────────
def extract_for_ayah(ayah_ref: str, source: str = "ibn_ashur"):
    db = sqlite3.connect(D1_DB_PATH)
    db.row_factory = sqlite3.Row

    # Get the ayah text
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
        print(f"No unextracted chunks found for {ayah_ref} / {source}")
        return

    print(f"📖 Extracting graph from {len(chunks)} chunks for {ayah_ref}\n")

    for chunk in chunks:
        chunk = dict(chunk)
        print(f"  → Processing chunk {chunk['chunk_index']}: {chunk.get('title_en', chunk['chunk_kind'])}")

        prompt = build_extraction_prompt(chunk, ayah_text)

        response = client.messages.create(
            model=EXTRACT_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()

        # Parse JSON
        try:
            graph = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                graph = json.loads(match.group())
            else:
                print(f"  ⚠️  Failed to parse JSON for chunk {chunk['chunk_id']}")
                print(f"     Raw: {raw[:200]}")
                continue

        # Save via tool server
        resp = httpx.post(
            f"{TOOL_SERVER}/save_graph",
            json={"chunk_id": chunk["chunk_id"], "graph": graph},
            timeout=30,
        )
        result = resp.json()
        print(f"     Saved: {result}")

        # Log token usage
        usage = response.usage
        print(f"     Tokens: {usage.input_tokens} in / {usage.output_tokens} out")

    db.close()
    print(f"\n✅ Extraction complete for {ayah_ref}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ayah",   required=True, help="e.g. 12:3")
    parser.add_argument("--source", default="ibn_ashur")
    args = parser.parse_args()
    extract_for_ayah(args.ayah, args.source)
```

**Run extraction:**
```bash
# Make sure FastAPI server is running first
uvicorn app:app --port 8000 &

# Then extract
python extract_graph.py --ayah 12:3 --source ibn_ashur
```

---

## Phase 11 — Search Script

**`kmaps-ai-pipeline/search_query.py`**

```python
"""
Quick semantic search against Qdrant.
Usage: python search_query.py "what does ibn ashur say about sabr in yusuf"
"""

import sys
import requests
import json

TOOL_SERVER = "http://localhost:8000"

def search(query: str, collection: str = "quran_tafsir_ibn_ashur", limit: int = 5):
    r = requests.post(
        f"{TOOL_SERVER}/search_tafsir",
        json={"query": query, "collection": collection, "limit": limit},
    )
    results = r.json()

    print(f"\n🔍 Query: {query}")
    print(f"   Collection: {collection}\n")

    for i, res in enumerate(results):
        print(f"  [{i+1}] score={res['score']:.3f} | {res['ayah_ref']} | {res['chunk_kind']}")
        print(f"       {res.get('title_en', '')}")
        print(f"       {res.get('text', '')[:200]}...")
        print()

if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "divine wisdom in the story of Yusuf"
    search(query)
```

---

## Phase 12 — Folder Structure

Your final project should look like this:

```
kmaps-ai-pipeline/
├── venv/                      ← Python virtualenv
├── .env                       ← API keys + paths
├── requirements.txt
├── setup_qdrant.py            ← run once to create collections
├── app.py                     ← FastAPI tool server
├── ingest_from_file.py        ← chunk → embed → Qdrant
├── extract_graph.py           ← Claude knowledge graph extractor
├── search_query.py            ← quick search CLI
└── chunks/
    ├── ibn_ashur_12_3.json    ← your tafsir chunk files
    └── ibn_ashur_12_4.json
```

---

## Daily Workflow

```bash
# 1. Start services (each session)
docker start qdrant              # vector DB
ollama serve &                   # embedding model

# 2. Activate Python env
cd kmaps-ai-pipeline
source venv/bin/activate

# 3. Start tool server
uvicorn app:app --port 8000 &

# 4. Ingest new chunks
python ingest_from_file.py --file chunks/ibn_ashur_12_4.json

# 5. Extract graph with Claude
python extract_graph.py --ayah 12:4 --source ibn_ashur

# 6. Search
python search_query.py "light metaphor in Quran"
```

---

## Cost Breakdown (Claude API)

| Task | Model | Tokens | Cost |
|---|---|---|---|
| 1 chunk extraction | haiku-4-5 | ~2,000 in / 1,000 out | ~$0.0008 |
| Full ayah (10 chunks) | haiku-4-5 | ~20,000 in / 10,000 out | ~$0.008 |
| Full surah Yusuf (112 ayahs) | haiku-4-5 | ~2.2M in / 1.1M out | ~$0.83 |
| Quality review (1 ayah) | sonnet-4-6 | ~20,000 in / 10,000 out | ~$0.09 |
| Deep analysis session | sonnet-4-6 | ~100,000 in | ~$0.30 |

**Embedding: $0 (Ollama local)**  
**Qdrant: $0 (Docker local)**  
**Estimated full Ibn Ashur pipeline (Surah Yusuf): ~$1–3**

---

## Troubleshooting

```bash
# Ollama not responding?
pkill ollama && ollama serve &

# Qdrant down?
docker restart qdrant
curl http://localhost:6333/health

# FastAPI crashed?
lsof -i :8000 | grep LISTEN
kill -9 PID
uvicorn app:app --port 8000

# Check Claude API key
python -c "import anthropic, os; print(anthropic.Anthropic().models.list())"

# Export D1 to local SQLite (refresh local copy)
wrangler d1 export knowledgemap --output=knowledgemap.db
```

---

## Optional: MCP for Notion + Obsidian + Google Drive

If you want Claude to directly access these via natural language in Cowork mode:

```bash
# Notion MCP — already connected in your Cowork session
# (you can see it in the deferred tools list)

# Obsidian — install obsidian-mcp plugin
# https://github.com/QuantumPixelator/obsidian-mcp-plugin
# Then point your Cowork plugin at it

# Google Drive — use the official Google Drive MCP
# Available in the Cowork plugin marketplace
```

For local Python access to Obsidian vault:
```python
# Obsidian vault is just markdown files
VAULT_PATH = "/Users/abdulhasibahmedjadoon/path/to/vault"
from pathlib import Path
notes = list(Path(VAULT_PATH).rglob("*.md"))
```

---

*Setup complete. Your K-Maps AI pipeline is fully local, cost-effective, and ready for production tafsir ingestion.*
