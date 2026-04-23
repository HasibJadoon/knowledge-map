import argparse
import sqlite3


def main():
    parser = argparse.ArgumentParser(description="Process word column updates in batches.")
    parser.add_argument('--limit', type=int, default=200, help='number of rows to process per run')
    args = parser.parse_args()
    limit = args.limit
    conn = sqlite3.connect('database/d1.db')
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT id, surah, ayah, token_index
        FROM quran_ayah_lemma_location
        WHERE word_simple IS NULL OR word_diacritic IS NULL
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    if not rows:
        print('done')
        conn.close()
        return

    for rid, surah, ayah, token_index in rows:
        word_simple = None
        word_diacritic = None
        for pos in (token_index - 1, token_index):
            if pos < 0:
                continue
            token = cur.execute(
                """
                SELECT surface_ar, norm_ar
                FROM ar_occ_token
                WHERE unit_id = ? AND pos_index = ?
                LIMIT 1
                """,
                (f"U:QURAN:{surah}:{ayah}", pos),
            ).fetchone()
            if not token:
                continue
            surface, norm = token
            if word_simple is None:
                word_simple = norm or surface
            if word_diacritic is None:
                word_diacritic = surface
            if word_simple and word_diacritic:
                break
        cur.execute(
            """
            UPDATE quran_ayah_lemma_location
            SET word_simple = COALESCE(?, word_simple),
                word_diacritic = COALESCE(?, word_diacritic)
            WHERE id = ?
            """,
            (word_simple, word_diacritic, rid),
        )
    conn.commit()
    conn.close()
    print('processed', len(rows))


if __name__ == '__main__':
    main()
