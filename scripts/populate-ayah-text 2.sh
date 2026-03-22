#!/usr/bin/env bash
# ============================================================
# scripts/populate-ayah-text.sh
#
# Drives POST /api/admin/populate-ayah-text in a loop until
# all 6,236 ar_quran_ayah rows have text_uthmani_clean and
# text_bare populated.
#
# Usage:
#   chmod +x scripts/populate-ayah-text.sh
#
#   # Production
#   ADMIN_SECRET=<your-secret> ./scripts/populate-ayah-text.sh
#
#   # Staging / localhost
#   BASE_URL=http://localhost:8788 ADMIN_SECRET=dev ./scripts/populate-ayah-text.sh
#
#   # Dry run (compute only, no writes)
#   DRY_RUN=1 ADMIN_SECRET=<secret> ./scripts/populate-ayah-text.sh
#
# Env vars:
#   BASE_URL      default: https://k-maps.com
#   ADMIN_SECRET  required
#   BATCH         rows per request, default 200
#   DRY_RUN       set to 1 to skip writes
# ============================================================

set -euo pipefail

BASE_URL="${BASE_URL:-https://k-maps.com}"
ADMIN_SECRET="${ADMIN_SECRET:?ADMIN_SECRET env var is required}"
BATCH="${BATCH:-200}"
DRY_RUN="${DRY_RUN:-0}"
ENDPOINT="${BASE_URL}/api/admin/populate-ayah-text"

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: brew install jq"
  exit 1
fi

DRY_FLAG=""
[[ "$DRY_RUN" == "1" ]] && DRY_FLAG="&dry_run=1"

echo "======================================================"
echo " populate-ayah-text"
echo " Endpoint : $ENDPOINT"
echo " Batch    : $BATCH rows/call"
echo " Dry run  : $DRY_RUN"
echo "======================================================"

PASS=0
TOTAL_PROCESSED=0
OFFSET=0

while true; do
  PASS=$((PASS + 1))

  RESPONSE=$(curl -s -X POST \
    "${ENDPOINT}?batch=${BATCH}&offset=${OFFSET}${DRY_FLAG}" \
    -H "X-Admin-Secret: ${ADMIN_SECRET}" \
    -H "Content-Type: application/json")

  # Check for HTTP / network error
  if [[ -z "$RESPONSE" ]]; then
    echo "[pass $PASS] ERROR: empty response from server"
    exit 1
  fi

  # Parse fields
  PROCESSED=$(echo "$RESPONSE" | jq -r '.processed // 0')
  SKIPPED=$(echo "$RESPONSE"   | jq -r '.skipped   // 0')
  REMAINING=$(echo "$RESPONSE" | jq -r '.total_remaining // "?"')
  ELAPSED=$(echo "$RESPONSE"   | jq -r '.elapsed_ms // "?"')
  DONE=$(echo "$RESPONSE"      | jq -r '.done // false')
  NEXT_OFFSET=$(echo "$RESPONSE" | jq -r '.next_offset // "null"')

  # Check for error response
  if echo "$RESPONSE" | jq -e '.error' &>/dev/null; then
    ERR=$(echo "$RESPONSE" | jq -r '.error')
    echo "[pass $PASS] ERROR: $ERR"
    echo "Full response: $RESPONSE"
    exit 1
  fi

  TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))

  printf "[pass %3d] processed=%s  skipped=%s  remaining=%s  offset=%s  elapsed=%sms\n" \
    "$PASS" "$PROCESSED" "$SKIPPED" "$REMAINING" "$OFFSET" "$ELAPSED"

  if [[ "$DONE" == "true" ]]; then
    echo "------------------------------------------------------"
    echo " ✅ Done! Total rows updated: $TOTAL_PROCESSED"
    echo "------------------------------------------------------"
    break
  fi

  if [[ "$NEXT_OFFSET" == "null" || -z "$NEXT_OFFSET" ]]; then
    echo "Unexpected: done=false but next_offset is null. Stopping."
    echo "Full response: $RESPONSE"
    exit 1
  fi

  OFFSET="$NEXT_OFFSET"

  # Small pause to avoid hammering the Worker
  sleep 0.3
done
