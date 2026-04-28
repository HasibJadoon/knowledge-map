from __future__ import annotations

import hashlib


def stable_id(prefix: str, *parts: object) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def src_id(*parts: object) -> str:
    return stable_id("AL:SRC:", *parts)


def chunk_id(*parts: object) -> str:
    return stable_id("AL:CHUNK:", *parts)


def claim_id(*parts: object) -> str:
    return stable_id("AL:CLM:", *parts)
