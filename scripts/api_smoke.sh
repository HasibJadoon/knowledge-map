#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://main.arabic-vocabulary.pages.dev}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing $1"; exit 1; }; }
require curl
require jq

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

# ---- Test 1: health ----
health="$(curl -s "$BASE_URL/health")"
echo "$health" | jq -e '.ok == true' >/dev/null || fail "health ok=true"
pass "health endpoint"

# ---- Test 2: list returns shape ----
resp="$(curl -s "$BASE_URL/lexicon_roots?limit=5&offset=0")"
echo "$resp" | jq -e '.ok == true' >/dev/null || fail "lexicon_roots ok=true"
echo "$resp" | jq -e '(.results | type) == "array"' >/dev/null || fail "results is array"
echo "$resp" | jq -e 'has("total") and has("hasMore")' >/dev/null || fail "has total & hasMore"
pass "list endpoint basic shape"

# ---- Test 3: pagination consistency ----
total="$(echo "$resp" | jq -r '.total')"
if [[ "$total" =~ ^[0-9]+$ ]]; then
  pass "total is numeric ($total)"
else
  fail "total is not numeric"
fi

# ---- Test 4: search works (root or family) ----
# Try a query that should match family buckets like "فتح" or common roots "صرف"
search="$(curl -s "$BASE_URL/lexicon_roots?q=%D9%81%D8%AA%D8%AD&limit=20&offset=0")"
echo "$search" | jq -e '.ok == true' >/dev/null || fail "search ok=true"
# allow 0 results if dataset doesn't include it, but ensure no error and results array exists
echo "$search" | jq -e '(.results | type) == "array"' >/dev/null || fail "search results array"
pass "search endpoint returns valid response"

# ---- Test 5: sort by root ascending (spot-check) ----
# We'll assert roots are non-decreasing lexicographically for the first page.
sorted="$(curl -s "$BASE_URL/lexicon_roots?limit=50&offset=0")"
echo "$sorted" | jq -e '.ok == true' >/dev/null || fail "sorted ok=true"
# extract roots
roots="$(echo "$sorted" | jq -r '.results[].root')"
# simple lexicographic check in bash
prev=""
ok=1
while IFS= read -r r; do
  if [[ -n "$prev" && "$r" < "$prev" ]]; then ok=0; break; fi
  prev="$r"
done <<< "$roots"
[[ "$ok" -eq 1 ]] && pass "sort by root (first page looks sorted)" || fail "sort not sorted (first page)"

echo ""
echo "🎉 All smoke tests passed for BASE_URL=$BASE_URL"
