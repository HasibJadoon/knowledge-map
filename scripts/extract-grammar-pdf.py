import argparse
import hashlib
import json
import re
from pathlib import Path

import fitz  # PyMuPDF


def canonicalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sql_escape(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def clean_lines(text: str):
    lines = [line.strip() for line in text.splitlines()]
    cleaned = []
    for line in lines:
        if not line:
            continue
        if re.fullmatch(r"\d+", line):
            # page numbers
            continue
        cleaned.append(line)
    return cleaned


def extract_toc_entries(doc, toc_page: int):
    lines = []
    started = False
    for page_index in range(toc_page - 1, min(toc_page + 4, doc.page_count)):
        text = doc.load_page(page_index).get_text("text")
        if not text:
            continue
        page_lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not started and not any("TABLE OF CONTENTS" in ln.upper() for ln in page_lines):
            continue
        started = True
        lines.extend(page_lines)
    return parse_toc_lines(lines)


def parse_toc_lines(lines):
    entries = []
    buffer = []
    for line in lines:
        if re.search(r"\.{3,}\s*\d+\s*$", line):
            combined = " ".join(buffer + [line]) if buffer else line
            buffer = []
            entries.append(combined)
        else:
            if buffer or line.lower().startswith("chapter") or re.match(r"^\d+\.\d+", line):
                buffer.append(line)
    return entries


def parse_toc_entries(entries):
    chapters = []
    sections = []
    current_chapter = None
    for line in entries:
        chapter_match = re.match(r"^Chapter\s+(\d+)\s*[–-]\s*(.+?)\s*\.{3,}\s*(\d+)\s*$", line, re.IGNORECASE)
        if chapter_match:
            num = int(chapter_match.group(1))
            title = chapter_match.group(2).strip()
            page = int(chapter_match.group(3))
            current_chapter = num
            chapters.append({"number": num, "title": title, "page": page})
            continue

        section_match = re.match(r"^(\d+\.\d+)\s+(.+?)\s*\.{3,}\s*(\d+)\s*$", line)
        if section_match and current_chapter is not None:
            number = section_match.group(1).strip()
            title = section_match.group(2).strip()
            page = int(section_match.group(3))
            sections.append(
                {"chapter_number": current_chapter, "number": number, "title": title, "page": page}
            )
            continue

        # handle unnumbered sections like "Introduction" with page number
        misc_match = re.match(r"^([A-Za-z][A-Za-z\s'\"-]+?)\s*\.{3,}\s*(\d+)\s*$", line)
        if misc_match and current_chapter is not None:
            title = misc_match.group(1).strip()
            page = int(misc_match.group(2))
            sections.append(
                {"chapter_number": current_chapter, "number": None, "title": title, "page": page}
            )

    return chapters, sections


def find_chapters(doc, start_page, end_page, toc_titles):
    chapters = []
    current = None
    for page_index in range(start_page - 1, end_page):
        text = doc.load_page(page_index).get_text("text")
        if not text:
            continue
        lines = clean_lines(text)
        head = " ".join(lines[:12]).upper()
        if "CHAPTER" not in head:
            continue
        number_match = re.search(r"CHAPTER\s*[^0-9]*(\d+)", head)
        if not number_match:
            continue
        num = int(number_match.group(1))
        if current is None or current["number"] != num:
            current = {
                "number": num,
                "start_page": page_index + 1,
                "title": toc_titles.get(num),
            }
            chapters.append(current)

        # capture title from line if available
        if current.get("title") is None:
            for line in lines[:6]:
                if "CHAPTER" in line.upper():
                    cleaned = re.sub(r"CHAPTER\s*[^0-9]*\d+\s*[–-]?\s*", "", line, flags=re.IGNORECASE).strip()
                    if cleaned and not re.search(r"VOCABULARY|MEMORIZATION", cleaned, re.IGNORECASE):
                        current["title"] = cleaned
                    break
    # fill missing titles
    for chapter in chapters:
        if not chapter.get("title"):
            chapter["title"] = f"Chapter {chapter['number']}"
    return chapters


def find_section_starts(doc, chapter, sections):
    chapter_num = chapter["number"]
    chapter_start = chapter["start_page"]
    chapter_end = chapter["end_page"]
    found = []
    for section in sections:
        if section["chapter_number"] != chapter_num:
            continue
        section_number = section["number"]
        if not section_number:
            continue
        pattern = re.compile(rf"\b{re.escape(section_number)}\b")
        start_page = None
        for page_index in range(chapter_start - 1, chapter_end):
            text = doc.load_page(page_index).get_text("text")
            if not text:
                continue
            head = " ".join(clean_lines(text)[:8])
            if pattern.search(head):
                start_page = page_index + 1
                break
        if start_page:
            found.append(
                {
                    "chapter_number": chapter_num,
                    "number": section_number,
                    "title": section["title"],
                    "start_page": start_page,
                }
            )
    return found


def extract_text_range(doc, start_page, end_page):
    parts = []
    for page in range(start_page - 1, end_page):
        text = doc.load_page(page).get_text("text")
        if not text:
            continue
        lines = clean_lines(text)
        parts.append("\n".join(lines))
    return "\n".join(parts).strip()


def build_units(doc, source_identifier):
    books = [
        {
            "key": "nahw_textbook",
            "title": "Nahw Textbook",
            "toc_page": 4,
        },
        {
            "key": "sarf_textbook",
            "title": "Sarf Textbook",
            "toc_page": 150,
        },
        {
            "key": "advanced_nahw",
            "title": "Advanced Nahw Textbook",
            "toc_page": 303,
        },
        {
            "key": "advanced_structures",
            "title": "Advanced Structures Textbook",
            "toc_page": 359,
        },
        {
            "key": "balagha",
            "title": "Balagha",
            "toc_page": None,
        },
    ]

    # parse TOC titles
    toc_titles = {}
    toc_sections = {}
    for book in books:
        if not book["toc_page"]:
            continue
        entries = extract_toc_entries(doc, book["toc_page"])
        chapters, sections = parse_toc_entries(entries)
        toc_titles[book["key"]] = {item["number"]: item["title"] for item in chapters}
        toc_sections[book["key"]] = sections

    # determine book ranges
    balagha_start = 418
    start_pages = {}
    # nahw
    start_pages["nahw_textbook"] = 7
    # sarf
    start_pages["sarf_textbook"] = 151
    # advanced nahw
    start_pages["advanced_nahw"] = 304
    # advanced structures
    start_pages["advanced_structures"] = 360
    # balagha
    start_pages["balagha"] = balagha_start

    end_pages = {
        "nahw_textbook": start_pages["sarf_textbook"] - 1,
        "sarf_textbook": start_pages["advanced_nahw"] - 1,
        "advanced_nahw": start_pages["advanced_structures"] - 1,
        "advanced_structures": start_pages["balagha"] - 1,
        "balagha": doc.page_count,
    }

    units = []
    items = []

    for book in books:
        book_key = book["key"]
        book_start = start_pages[book_key]
        book_end = end_pages[book_key]

        book_unit_id = sha256_hex(canonicalize(f"GRAMUNIT|{book_key}|book"))
        units.append(
            {
                "id": book_unit_id,
                "parent_id": None,
                "unit_type": "book",
                "order_index": None,
                "title": book["title"],
                "title_ar": None,
                "source_identifier": source_identifier,
                "start_page": book_start,
                "end_page": book_end,
                "meta": {"book_key": book_key},
            }
        )

        if book_key == "balagha":
            # use outline pages for balagha chapters
            toc = doc.get_toc(simple=True)
            balagha_chapters = []
            for level, title, page in toc:
                if page and page >= balagha_start and title.lower().startswith("chapter"):
                    match = re.search(r"(\d+)", title)
                    if not match:
                        continue
                    balagha_chapters.append(
                        {
                            "number": int(match.group(1)),
                            "title": title.replace("_Edited", "").strip(),
                            "start_page": page,
                        }
                    )
            balagha_chapters.sort(key=lambda c: c["start_page"])
            for idx, chapter in enumerate(balagha_chapters):
                chapter_end = (
                    balagha_chapters[idx + 1]["start_page"] - 1
                    if idx + 1 < len(balagha_chapters)
                    else book_end
                )
                chapter_id = sha256_hex(canonicalize(f"GRAMUNIT|{book_key}|chapter|{chapter['number']:02d}"))
                units.append(
                    {
                        "id": chapter_id,
                        "parent_id": book_unit_id,
                        "unit_type": "chapter",
                        "order_index": chapter["number"],
                        "title": chapter["title"],
                        "title_ar": None,
                        "source_identifier": source_identifier,
                        "start_page": chapter["start_page"],
                        "end_page": chapter_end,
                        "meta": {"chapter_number": chapter["number"]},
                    }
                )
                content = extract_text_range(doc, chapter["start_page"], chapter_end)
                if content:
                    item_id = sha256_hex(canonicalize(f"GRAMITEM|{chapter_id}|1"))
                    items.append(
                        {
                            "id": item_id,
                            "unit_id": chapter_id,
                            "item_type": "content",
                            "title": chapter["title"],
                            "content": content,
                            "content_ar": None,
                            "order_index": 1,
                            "meta": None,
                        }
                    )
            continue

        # chapters for other books
        chapters = find_chapters(doc, book_start, book_end, toc_titles.get(book_key, {}))
        # set end pages
        for idx, chapter in enumerate(chapters):
            chapter_end = chapters[idx + 1]["start_page"] - 1 if idx + 1 < len(chapters) else book_end
            chapter["end_page"] = chapter_end

        sections_list = toc_sections.get(book_key, [])

        for chapter in chapters:
            chapter_id = sha256_hex(
                canonicalize(f"GRAMUNIT|{book_key}|chapter|{chapter['number']:02d}")
            )
            units.append(
                {
                    "id": chapter_id,
                    "parent_id": book_unit_id,
                    "unit_type": "chapter",
                    "order_index": chapter["number"],
                    "title": chapter["title"],
                    "title_ar": None,
                    "source_identifier": source_identifier,
                    "start_page": chapter["start_page"],
                    "end_page": chapter["end_page"],
                    "meta": {"chapter_number": chapter["number"]},
                }
            )

            section_starts = find_section_starts(doc, chapter, sections_list)
            if section_starts:
                # set end pages for sections
                section_starts.sort(key=lambda s: s["start_page"])
                for idx, section in enumerate(section_starts):
                    section_end = (
                        section_starts[idx + 1]["start_page"] - 1
                        if idx + 1 < len(section_starts)
                        else chapter["end_page"]
                    )
                    section_id = sha256_hex(
                        canonicalize(
                            f"GRAMUNIT|{book_key}|section|{section['number']}"
                        )
                    )
                    units.append(
                        {
                            "id": section_id,
                            "parent_id": chapter_id,
                            "unit_type": "section",
                            "order_index": idx + 1,
                            "title": section["title"],
                            "title_ar": None,
                            "source_identifier": source_identifier,
                            "start_page": section["start_page"],
                            "end_page": section_end,
                            "meta": {
                                "chapter_number": chapter["number"],
                                "section_number": section["number"],
                            },
                        }
                    )
                    content = extract_text_range(doc, section["start_page"], section_end)
                    if content:
                        item_id = sha256_hex(canonicalize(f"GRAMITEM|{section_id}|1"))
                        items.append(
                            {
                                "id": item_id,
                                "unit_id": section_id,
                                "item_type": "content",
                                "title": section["title"],
                                "content": content,
                                "content_ar": None,
                                "order_index": 1,
                                "meta": None,
                            }
                        )
            else:
                content = extract_text_range(doc, chapter["start_page"], chapter["end_page"])
                if content:
                    item_id = sha256_hex(canonicalize(f"GRAMITEM|{chapter_id}|1"))
                    items.append(
                        {
                            "id": item_id,
                            "unit_id": chapter_id,
                            "item_type": "content",
                            "title": chapter["title"],
                            "content": content,
                            "content_ar": None,
                            "order_index": 1,
                            "meta": None,
                        }
                    )

    return units, items


def generate_sql(units, items, source_identifier, source_title):
    statements = []
    statements.append(
        "INSERT INTO ar_sources (source_type, title, identifier, notes) "
        f"VALUES ('grammar_textbook', {sql_escape(source_title)}, {sql_escape(source_identifier)}, 'Imported from PDF') ;"
    )

    for unit in units:
        meta_json = json.dumps(unit["meta"]) if unit.get("meta") else None
        statements.append(
            "INSERT OR REPLACE INTO ar_grammar_units "
            "(id, parent_id, unit_type, order_index, title, title_ar, source_id, start_page, end_page, meta_json) VALUES "
            f"({sql_escape(unit['id'])}, {sql_escape(unit['parent_id'])}, {sql_escape(unit['unit_type'])}, "
            f"{sql_escape(unit['order_index'])}, {sql_escape(unit['title'])}, {sql_escape(unit['title_ar'])}, "
            f"(SELECT id FROM ar_sources WHERE identifier = {sql_escape(source_identifier)} ORDER BY id DESC LIMIT 1), "
            f"{sql_escape(unit['start_page'])}, {sql_escape(unit['end_page'])}, {sql_escape(meta_json)});"
        )

    for item in items:
        meta_json = json.dumps(item["meta"]) if item.get("meta") else None
        statements.append(
            "INSERT OR REPLACE INTO ar_grammar_unit_items "
            "(id, unit_id, item_type, title, content, content_ar, order_index, meta_json) VALUES "
            f"({sql_escape(item['id'])}, {sql_escape(item['unit_id'])}, {sql_escape(item['item_type'])}, "
            f"{sql_escape(item['title'])}, {sql_escape(item['content'])}, {sql_escape(item['content_ar'])}, "
            f"{sql_escape(item['order_index'])}, {sql_escape(meta_json)});"
        )

    return "\n".join(statements)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--out", default="/tmp/grammar_textbook_import.sql")
    parser.add_argument("--source-title", default="Dream Textbook")
    parser.add_argument("--source-identifier", default="dream_textbook_pdf")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    doc = fitz.open(pdf_path)
    units, items = build_units(doc, args.source_identifier)
    sql = generate_sql(units, items, args.source_identifier, args.source_title)
    Path(args.out).write_text(sql, encoding="utf-8")
    print(f"Wrote {len(units)} units and {len(items)} items to {args.out}")


if __name__ == "__main__":
    main()
