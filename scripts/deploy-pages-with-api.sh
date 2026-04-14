#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <directory> <project-name> [branch]" >&2
  exit 1
fi

directory="$1"
project_name="$2"
branch="${3:-main}"

# Build Pages Functions into _worker.js alongside static assets
echo "Building Pages Functions..."
npx wrangler pages functions build functions \
  --outdir dist-worker \
  --compatibility-date 2025-01-01 \
  --minify

cp dist-worker/index.js "$directory/_worker.js"
rm -rf dist-worker
echo "Worker bundled → $directory/_worker.js"

npx wrangler pages deploy "$directory" \
  --project-name "$project_name" \
  --branch "$branch" \
  --commit-dirty=true
