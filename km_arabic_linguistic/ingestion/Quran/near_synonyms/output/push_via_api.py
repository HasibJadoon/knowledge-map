#!/usr/bin/env python3
"""
Push near-synonym data to km_arabic_linguistic D1 via Cloudflare HTTP API.

Reads your API token from:
  1. Environment variable CF_API_TOKEN
  2. ~/.wrangler/config/default.toml  (auto-populated by 'wrangler login')

Usage:
    python3 push_via_api.py
    # or if token not cached:
    CF_API_TOKEN=<your-token> python3 push_via_api.py

Get a token at: https://dash.cloudflare.com/profile/api-tokens
  → Create Token → Edit Cloudflare Workers (or D1 Edit permission)
"""
from __future__ import annotations
import hashlib, json, os, re, sys, time
from pathlib import Path
from typing import Any
try:
    import urllib.request, urllib.error
except ImportError:
    pass

ACCOUNT_ID  = "722a276f61c1955a2fc6a75b6437d74c"
DATABASE_ID = "192f4792-deb3-4f2e-9204-532cf484ecd2"
BASE        = Path(__file__).parent
SQL_BATCHES = BASE / "sql_batches"

# ── Auth ─────────────────────────────────────────────────────────────────────

def find_token() -> str:
    tok = os.getenv("CF_API_TOKEN", "").strip()
    if tok:
        return tok
    toml = Path.home() / ".wrangler" / "config" / "default.toml"
    if toml.exists():
        m = re.search(r'oauth_token\s*=\s*"([^"]+)"', toml.read_text())
        if m:
            return m.group(1)
    print(
        "ERROR: No API token found.\n"
        "  Option 1: run  wrangler login  (sets up ~/.wrangler/config)\n"
        "  Option 2: set  CF_API_TOKEN=<token>  before running this script\n"
        "  Get a token at https://dash.cloudflare.com/profile/api-tokens\n"
        "    → Create Token → Edit Cloudflare Workers template"
    )
    sys.exit(1)

# ── D1 HTTP API ───────────────────────────────────────────────────────────────

def d1_query(token: str, sql: str, retries: int = 3) -> dict:
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}"
        f"/d1/database/{DATABASE_ID}/query"
    )
    payload = json.dumps({"sql": sql}).encode()
    req = urllib.request.Request(
        url, data=payload, method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            if attempt < retries and e.code in (429, 502, 503, 504):
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"HTTP {e.code}: {body[:400]}")
        except Exception as exc:
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Request failed: {exc}")
    raise RuntimeError("Exhausted retries")

# ── Push logic ────────────────────────────────────────────────────────────────

def push_batch(token: str, path: Path) -> bool:
    sql = path.read_text(encoding="utf-8").strip()
    if not sql:
        return True
    try:
        result = d1_query(token, sql)
        if not result.get("success"):
            errs = result.get("errors", [])
            print(f"    ERRORS: {errs}")
            return False
        return True
    except Exception as exc:
        print(f"    EXCEPTION: {exc}")
        return False

def main() -> None:
    token = find_token()
    batches = sorted(SQL_BATCHES.glob("batch_*.sql"))
    total = len(batches)
    if total == 0:
        print(f"No batch files in {SQL_BATCHES}")
        sys.exit(1)

    print(f"=== Near-synonym D1 push via HTTP API ===")
    print(f"Account: {ACCOUNT_ID}")
    print(f"DB:      {DATABASE_ID}")
    print(f"Batches: {total}")
    print()

    failed = 0
    for idx, path in enumerate(batches, 1):
        kb = path.stat().st_size // 1024
        print(f"[{idx:03d}/{total}] {path.name} ({kb}KB) ... ", end="", flush=True)
        if push_batch(token, path):
            print("OK")
        else:
            print("FAILED")
            failed += 1

    print(f"\n=== Done: {total} batches, {failed} failed ===")
    if failed == 0:
        print("✓ All near-synonym data pushed successfully.")
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()
