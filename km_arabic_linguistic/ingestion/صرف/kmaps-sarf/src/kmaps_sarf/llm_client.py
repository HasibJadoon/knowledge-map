"""Thin OpenAI Responses-API client used for Sarf claim extraction.

Reads OPENAI_API_KEY/OPENAI_MODEL from env (loaded by config.load_env()).
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any


class LLMError(RuntimeError):
    pass


def _post_json(url: str, body: dict, headers: dict, timeout: int) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def openai_responses(
    system_prompt: str,
    user_payload: dict,
    schema: dict,
    schema_name: str,
    *,
    model: str | None = None,
    max_output_tokens: int = 2400,
    retries: int = 3,
) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMError("OPENAI_API_KEY not set")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "180"))
    body = {
        "model": model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "strict": True,
                "schema": schema,
            }
        },
        "max_output_tokens": max_output_tokens,
    }
    if os.getenv("OPENAI_REASONING_EFFORT"):
        body["reasoning"] = {"effort": os.getenv("OPENAI_REASONING_EFFORT")}

    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            data = _post_json(
                f"{base_url}/responses",
                body,
                {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                timeout,
            )
            text = _response_text(data)
            if not text:
                raise LLMError("empty response from OpenAI")
            return json.loads(text)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, LLMError) as exc:
            last_err = exc
            if attempt < retries:
                time.sleep(2 ** attempt)
    raise LLMError(f"OpenAI request failed after {retries} attempts: {last_err!r}")


def _response_text(data: dict) -> str:
    if isinstance(data.get("output_text"), str):
        return data["output_text"]
    parts: list[str] = []
    for output in data.get("output") or []:
        if not isinstance(output, dict):
            continue
        for content in output.get("content") or []:
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                parts.append(str(content.get("text") or ""))
    return "".join(parts)


def ollama_embed(texts: list[str], model: str | None = None) -> list[list[float]]:
    """Embed a list of texts via local Ollama. Returns list of float vectors."""
    base = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
    model = model or os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    out: list[list[float]] = []
    timeout = 60
    for text in texts:
        body = {"model": model, "input": text}
        data = _post_json(
            f"{base}/api/embed",
            body,
            {"Content-Type": "application/json"},
            timeout,
        )
        emb = data.get("embeddings")
        if emb and isinstance(emb, list):
            out.append(list(emb[0]))
            continue
        # older API shape
        if "embedding" in data:
            out.append(list(data["embedding"]))
            continue
        raise LLMError(f"unexpected ollama response: {list(data)[:5]}")
    return out
