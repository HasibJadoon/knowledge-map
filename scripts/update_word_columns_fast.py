import argparse
import sqlite3


def main():
    parser = argparse.ArgumentParser(description="Fast batch update for quran lemma word columns.")
    parser.add_argument('--limit', type=int, default=2000, help='rows to process per chunk')
    args = parser.parse_args()

    conn = sqlite3.connect('database/d1.db')
    cur = conn.cursor()

    tokens = {}
    for unit_id, pos_index, surface, norm in cur.execute(
        "SELECT unit_id, pos_index, surface_ar, norm_ar FROM ar_occ_token"
    ):
        tokens[(unit_id, pos_index)] = (surface, norm)

    total = 0
    while True:
        rows = cur.execute(
            """
            SELECT id, surah, ayah, token_index
            FROM quran_ayah_lemma_location
            WHERE word_simple IS NULL OR word_diacritic IS NULL
            LIMIT ?
            """,
            (args.limit,),
        ).fetchall()
        if not rows:
            break

        for rid, surah, ayah, token_index in rows:
            word_simple = None
            word_diacritic = None
            unit_id = f"U:QURAN:{surah}:{ayah}"
            for pos in (token_index - 1, token_index):
                if pos < 0:
                    continue
                token = tokens.get((unit_id, pos))
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
                SET word_simple = ?,
                    word_diacritic = ?
                WHERE id = ?
                """,
                (word_simple or '', word_diacritic or '', rid),
            )
        conn.commit()
        total += len(rows)
        print('processed', total)

    conn.close()
    print('done')


if __name__ == '__main__':
    main()
