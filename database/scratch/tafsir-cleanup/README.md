# qr_tafsir_entries — iʿrāb-row cleanup

## What

On 2026-05-15, 1,526 rows with `entry_type='irab'` were deleted from
`qr_tafsir_entries`. They were lossless duplicates of content already in
`qr_irab_source_chunks` (raw HTML/text by section) and `qr_irab_book_entries`
(per-word parsed entries) — created originally as flat concatenations for a
convenience-fetch use case that no current code consumes.

## Scholars affected
- `QR:SCH:DARWISH` — 1,387 rows (Muḥyī al-Dīn Darwīsh's iʿrāb)
- `QR:SCH:SAFI` — 139 rows (Maḥmūd Ṣāfī's Al-Jadwal)

## Counts
- Before DELETE: 25,665 rows (24,139 explanation + 1,526 irab)
- After DELETE: 24,139 rows (explanation only)

## Backup
- File: `qr_tafsir_entries-irab-backup-20260515T101801Z.json`
- Size: ~12.5 MB
- Format: wrangler D1 `--json` output (`[{results: [...], success: true, meta: {...}}]`)
- Contents: full row data for all 1,526 deleted rows including `id`, `content_ar`,
  scholar/work refs, timestamps

## Why deletion was safe
- All content also exists in `qr_irab_source_chunks` at finer granularity (per
  section_kind: `language` / `irab` / `sarf` / `balagha` / `fawaid`).
- The new iʿrāb display layer (`qr_iraab_book_display_*`, migration 011) already
  projects from those chunks.
- The tafsir display layer (`qr_tafsir_book_display_*`, migration 012) is now
  free of iʿrāb sources — clean separation between the two corpora.
- No worker routes or UI code filtered by `entry_type='irab'` (verified by grep).

## Reversal procedure (if ever needed)
```js
// node script reading the backup and re-inserting via wrangler
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const rows = JSON.parse(readFileSync('./qr_tafsir_entries-irab-backup-20260515T101801Z.json'))[0].results;
// chunk into batches of 50 INSERT OR IGNORE statements ...
```

Don't reverse unless you have a concrete reason — the cleanup was deliberate
per the disjoint-corpora architecture rule.
