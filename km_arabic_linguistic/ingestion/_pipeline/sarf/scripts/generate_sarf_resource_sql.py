from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from pypdf import PdfReader


MODULE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUT_DIR = MODULE_DIR / "output"


SOURCE_METADATA = {
    "https://shamela.ws/book/21017": ("المعجم الاشتقاقي المؤصل لألفاظ القرآن الكريم", "al-Mu'jam al-Ishtiqaqi", "classical_lexicon"),
    "https://shamela.ws/book/1687": ("لسان العرب", "Lisan al-Arab", "classical_lexicon"),
    "https://shamela.ws/book/23636": ("مفردات ألفاظ القرآن", "Raghib Mufradat", "classical_lexicon"),
    "https://shamela.ws/book/9856": ("بصائر ذوي التمييز في لطائف الكتاب العزيز", "Basa'ir Dhawi al-Tamyiz", "classical_lexicon"),
    "https://lexicon.quranic-research.net": ("معجم القرآن البحثي", "Lexicon Quranic Research", "classical_lexicon"),
    "https://arabiclexicon.hawramani.com": ("المعجم العربي - هوراماني", "Hawramani Arabic Lexicon", "classical_lexicon"),
    "https://deepblue.lib.umich.edu/handle/2027.42/94553": ("الأفعال الاصطلاحية في القرآن", "Mustansir Mir PDF Landing", "academic_paper"),
    "http://deepblue.lib.umich.edu/bitstream/2027.42/94553/1/39015087418615.pdf": ("الأفعال الاصطلاحية في القرآن", "Mustansir Mir PDF Direct", "academic_paper"),
    "https://press.princeton.edu/books/hardcover/9780691241313/key-terms-of-the-quran": ("مصطلحات القرآن المفتاحية", "Key Terms of the Qur'an", "academic_paper"),
    "https://shamela.ws/book/9776": ("التحرير والتنوير", "Ibn Ashur Tahrir wa Tanwir", "tafsir_linguistic"),
    "https://shamela.ws/book/23635": ("مفاتيح الغيب", "al-Razi Mafatih al-Ghayb", "tafsir_linguistic"),
    "https://shamela.ws/book/22835": ("روح المعاني", "al-Alusi Ruh al-Ma'ani", "tafsir_linguistic"),
    "https://shamela.ws/book/7798": ("جامع البيان", "al-Tabari Jami' al-Bayan", "tafsir_linguistic"),
    "https://shamela.ws/book/8473": ("تفسير ابن كثير", "Ibn Kathir", "tafsir_linguistic"),
    "https://shamela.ws/book/23627": ("الكشاف", "al-Kashshaf", "tafsir_linguistic"),
    "https://shamela.ws/book/23591": ("البحر المحيط", "al-Bahr al-Muhit", "tafsir_linguistic"),
    "https://shamela.ws/book/9057": ("الدر المصون", "al-Durr al-Masun", "tafsir_linguistic"),
    "https://shamela.ws/book/23632": ("المحرر الوجيز", "al-Muharrar al-Wajiz", "tafsir_linguistic"),
    "https://shamela.ws/book/22916": ("الجدول في إعراب القرآن", "al-Jadwal Safi", "tafsir_linguistic"),
    "https://shamela.ws/book/2163": ("إعراب القرآن وبيانه", "Darwish I'rab", "tafsir_linguistic"),
    "https://shamela.ws/book/22928": ("التبيان في إعراب القرآن", "al-Tibyan al-Ukbari", "tafsir_linguistic"),
}

PDF_METADATA = {
    "VERBAL-IDIOMS-of-QURAN.pdf": (
        "الأفعال الاصطلاحية في القرآن",
        "Verbal Idioms of the Qur'an",
        "academic_paper",
        "Mustansir Mir",
    ),
    "Verbal-Idioms-Mushaf-Order-Version-2-PDF.pdf": (
        "الأفعال الاصطلاحية في القرآن - ترتيب المصحف",
        "Verbal Idioms of the Qur'an - Mushaf Order",
        "academic_paper",
        "Mustansir Mir",
    ),
    "Sinai-N-–-Key-terms-of-the-Quran-.pdf": (
        "مصطلحات القرآن المفتاحية",
        "Key Terms of the Qur'an",
        "academic_paper",
        "Nicolai Sinai",
    ),
}


