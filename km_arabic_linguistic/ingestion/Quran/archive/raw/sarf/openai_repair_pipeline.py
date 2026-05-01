#!/usr/bin/env python3
"""
OpenAI Batch API pipeline — repair corrupted Arabic text in D1.

Stages (run individually or chain with --stage=all):
  fetch    Pull all AREX:VI:* records from D1 via wrangler
  prepare  Build OpenAI Batch API JSONL
  submit   Upload JSONL + create batch job
  poll     Wait for completion and download results
  process  Parse results → generate UPDATE SQL batches
  push     Apply UPDATE SQL to D1 via wrangler

Usage:
  export OPENAI_API_KEY=sk-...
  cd /Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map
  python3 km_arabic_linguistic/ingestion/archive/raw/sarf/openai_repair_pipeline.py

  # Or individual stages:
  python3 ... --stage=fetch
  python3 ... --stage=prepare
  python3 ... --stage=submit
  python3 ... --stage=poll        # blocks until done
  python3 ... --stage=process
  python3 ... --stage=push
  python3 ... --resume            # same as --stage=poll (resume after submit)
"""

from __future__ import annotations
import json, os, re, shutil, subprocess, sys, time
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
DB_NAME    = "km_arabic_linguistic"
MODEL      = "gpt-4o-mini"
BATCH_SIZE = 200          # UPDATE statements per SQL file

SCRIPT_DIR  = Path(__file__).parent
WORK_DIR    = SCRIPT_DIR / "openai_repair_work"

D1_DUMP_FILE     = WORK_DIR / "d1_expressions.json"
BATCH_JSONL_FILE = WORK_DIR / "batch_input.jsonl"
BATCH_STATE_FILE = WORK_DIR / "batch_state.json"
RESULTS_FILE     = WORK_DIR / "batch_output.jsonl"

