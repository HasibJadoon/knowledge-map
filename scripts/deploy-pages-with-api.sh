#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <directory> <project-name> [branch]" >&2
  exit 1
fi

directory="$1"
project_name="$2"
branch="${3:-main}"

npx wrangler pages deploy "$directory" --project-name "$project_name" --branch "$branch"
