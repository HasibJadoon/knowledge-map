#!/usr/bin/env bash
# Master orchestration: build all 3 layers (sarf/irab/balagha) end-to-end.
#
# Phases:
#   A. Wait for scrapers (Tibyan, Hawramani lexicons) to finish
#   B. Re-chunk (incremental, idempotent)
#   C. Embed each layer's Qdrant collection
#   D. Run LLM extraction on all 3 layers in parallel (5 workers each)
#   E. Generate D1 deployment SQL
#
# Run this from kmaps-sarf or any layer dir; uses absolute paths internally.

set -e

ING_BASE="/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/km_arabic_linguistic/ingestion"
SARF_DIR="$ING_BASE/_pipeline/sarf/kmaps-sarf"
IRAB_DIR="$ING_BASE/_pipeline/irab/kmaps-irab"
BAL_DIR="$ING_BASE/_pipeline/balagha/kmaps-balagha"
SHARED="$ING_BASE/_shared"

WORKERS=${1:-5}
log() { echo "[$(date '+%H:%M:%S')] $*"; }


# ── Phase A: wait for scrapers ────────────────────────────────────────────────
wait_scraper() {
    local name="$1"; local pidfile="$2"
    while [ -f "$pidfile" ]; do
        pid=$(cat "$pidfile" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            sleep 60
        else
            break
        fi
    done
    log "$name done"
}

log "Phase A: waiting for scrapers"
# Look for active python scrape processes
while ps -ef | grep -E "scrape_(tibyan|hawramani|shamela)_wayback|scrape_hawramani" | grep -v grep > /dev/null; do
    log "  scrapers still running..."
    sleep 120
done
log "All scrapers idle"


# ── Phase B: re-chunk (idempotent) ────────────────────────────────────────────
log "Phase B: chunking"

log "  Tibyan…"
cd "$IRAB_DIR" && python3 scripts/03_chunk_sources/chunk_tibyan.py >> data/staging/chunk.log 2>&1 || true
log "  Itqan…"
python3 scripts/03_chunk_sources/chunk_itqan.py >> data/staging/chunk.log 2>&1 || true
log "  Archive.org balagha…"
python3 scripts/03_chunk_sources/chunk_archive_org.py >> data/staging/chunk.log 2>&1 || true

log "  Sarf re-clean (picks up lexicons)…"
cd "$SARF_DIR"
python3 scripts/03_chunk_sources/clean_chunks.py >> data/staging/chunk.log 2>&1 || true
python3 scripts/03_chunk_sources/merge_lexicons.py >> data/staging/chunk.log 2>&1 || true

log "  Balagha filter (refresh)…"
cd "$BAL_DIR"
python3 scripts/03_chunk_sources/filter_balagha_chunks.py >> data/staging/chunk.log 2>&1 || true


# ── Phase C: embed each layer ─────────────────────────────────────────────────
log "Phase C: embedding all 3 collections"

# Sarf — append new (lexicon) chunks only
log "  sarf (incremental)…"
python3 "$SHARED/embed_layer.py" \
    --input "$SARF_DIR/data/staging/chunks/all_chunks_clean.jsonl" \
    --collection kmaps_sarf_source_chunks \
    --batch 32 \
    >> "$SARF_DIR/data/staging/embed.log" 2>&1

# Irab — Tibyan + Itqan
log "  irab (rebuild)…"
cat "$IRAB_DIR/data/staging/chunks/tibyan_chunks.jsonl" \
    "$IRAB_DIR/data/staging/chunks/itqan_chunks.jsonl" \
    > "$IRAB_DIR/data/staging/chunks/irab_all_chunks.jsonl"
python3 "$SHARED/embed_layer.py" \
    --input "$IRAB_DIR/data/staging/chunks/irab_all_chunks.jsonl" \
    --collection kmaps_irab_source_chunks \
    --rebuild --batch 32 \
    >> "$IRAB_DIR/data/staging/embed.log" 2>&1

# Balagha
log "  balagha (rebuild)…"
python3 "$SHARED/embed_layer.py" \
    --input "$BAL_DIR/data/staging/chunks/balagha_chunks.jsonl" \
    --collection kmaps_balagha_source_chunks \
    --rebuild --batch 32 \
    >> "$BAL_DIR/data/staging/embed.log" 2>&1


# ── Phase D: parallel LLM extraction (5 workers per layer = 15 total) ─────────
log "Phase D: launching 5 workers × 3 layers = 15 parallel processes"

rm -f /tmp/sarf-pids.txt /tmp/irab-pids.txt /tmp/balagha-pids.txt

for layer in sarf irab balagha; do
    LOG_DIR=""
    case $layer in
        sarf)    LOG_DIR="$SARF_DIR/data/staging/claims/logs" ;;
        irab)    LOG_DIR="$IRAB_DIR/data/staging/claims/logs" ;;
        balagha) LOG_DIR="$BAL_DIR/data/staging/claims/logs" ;;
    esac
    mkdir -p "$LOG_DIR"
    for i in $(seq 0 $((WORKERS - 1))); do
        python3 "$SHARED/extract_layer.py" --layer $layer --scope ALL \
            --workers $WORKERS --worker-id $i \
            >> "$LOG_DIR/worker-$i.log" 2>&1 &
        pid=$!
        echo $pid >> /tmp/${layer}-pids.txt
        log "  $layer worker $i started (PID $pid)"
    done
done

log "All 15 workers running. Monitor:"
log "  watch -n 30 'wc -l $SARF_DIR/data/staging/claims/done-w*.txt $IRAB_DIR/data/staging/claims/done-w*.txt $BAL_DIR/data/staging/claims/done-w*.txt 2>/dev/null'"
log ""
log "Stop all: kill \$(cat /tmp/sarf-pids.txt /tmp/irab-pids.txt /tmp/balagha-pids.txt)"
