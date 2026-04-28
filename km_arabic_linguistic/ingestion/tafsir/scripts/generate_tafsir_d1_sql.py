from __future__ import annotations

import argparse
import html
import json
import re
import sqlite3
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_TAFSIR_DIR = REPO_ROOT / "km_arabic_linguistic" / "Tafsirs"
DEFAULT_OUT_DIR = Path(__file__).resolve().parents[1] / "output"


@dataclass(frozen=True)
class TafsirWork:
    db_name: str
    scholar_id: str
    work_id: str
    name_ar: str
    name_en: str
    title_ar: str
    title_en: str
    era: str
    specialization: str
    source_url: str | None = None
    entry_type: str = "explanation"


WORKS: dict[str, TafsirWork] = {
    "al-bahr-al-muhit.db": TafsirWork(
        "al-bahr-al-muhit.db",
        "QR:SCH:ABU_HAYYAN",
        "QR:WORK:AL_BAHR_AL_MUHIT",
        "أبو حيان الأندلسي",
        "Abu Hayyan al-Andalusi",
        "البحر المحيط في التفسير",
        "al-Bahr al-Muhit",
        "medieval",
        "tafsir, qiraat, nahw",
        "https://shamela.ws/book/23591",
        "linguistic",
    ),
    "al-jadwal-fi-i-rab-al-quran.db": TafsirWork(
        "al-jadwal-fi-i-rab-al-quran.db",
        "QR:SCH:MAHMUD_SAFI",
        "QR:WORK:AL_JADWAL_FI_IRAB_AL_QURAN",
        "محمود صافي",
        "Mahmud Safi",
        "الجدول في إعراب القرآن وصرفه وبيانه",
        "al-Jadwal fi I'rab al-Qur'an",
        "contemporary",
        "i'rab, sarf, balagha",
        "https://shamela.ws/book/22916",
        "linguistic",
    ),
    "al-kashshaf-al-zamakhshari.db": TafsirWork(
        "al-kashshaf-al-zamakhshari.db",
        "QR:SCH:ZAMAKHSHARI",
        "QR:WORK:AL_KASHSHAF",
        "الزمخشري",
        "al-Zamakhshari",
        "الكشاف عن حقائق غوامض التنزيل",
        "al-Kashshaf",
        "medieval",
        "tafsir, balagha, nahw",
        "https://shamela.ws/book/23627",
        "linguistic",
    ),
    "al-muharrar-al-wajiz-ibn-atiyyah.db": TafsirWork(
        "al-muharrar-al-wajiz-ibn-atiyyah.db",
        "QR:SCH:IBN_ATIYYAH",
        "QR:WORK:AL_MUHARRAR_AL_WAJIZ",
        "ابن عطية الأندلسي",
        "Ibn Atiyyah al-Andalusi",
        "المحرر الوجيز في تفسير الكتاب العزيز",
        "al-Muharrar al-Wajiz",
        "medieval",
        "tafsir, language",
        "https://shamela.ws/book/23632",
    ),
    "ar-tafseer-tahrir-al-tanwir.db": TafsirWork(
        "ar-tafseer-tahrir-al-tanwir.db",
        "QR:SCH:IBN_ASHUR",
        "QR:WORK:TAHRIR_WA_TANWIR",
        "محمد الطاهر ابن عاشور",
        "Muhammad al-Tahir Ibn Ashur",
        "التحرير والتنوير",
        "al-Tahrir wa al-Tanwir",
        "modern",
        "tafsir, maqasid, balagha",
        "https://shamela.ws/book/9776",
    ),
    "ar-tafsir-al-tabari.db": TafsirWork(
        "ar-tafsir-al-tabari.db",
        "QR:SCH:TABARI",
        "QR:WORK:JAMI_AL_BAYAN",
        "ابن جرير الطبري",
        "al-Tabari",
        "جامع البيان عن تأويل آي القرآن",
        "Jami' al-Bayan",
        "classical",
        "tafsir, riwayah, language",
        "https://shamela.ws/book/7798",
    ),
    "ar-tafsir-ibn-kathir.db": TafsirWork(
        "ar-tafsir-ibn-kathir.db",
        "QR:SCH:IBN_KATHIR",
        "QR:WORK:TAFSIR_IBN_KATHIR",
        "ابن كثير",
        "Ibn Kathir",
        "تفسير القرآن العظيم",
        "Tafsir Ibn Kathir",
        "medieval",
        "tafsir, hadith",
        "https://shamela.ws/book/8473",
    ),
    "ayah-dependency-graphs.db": TafsirWork(
        "ayah-dependency-graphs.db",
        "QR:SCH:KMAPS_LINGUISTIC_PIPELINE",
        "QR:WORK:AYAH_DEPENDENCY_GRAPHS",
        "خط أنابيب التحليل اللغوي",
        "K-Maps Linguistic Pipeline",
        "خرائط اعتماد الآيات",
        "Ayah Dependency Graphs",
        "contemporary",
        "dependency graphs, syntax",
        None,
        "linguistic",
    ),
    "i-rab-al-quran-li-al-darwish.db": TafsirWork(
        "i-rab-al-quran-li-al-darwish.db",
        "QR:SCH:MUHYI_AL_DIN_DARWISH",
        "QR:WORK:IRAB_AL_QURAN_DARWISH",
        "محيي الدين الدرويش",
        "Muhyi al-Din al-Darwish",
        "إعراب القرآن وبيانه",
        "I'rab al-Qur'an wa Bayanuhu",
        "modern",
        "i'rab, balagha",
        "https://shamela.ws/book/2163",
        "linguistic",
    ),
    "tafsir-al-alusi.db": TafsirWork(
        "tafsir-al-alusi.db",
        "QR:SCH:AL_ALUSI",
        "QR:WORK:RUH_AL_MAANI",
        "الألوسي",
        "al-Alusi",
        "روح المعاني في تفسير القرآن العظيم والسبع المثاني",
        "Ruh al-Ma'ani",
        "pre_modern",
        "tafsir, language, kalam",
        "https://shamela.ws/book/22835",
    ),
    "tafsir-al-razi.db": TafsirWork(
        "tafsir-al-razi.db",
        "QR:SCH:FAKHR_AL_DIN_AL_RAZI",
        "QR:WORK:MAFATIH_AL_GHAYB",
        "فخر الدين الرازي",
        "Fakhr al-Din al-Razi",
        "مفاتيح الغيب",
        "Mafatih al-Ghayb",
        "medieval",
        "tafsir, kalam, philosophy",
        "https://shamela.ws/book/23635",
    ),
}


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.parts.append(data)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"p", "br", "h1", "h2", "h3", "li"}:
            self.parts.append("\n")


