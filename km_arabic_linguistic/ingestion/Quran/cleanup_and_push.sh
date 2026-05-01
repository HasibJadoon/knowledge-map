#!/usr/bin/env bash
# cleanup_and_push.sh
# Run from anywhere — deletes _pipeline and pushes everything to git remote.

set -e

INGESTION="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$INGESTION/../.." && pwd)"   # adjust if repo root differs

echo "=== Repo root: $REPO ==="
echo "=== Ingestion: $INGESTION ==="
echo ""

# 1. Delete _pipeline
echo "[1/3] Deleting _pipeline..."
rm -rf "$INGESTION/_pipeline"
echo "      Done."

# 2. Stage everything
echo ""
echo "[2/3] Staging all changes..."
cd "$REPO"
git add -A
git status --short | head -30
echo ""

# 3. Commit and push
echo "[3/3] Committing and pushing..."
git commit -m "refactor: remove _pipeline, archive raw sources by surah/ruku

- Deleted _pipeline/{sarf,irab,balagha} working dirs (data/chunks/qdrant)
- Created archive/ with docs, resources, and raw data split by surah/ruku:
    archive/raw/sarf/S{NNN}/   — tafsir chunks per ruku
    archive/raw/irab/S{NNN}/   — Tibyan irab chunks per ruku
    archive/raw/irab/itqan/    — al-Itqan by nawc chapter
    archive/raw/irab/archive_org/ — Asrar/Dalail/Ijaz/Miftah per book
    archive/raw/balagha/S{NNN}/ — balagha chunks per ruku
- Migrated 527 existing sarf claims into S{NNN}/claims/R{rr}/sarf/
- spine.sqlite moved to ingestion/spine.sqlite (shared across layers)
- All SPINE_DB references updated in _shared/ and S012/scripts/
- Added scrapers preserved in _shared/scrapers/{irab,balagha}/
- Scripts: build_archive.py, structure_archive_sources.py, migrate_existing_claims.py"

git push
echo ""
echo "=== All done ==="
