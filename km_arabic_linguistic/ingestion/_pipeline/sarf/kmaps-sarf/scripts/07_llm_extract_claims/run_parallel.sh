#!/usr/bin/env bash
# Run extract_claims.py in parallel batches.
#
# Usage:
#   bash scripts/07_llm_extract_claims/run_parallel.sh [num_workers] [scope]
#
# Examples:
#   bash scripts/07_llm_extract_claims/run_parallel.sh 5        # 5 workers, ALL
#   bash scripts/07_llm_extract_claims/run_parallel.sh 4 ALL    # explicit
#
# Each worker writes to:
#   data/staging/claims/done-w{N}.txt          (progress, resumable)
#   data/staging/claims/sql/sarf-claims-w{N}-*.sql  (SQL output)
#
# Stop all workers: kill $(cat /tmp/sarf-pids.txt)
# Check progress:   wc -l data/staging/claims/done-w*.txt

set -e

WORKERS=${1:-5}
SCOPE=${2:-ALL}
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/data/staging/claims/logs"
mkdir -p "$LOG_DIR"

echo "Starting $WORKERS workers (scope=$SCOPE) ..."
echo "Logs: $LOG_DIR/worker-{N}.log"
echo "PIDs: /tmp/sarf-pids.txt"
echo ""

rm -f /tmp/sarf-pids.txt

for i in $(seq 0 $((WORKERS - 1))); do
    LOG="$LOG_DIR/worker-${i}.log"
    python3 "$SCRIPT_DIR/scripts/07_llm_extract_claims/extract_claims.py" \
        --scope "$SCOPE" \
        --workers "$WORKERS" \
        --worker-id "$i" \
        >> "$LOG" 2>&1 &
    PID=$!
    echo "$PID" >> /tmp/sarf-pids.txt
    echo "  Worker $i started (PID $PID) → $LOG"
done

echo ""
echo "All $WORKERS workers running."
echo ""
echo "Monitor progress:"
echo "  watch -n 10 'wc -l data/staging/claims/done-w*.txt 2>/dev/null | tail -1'"
echo ""
echo "Stop all:"
echo "  kill \$(cat /tmp/sarf-pids.txt)"
