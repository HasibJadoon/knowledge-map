"""
d1.py — Cloudflare D1 HTTP API helper
All pipeline reads/writes go through this module.
"""
from __future__ import annotations
import os
import httpx
from typing import Any

_account_id: str = ""
_db_id: str = ""
_headers: dict[str, str] = {}
_client: httpx.Client | None = None


def init() -> None:
    """Initialise credentials from environment. Call once at startup."""
    global _account_id, _db_id, _headers, _client
    _account_id = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    _db_id      = os.environ["D1_DATABASE_ID"]
    _headers    = {
        "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
        "Content-Type": "application/json",
    }
    _client = httpx.Client(timeout=30)


def _url() -> str:
    return (
        f"https://api.cloudflare.com/client/v4/accounts/{_account_id}"
        f"/d1/database/{_db_id}/query"
    )


def query(sql: str, params: list[Any] | None = None) -> list[dict]:
    """Execute a single SQL statement and return rows as list of dicts."""
    if _client is None:
        raise RuntimeError("d1.init() not called")
    payload: dict[str, Any] = {"sql": sql}
    if params:
        payload["params"] = params
    r = _client.post(_url(), headers=_headers, json=payload)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]


def execute(sql: str, params: list[Any] | None = None) -> int:
    """Execute a write statement. Returns rows_written."""
    if _client is None:
        raise RuntimeError("d1.init() not called")
    payload: dict[str, Any] = {"sql": sql}
    if params:
        payload["params"] = params
    r = _client.post(_url(), headers=_headers, json=payload)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors')}")
    return data["result"][0].get("rows_written", 0)


def batch(statements: list[dict]) -> list[list[dict]]:
    """
    Execute multiple SQL statements in a single round-trip.
    Each item: {"sql": str, "params": list}
    Returns list of result sets (one per statement).
    """
    if _client is None:
        raise RuntimeError("d1.init() not called")
    r = _client.post(_url(), headers=_headers, json=statements)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 batch error: {data.get('errors')}")
    return [res["results"] for res in data["result"]]
