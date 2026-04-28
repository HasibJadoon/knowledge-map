#!/usr/bin/env bash
# Wait for ALL 4 Hawramani books to finish scraping, then:
#   1. Run merge_lexicons.py  (adds all lexicon chunks to all_chunks.jsonl)
#   2. Re-run embed_chunks.py (embeds only the new lexicon chunks)
#   3. Launch N-worker parallel LLM extraction
#
# Usage:
#   bash scripts/07_llm_extract_claims/wait_and_launch.sh [num_workers]
#
# Run from kmaps-sarf/ root.

set -e

WORKERS=${1:-5}
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CHECK_INTERVAL=180   # check every 3 minutes

# Book targets (total entries per book index page)
declare -A BOOK_TARGETS
BOOK_TARGETS[mufradat]=1608
BOOK_TARGETS[maqayis]=4814
BOOK_TARGETS[lane]=4953
BOOK_TARGETS[lisan]=9245
TOTAL_TARGET=20620

echo "=== wait_and_launch.sh ==="
echo "Waiting for ALL 4 Hawramani books to complete ($TOTAL_TARGET total entries)..."
echo "  mufradat: 1,608 | maqayis: 4,814 | lane: 4,953 | lisan: 9,245"
echo "Checking every ${CHECK_INTERVAL}s. Ctrl-C to abort."
echo ""

while true; do
    total_done=0
    summary=""
    all_done=true

    for book in mufradat maqayis lane lisan; do
        target=${BOOK_TARGETS[$book]}
        progress_file="$SCRIPT_DIR/data/staging/lexicon_progress/${book}.txt"
        if [ -f "$progress_file" ]; then
            done=$(grep -v "^#" "$progress_file" | wc -l | tr -d ' ')
        else
            done=0
        fi
        total_done=$((total_done + done))
        summary="$summary ${book}:${done}/${target}"
        if [ "$done" -lt "$target" ]; then
            all_done=false
        fi
    done

    pct=$(python3 -c "print(f'{$total_done/$TOTAL_TARGET*100:.1f}%')" 2>/dev/null || echo "?%")
    echo "  [$(date '+%H:%M')] $total_done/$TOTAL_TARGET ($pct) |$summary"

    if $all_done; then
        echo ""
        echo "All 4 books complete! Proceeding..."
        break
    fi

    sleep $CHECK_INTERVAL
done

echo ""
echo "=== Step 1: Merge remaining lexicon chunks ==="
python3 "$SCRIPT_DIR/scripts/03_chunk_sources/merge_lexicons.py"

echo ""
echo "=== Step 2: Clean all chunks (strip boilerplate, page markers) ==="
python3 "$SCRIPT_DIR/scripts/03_chunk_sources/clean_chunks.py"

echo ""
echo "=== Step 3: Rebuild Qdrant with clean contextual embeddings ==="
python3 "$SCRIPT_DIR/scripts/05_embed_qdrant/embed_chunks.py" --rebuild --batch 32

echo ""
echo "=== Step 4: Launch $WORKERS LLM extraction workers (scope=ALL) ==="
bash "$SCRIPT_DIR/scripts/07_llm_extract_claims/run_parallel.sh" "$WORKERS" "ALL"

echo ""
echo "=== wait_and_launch.sh done. $WORKERS workers running in background. ==="
echo ""
echo "Monitor progress:"
echo "  watch -n 15 'wc -l $SCRIPT_DIR/data/staging/claims/done-w*.txt 2>/dev/null'"
echo ""
echo "Stop all workers:"
echo "  kill \$(cat /tmp/sarf-pids.txt)"