def stable_id(*parts: object) -> str:
    raw = "|".join(str(part) for part in parts)
    import hashlib

    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def sql_string(value: object | None) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def insert(table: str, row: dict[str, object | None], update_columns: Iterable[str]) -> str:
    cols = list(row)
    values = ", ".join(sql_string(row[col]) for col in cols)
    updates = ", ".join(f"{col}=excluded.{col}" for col in update_columns)
    return (
        f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({values}) "
        f"ON CONFLICT(id) DO UPDATE SET {updates};\n"
    )


def parse_ref(ref: str | None) -> tuple[int, int] | None:
    if not ref:
        return None
    match = re.search(r"(\d+)\s*:\s*(\d+)", ref)
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def strip_html(raw_html: str) -> str:
    parser = TextExtractor()
    parser.feed(raw_html or "")
    text = html.unescape(" ".join(parser.parts))
    text = re.sub(r"\s*\n\s*", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def source_page(raw_html: str) -> str | None:
    pages = re.findall(r"(?:p-|صفحة\s*)([٠-٩0-9]+)", raw_html or "")
    if not pages:
        return None
    unique = []
    for page in pages:
        if page not in unique:
            unique.append(page)
    return ",".join(unique[:8])


def iter_tafsir_rows(db_path: Path) -> Iterable[sqlite3.Row]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield from conn.execute(
            """
            SELECT ayah_key, group_ayah_key, from_ayah, to_ayah, ayah_keys, text
            FROM tafsir
            ORDER BY CAST(substr(from_ayah, 1, instr(from_ayah, ':') - 1) AS INTEGER),
                     CAST(substr(from_ayah, instr(from_ayah, ':') + 1) AS INTEGER)
            """
        )
    finally:
        conn.close()


def write_chunk(out_dir: Path, stem: str, index: int, statements: list[str]) -> Path:
    path = out_dir / f"{stem}-{index:03}.sql"
    with path.open("w", encoding="utf-8") as handle:
        handle.write("-- Generated by generate_tafsir_d1_sql.py\n")
        handle.writelines(statements)
    return path


def generate(args: argparse.Namespace) -> dict[str, object]:
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for old in args.out_dir.glob("tafsir-import-*.sql"):
        old.unlink()

    manifest: dict[str, object] = {"works": [], "total_entries": 0, "chunks": []}
    bootstrap: list[str] = []
    rows: list[str] = []

    for db_path in sorted(args.tafsir_dir.glob("*.db")):
        work = WORKS.get(db_path.name)
        if work is None:
            raise SystemExit(f"No metadata mapping for {db_path.name}")
        bootstrap.append(
            insert(
                "qr_scholar_profiles",
                {
                    "id": work.scholar_id,
                    "name_ar": work.name_ar,
                    "name_en": work.name_en,
                    "era": work.era,
                    "specialization": work.specialization,
                    "note_md": f"Imported for K-Maps Tafsir ingestion from {work.db_name}.",
                },
                ["name_ar", "name_en", "era", "specialization", "note_md"],
            )
        )
        bootstrap.append(
            insert(
                "qr_scholar_works",
                {
                    "id": work.work_id,
                    "scholar_id": work.scholar_id,
                    "title_ar": work.title_ar,
                    "title_en": work.title_en,
                    "work_type": "tafsir",
                    "is_complete": 1,
                    "summary": f"Imported local Tafsir SQLite source: {work.db_name}",
                    "note_md": json.dumps({"source_url": work.source_url, "local_db": str(db_path)}, ensure_ascii=False),
                },
                ["scholar_id", "title_ar", "title_en", "summary", "note_md"],
            )
        )

        count = 0
        for row in iter_tafsir_rows(db_path):
            from_ref = parse_ref(row["from_ayah"] or row["ayah_key"])
            to_ref = parse_ref(row["to_ayah"] or row["ayah_key"])
            if from_ref is None:
                continue
            surah, ayah_from = from_ref
            ayah_to = to_ref[1] if to_ref and to_ref[0] == surah else ayah_from
            raw_html = row["text"] or ""
            content = strip_html(raw_html)
            if not content:
                continue
            entry_id = "QR:TAFSIR:" + stable_id(work.work_id, row["group_ayah_key"], row["from_ayah"], row["to_ayah"])
            note = {
                "source_db": db_path.name,
                "ayah_key": row["ayah_key"],
                "group_ayah_key": row["group_ayah_key"],
                "ayah_keys": row["ayah_keys"],
                "source_url": work.source_url,
                "raw_html": raw_html,
            }
            rows.append(
                insert(
                    "qr_tafsir_entries",
                    {
                        "id": entry_id,
                        "surah": surah,
                        "ayah_from": ayah_from,
                        "ayah_to": ayah_to,
                        "entry_type": work.entry_type,
                        "scholar_id": work.scholar_id,
                        "work_id": work.work_id,
                        "content_ar": content,
                        "source_page": source_page(raw_html),
                        "note_md": json.dumps(note, ensure_ascii=False),
                    },
                    [
                        "surah",
                        "ayah_from",
                        "ayah_to",
                        "entry_type",
                        "scholar_id",
                        "work_id",
                        "content_ar",
                        "source_page",
                        "note_md",
                    ],
                )
            )
            count += 1
        manifest["works"].append({"db": db_path.name, "entries": count, "work_id": work.work_id})
        manifest["total_entries"] = int(manifest["total_entries"]) + count

    chunk_index = 1
    paths: list[str] = []
    paths.append(str(write_chunk(args.out_dir, "tafsir-import", chunk_index, bootstrap)))
    chunk_index += 1
    chunk: list[str] = []
    chunk_bytes = 0
    for statement in rows:
        statement_bytes = len(statement.encode("utf-8"))
        if chunk and (len(chunk) >= args.chunk_size or chunk_bytes + statement_bytes > args.max_chunk_bytes):
            path = write_chunk(args.out_dir, "tafsir-import", chunk_index, chunk)
            paths.append(str(path))
            chunk_index += 1
            chunk = []
            chunk_bytes = 0
        chunk.append(statement)
        chunk_bytes += statement_bytes
    if chunk:
        path = write_chunk(args.out_dir, "tafsir-import", chunk_index, chunk)
        paths.append(str(path))
    manifest["chunks"] = paths
    manifest_path = args.out_dir / "tafsir_import_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate D1 SQL chunks for local Tafsir SQLite sources.")
    parser.add_argument("--tafsir-dir", type=Path, default=DEFAULT_TAFSIR_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--chunk-size", type=int, default=250)
    parser.add_argument("--max-chunk-bytes", type=int, default=4_000_000)
    return parser.parse_args()


if __name__ == "__main__":
    result = generate(parse_args())
    print(f"Generated {result['total_entries']} tafsir entries across {len(result['chunks'])} SQL chunks.")