SYSTEM_PROMPT = (
    "You are an Arabic text repair assistant specializing in Quranic vocabulary.\n"
    "The Arabic text was extracted from a PDF with RTL layout issues: spaces were "
    "injected inside words, breaking single words into fragments.\n\n"
    "Your task: reconstruct the correctly-spaced Arabic.\n\n"
    "Rules:\n"
    "- Join fragments that form a single Arabic word (remove intra-word spaces)\n"
    "- Preserve spaces that are genuine word boundaries\n"
    "- If the input has multiple terms separated by '|', repair each term and "
    "keep the '|' separators\n"
    "- Return ONLY the repaired Arabic text — no explanation, no transliteration\n"
    "- Do NOT add diacritics (tashkeel) that were not in the original\n"
    "- If the text already looks correct, return it unchanged\n"
    "- Keep at most 4 pipe-separated terms"
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def find_wrangler() -> list[str]:
    for cmd in [["wrangler"], ["npx", "wrangler"]]:
        if shutil.which(cmd[0]):
            return cmd
    print("ERROR: wrangler not found. Install with: npm install -g wrangler")
    sys.exit(1)


def get_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        print("ERROR: OPENAI_API_KEY not set.")
        print("       export OPENAI_API_KEY=sk-...")
        sys.exit(1)
    return key


def openai_get(path: str, api_key: str) -> dict:
    import urllib.request
    req = urllib.request.Request(
        f"https://api.openai.com/v1{path}",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def openai_post(path: str, body: dict, api_key: str) -> dict:
    import urllib.request
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://api.openai.com/v1{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def openai_upload_file(jsonl_path: Path, api_key: str) -> str:
    """Upload a JSONL file to OpenAI Files API; returns file_id."""
    import requests as req_lib   # available in this environment
    with jsonl_path.open("rb") as f:
        resp = req_lib.post(
            "https://api.openai.com/v1/files",
            headers={"Authorization": f"Bearer {api_key}"},
            data={"purpose": "batch"},
            files={"file": (jsonl_path.name, f, "application/jsonl")},
        )
    resp.raise_for_status()
    return resp.json()["id"]


def openai_download_file(file_id: str, dest: Path, api_key: str) -> None:
    import requests as req_lib
    resp = req_lib.get(
        f"https://api.openai.com/v1/files/{file_id}/content",
        headers={"Authorization": f"Bearer {api_key}"},
        stream=True,
    )
    resp.raise_for_status()
    dest.write_bytes(resp.content)


# ── Stage 1: Fetch from D1 ────────────────────────────────────────────────────
def stage_fetch() -> list[dict]:
    WORK_DIR.mkdir(exist_ok=True)
    wr = find_wrangler()
    print("📥  Fetching AREX:VI:* records from D1…")

    cmd = wr + [
        "d1", "execute", DB_NAME, "--remote", "--json",
        "--command",
        "SELECT id, expression_ar, expression_en, qr_refs_json "
        "FROM ar_ling_expressions WHERE id LIKE 'AREX:VI:%' ORDER BY id"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"ERROR: {r.stderr}")
        sys.exit(1)

    data = json.loads(r.stdout)
    rows = data[0]["results"] if isinstance(data, list) else data.get("results", [])
    D1_DUMP_FILE.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(f"✅  Fetched {len(rows)} expressions  →  {D1_DUMP_FILE.name}")
    return rows


# ── Stage 2: Prepare Batch JSONL ──────────────────────────────────────────────
def stage_prepare() -> None:
    if not D1_DUMP_FILE.exists():
        print("Run --stage=fetch first"); sys.exit(1)

    rows = json.loads(D1_DUMP_FILE.read_text())
    print(f"📝  Building batch JSONL for {len(rows)} expressions…")

    with BATCH_JSONL_FILE.open("w", encoding="utf-8") as f:
        for row in rows:
            ar = (row.get("expression_ar") or "").strip()
            request = {
                "custom_id": row["id"],
                "method":    "POST",
                "url":       "/v1/chat/completions",
                "body": {
                    "model":       MODEL,
                    "temperature": 0,
                    "max_tokens":  200,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": ar},
                    ],
                },
            }
            f.write(json.dumps(request, ensure_ascii=False) + "\n")

    size_kb = BATCH_JSONL_FILE.stat().st_size // 1024
    print(f"✅  JSONL ready  ({size_kb} KB, {len(rows)} requests)  →  {BATCH_JSONL_FILE.name}")


# ── Stage 3: Submit ────────────────────────────────────────────────────────────
def stage_submit() -> None:
    api_key = get_api_key()
    if not BATCH_JSONL_FILE.exists():
        print("Run --stage=prepare first"); sys.exit(1)

    print("⬆️   Uploading JSONL to OpenAI Files API…")
    file_id = openai_upload_file(BATCH_JSONL_FILE, api_key)
    print(f"     File ID: {file_id}")

    print("🚀  Creating batch job (24h window)…")
    resp = openai_post("/batches", {
        "input_file_id":      file_id,
        "endpoint":           "/v1/chat/completions",
        "completion_window":  "24h",
    }, api_key)

    batch_id = resp["id"]
    state = {
        "batch_id":     batch_id,
        "file_id":      file_id,
        "status":       resp["status"],
        "submitted_at": resp.get("created_at"),
    }
    BATCH_STATE_FILE.write_text(json.dumps(state, indent=2))
    print(f"✅  Batch submitted  →  {batch_id}  (status: {resp['status']})")
    print(f"     State saved to  {BATCH_STATE_FILE.name}")
    print()
    print("     Next: python3 ... --stage=poll   (or --resume)")


# ── Stage 4: Poll + Download ──────────────────────────────────────────────────
def stage_poll() -> None:
    api_key = get_api_key()
    if not BATCH_STATE_FILE.exists():
        print("Run --stage=submit first"); sys.exit(1)

    state    = json.loads(BATCH_STATE_FILE.read_text())
    batch_id = state["batch_id"]
    print(f"⏳  Polling batch {batch_id} …  (Ctrl-C to pause; re-run --resume later)")

    try:
        while True:
            resp     = openai_get(f"/batches/{batch_id}", api_key)
            status   = resp["status"]
            counts   = resp.get("request_counts", {})
            done     = counts.get("completed", 0)
            failed   = counts.get("failed", 0)
            total    = counts.get("total", "?")
            print(f"     {status:12s}  {done}/{total} done,  {failed} failed", flush=True)

            if status in ("completed", "failed", "expired", "cancelled"):
                state.update({
                    "status":         status,
                    "output_file_id": resp.get("output_file_id"),
                    "error_file_id":  resp.get("error_file_id"),
                })
                BATCH_STATE_FILE.write_text(json.dumps(state, indent=2))
                break
            time.sleep(30)
    except KeyboardInterrupt:
        print("\n     Paused. Re-run with --resume to continue polling.")
        return

    if status != "completed":
        print(f"❌  Batch ended with status: {status}")
        if state.get("error_file_id"):
            print(f"     Error file: {state['error_file_id']}")
        sys.exit(1)

    print("📥  Downloading results…")
    openai_download_file(state["output_file_id"], RESULTS_FILE, api_key)
    print(f"✅  Results saved  →  {RESULTS_FILE.name}")
    print()
    print("     Next: python3 ... --stage=process")


# ── Stage 5: Process Results → UPDATE SQL ─────────────────────────────────────
def escape_sql(s: str) -> str:
    return s.replace("'", "''")


def stage_process() -> None:
    if not RESULTS_FILE.exists():
        print("Run --stage=poll first"); sys.exit(1)
    if not D1_DUMP_FILE.exists():
        print("D1 dump not found; re-run --stage=fetch"); sys.exit(1)

    original: dict[str, dict] = {
        r["id"]: r
        for r in json.loads(D1_DUMP_FILE.read_text())
    }

    updates: list[tuple[str, str]] = []
    unchanged = errors = 0

    with RESULTS_FILE.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            result = json.loads(line)
            rec_id = result.get("custom_id", "")

            if result.get("error"):
                errors += 1
                continue

            try:
                repaired = (
                    result["response"]["body"]
                           ["choices"][0]
                           ["message"]["content"]
                    .strip()
                )
            except (KeyError, IndexError, TypeError):
                errors += 1
                continue

            orig_ar = (original.get(rec_id, {}).get("expression_ar") or "").strip()
            if repaired == orig_ar:
                unchanged += 1
                continue

            updates.append((rec_id, repaired))

    print(f"📊  {len(updates)} to update,  {unchanged} unchanged,  {errors} errors")

    # Write UPDATE SQL in chunks
    sql_dir = WORK_DIR / "update_sql_batches"
    sql_dir.mkdir(exist_ok=True)
    # Clear old files
    for old in sql_dir.glob("upd_*.sql"):
        old.unlink()

    for i in range(0, len(updates), BATCH_SIZE):
        chunk = updates[i : i + BATCH_SIZE]
        lines = [
            f"UPDATE ar_ling_expressions "
            f"SET expression_ar='{escape_sql(ar)}' "
            f"WHERE id='{escape_sql(rid)}';"
            for rid, ar in chunk
        ]
        fname = sql_dir / f"upd_{i // BATCH_SIZE:04d}.sql"
        fname.write_text("\n".join(lines) + "\n")

    n_files = (len(updates) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"✅  {len(updates)} UPDATE statements  →  {sql_dir.name}/  ({n_files} files)")
    print()
    print("     Next: python3 ... --stage=push")


# ── Stage 6: Push Updates to D1 ───────────────────────────────────────────────
def stage_push() -> None:
    sql_dir = WORK_DIR / "update_sql_batches"
    if not sql_dir.exists() or not list(sql_dir.glob("upd_*.sql")):
        print("Run --stage=process first"); sys.exit(1)

    wr      = find_wrangler()
    files   = sorted(sql_dir.glob("upd_*.sql"))
    total   = len(files)
    failed  = []

    print(f"🚀  Pushing {total} UPDATE batches to D1…")
    for i, path in enumerate(files, 1):
        print(f"  [{i:02d}/{total}]  {path.name} … ", end="", flush=True)
        cmd = wr + ["d1", "execute", DB_NAME, "--remote", "--file", str(path)]
        r   = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            print("✅")
        else:
            print(f"❌\n          {r.stderr.strip()[:120]}")
            failed.append(path.name)

    if failed:
        print(f"\n⚠️   {len(failed)} batches failed: {failed}")
        print("     Retry individually with:")
        for f in failed:
            print(f"       wrangler d1 execute {DB_NAME} --remote --file {sql_dir / f}")
    else:
        print(f"\n🎉  All done! Verifying…")
        cmd = wr + [
            "d1", "execute", DB_NAME, "--remote",
            "--command",
            "SELECT id, expression_ar FROM ar_ling_expressions "
            "WHERE id LIKE 'AREX:VI:%' LIMIT 5"
        ]
        subprocess.run(cmd)


# ── Main ──────────────────────────────────────────────────────────────────────
STAGE_MAP = {
    "fetch":   stage_fetch,
    "prepare": stage_prepare,
    "submit":  stage_submit,
    "poll":    stage_poll,
    "process": stage_process,
    "push":    stage_push,
}


def main() -> None:
    stage = "all"
    for arg in sys.argv[1:]:
        if arg.startswith("--stage="):
            stage = arg.split("=", 1)[1]
        elif arg == "--resume":
            stage = "poll"

    WORK_DIR.mkdir(exist_ok=True)

    if stage == "all":
        stage_fetch()
        stage_prepare()
        stage_submit()
        stage_poll()
        stage_process()
        stage_push()
    elif stage in STAGE_MAP:
        STAGE_MAP[stage]()
    else:
        print(f"Unknown stage '{stage}'. Options: {', '.join(STAGE_MAP)} | all | --resume")
        sys.exit(1)


if __name__ == "__main__":
    main()