def stable_id(prefix: str, *parts: object) -> str:
    raw = "|".join(str(part) for part in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def sql_string(value: object | None) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def insert(table: str, row: dict[str, object | None], update_columns: list[str]) -> str:
    cols = list(row)
    values = ", ".join(sql_string(row[col]) for col in cols)
    updates = ", ".join(f"{col}=excluded.{col}" for col in update_columns)
    return (
        f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({values}) "
        f"ON CONFLICT(id) DO UPDATE SET {updates};\n"
    )


def read_docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", ns):
        parts = [node.text or "" for node in para.findall(".//w:t", ns)]
        line = "".join(parts).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def read_pdf_pages(path: Path) -> list[tuple[int, str]]:
    reader = PdfReader(str(path))
    pages: list[tuple[int, str]] = []
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((index, text))
    return pages


def chunk_text(text: str, max_chars: int) -> list[str]:
    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for para in paragraphs:
        if current and current_len + len(para) + 1 > max_chars:
            chunks.append("\n".join(current))
            current = []
            current_len = 0
        current.append(para)
        current_len += len(para) + 1
    if current:
        chunks.append("\n".join(current))
    return chunks


def resource_links(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8").replace("\u2028", "\n")
    links = re.findall(r"https?://[^\s•]+", raw)
    unique: list[str] = []
    for link in links:
        link = link.rstrip(".,؛")
        if link not in unique:
            unique.append(link)
    return unique


def source_row(source_id: str, title_ar: str, title_en: str, source_type: str, note: dict[str, object]) -> str:
    return insert(
        "ar_ling_sources",
        {
            "id": source_id,
            "title_ar": title_ar,
            "title_en": title_en,
            "source_type": source_type,
            "author_name": None,
            "period_label": None,
            "note_md": json.dumps(note, ensure_ascii=False),
        },
        ["title_ar", "title_en", "source_type", "author_name", "period_label", "note_md"],
    )


def generate(args: argparse.Namespace) -> dict[str, object]:
    args.out_dir.mkdir(parents=True, exist_ok=True)
    links_file = args.module_dir / "Resources links.text"
    statements: list[str] = ["-- Generated by generate_sarf_resource_sql.py\n"]
    chunk_records: list[dict[str, object | None]] = []
    manifest: dict[str, object] = {"sources": [], "chunks": 0}

    for url in resource_links(links_file):
        title_ar, title_en, source_type = SOURCE_METADATA.get(url, (url, url, "other"))
        source_id = stable_id("AL:SRC:", "sarf-resource-link", url)
        statements.append(
            source_row(
                source_id,
                title_ar,
                title_en,
                source_type,
                {"ingestion": "sarf_resource_links", "url": url, "source_manifest": str(links_file)},
            )
        )
        manifest["sources"].append({"id": source_id, "url": url, "title_en": title_en, "kind": "link"})

    seen_hashes: set[str] = set()

    for docx_path in sorted(args.module_dir.glob("*.docx")):
        text = read_docx_text(docx_path)
        source_id = stable_id("AL:SRC:", "sarf-docx", docx_path.name)
        title_en = docx_path.stem.replace("_", " ")
        statements.append(
            source_row(
                source_id,
                docx_path.stem,
                title_en,
                "modern_grammar",
                {"ingestion": "sarf_docx", "local_path": str(docx_path), "sha1": stable_id("", docx_path.read_bytes().hex())},
            )
        )
        for idx, chunk in enumerate(chunk_text(text, args.chunk_chars), start=1):
            chunk_id = stable_id("AL:CHUNK:", source_id, idx, chunk)
            meta = {"ingestion": "sarf_docx", "file": docx_path.name}
            chunk_record = {
                "id": chunk_id,
                "source_id": source_id,
                "source_title_en": title_en,
                "chunk_kind": "grammar",
                "chunk_seq": idx,
                "heading_norm": title_en,
                "text_ar": chunk,
                "page_no": None,
                "meta_json": meta,
            }
            statements.append(
                insert(
                    "ar_ling_source_chunks",
                    {
                        "id": chunk_id,
                        "source_id": source_id,
                        "chunk_kind": "grammar",
                        "chunk_seq": idx,
                        "heading_norm": title_en,
                        "text_ar": chunk,
                        "tokens_approx": max(1, len(chunk.split())),
                        "meta_json": json.dumps(meta, ensure_ascii=False),
                    },
                    ["source_id", "chunk_kind", "chunk_seq", "heading_norm", "text_ar", "tokens_approx", "meta_json"],
                )
            )
            chunk_records.append(chunk_record)
            manifest["chunks"] = int(manifest["chunks"]) + 1
        manifest["sources"].append({"id": source_id, "file": str(docx_path), "title_en": title_en, "kind": "docx"})

    pdf_candidates = sorted(args.module_dir.glob("*.pdf"))
    parent_verbal = args.module_dir.parent / "Verbal-Idioms-Mushaf-Order-Version-2-PDF.pdf"
    if parent_verbal.exists():
        pdf_candidates.append(parent_verbal)

    for pdf_path in pdf_candidates:
        file_hash = hashlib.sha1(pdf_path.read_bytes()).hexdigest()
        if file_hash in seen_hashes:
            continue
        seen_hashes.add(file_hash)
        title_ar, title_en, source_type, author_name = PDF_METADATA.get(
            pdf_path.name,
            (pdf_path.stem, pdf_path.stem.replace("-", " "), "academic_paper", None),
        )
        source_id = stable_id("AL:SRC:", "sarf-pdf", file_hash)
        statements.append(
            insert(
                "ar_ling_sources",
                {
                    "id": source_id,
                    "title_ar": title_ar,
                    "title_en": title_en,
                    "source_type": source_type,
                    "author_name": author_name,
                    "period_label": "contemporary",
                    "note_md": json.dumps(
                        {"ingestion": "sarf_pdf", "local_path": str(pdf_path), "sha1": file_hash},
                        ensure_ascii=False,
                    ),
                },
                ["title_ar", "title_en", "source_type", "author_name", "period_label", "note_md"],
            )
        )
        page_count = 0
        for page_no, page_text in read_pdf_pages(pdf_path):
            for idx, chunk in enumerate(chunk_text(page_text, args.chunk_chars), start=1):
                chunk_seq = page_no * 100 + idx
                chunk_id = stable_id("AL:CHUNK:", source_id, page_no, idx, chunk)
                meta = {"ingestion": "sarf_pdf", "file": pdf_path.name, "page": page_no}
                chunk_record = {
                    "id": chunk_id,
                    "source_id": source_id,
                    "source_title_en": title_en,
                    "chunk_kind": "lexical",
                    "chunk_seq": chunk_seq,
                    "heading_norm": f"{title_en} p. {page_no}",
                    "text_ar": chunk,
                    "page_no": page_no,
                    "meta_json": meta,
                }
                statements.append(
                    insert(
                        "ar_ling_source_chunks",
                        {
                            "id": chunk_id,
                            "source_id": source_id,
                            "chunk_kind": "lexical",
                            "chunk_seq": chunk_seq,
                            "heading_norm": f"{title_en} p. {page_no}",
                            "text_ar": chunk,
                            "page_no": page_no,
                            "tokens_approx": max(1, len(chunk.split())),
                            "meta_json": json.dumps(meta, ensure_ascii=False),
                        },
                        [
                            "source_id",
                            "chunk_kind",
                            "chunk_seq",
                            "heading_norm",
                            "text_ar",
                            "page_no",
                            "tokens_approx",
                            "meta_json",
                        ],
                    )
                )
                chunk_records.append(chunk_record)
                manifest["chunks"] = int(manifest["chunks"]) + 1
            page_count += 1
        manifest["sources"].append(
            {"id": source_id, "file": str(pdf_path), "title_en": title_en, "kind": "pdf", "pages": page_count}
        )

    out_sql = args.out_dir / "sarf_resources_import.sql"
    out_sql.write_text("".join(statements), encoding="utf-8")
    out_manifest = args.out_dir / "sarf_resources_manifest.json"
    out_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    out_chunks = args.out_dir / "sarf_source_chunks.jsonl"
    with out_chunks.open("w", encoding="utf-8") as handle:
        for row in chunk_records:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate AL D1 SQL for Sarf source links and local docx resources.")
    parser.add_argument("--module-dir", type=Path, default=MODULE_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--chunk-chars", type=int, default=3500)
    return parser.parse_args()


if __name__ == "__main__":
    result = generate(parse_args())
    print(f"Generated {len(result['sources'])} Sarf source rows and {result['chunks']} source chunks.")
