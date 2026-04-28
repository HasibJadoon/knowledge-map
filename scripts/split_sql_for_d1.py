from __future__ import annotations

import argparse
from pathlib import Path


def split_sql(input_file: Path, out_dir: Path, stem: str, max_bytes: int) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob(f"{stem}-*.sql"):
        old.unlink()

    paths: list[Path] = []
    chunk: list[str] = []
    chunk_bytes = 0
    index = 1

    def flush() -> None:
        nonlocal chunk, chunk_bytes, index
        if not chunk:
            return
        path = out_dir / f"{stem}-{index:03}.sql"
        path.write_text("".join(chunk), encoding="utf-8")
        paths.append(path)
        index += 1
        chunk = []
        chunk_bytes = 0

    statement: list[str] = []
    with input_file.open("r", encoding="utf-8") as handle:
        for line in handle:
            statement.append(line)
            if line.rstrip().endswith(";"):
                text = "".join(statement)
                size = len(text.encode("utf-8"))
                if chunk and chunk_bytes + size > max_bytes:
                    flush()
                chunk.append(text)
                chunk_bytes += size
                statement = []
    if statement:
        text = "".join(statement)
        size = len(text.encode("utf-8"))
        if chunk and chunk_bytes + size > max_bytes:
            flush()
        chunk.append(text)
    flush()
    return paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Split a SQL file into D1-sized chunks at statement boundaries.")
    parser.add_argument("input_file", type=Path)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--stem", required=True)
    parser.add_argument("--max-bytes", type=int, default=4_000_000)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    written = split_sql(args.input_file, args.out_dir, args.stem, args.max_bytes)
    print(f"Wrote {len(written)} chunks to {args.out_dir}")
