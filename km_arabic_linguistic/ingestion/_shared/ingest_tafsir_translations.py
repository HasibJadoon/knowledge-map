#!/usr/bin/env python3
"""
ingest_tafsir_translations.py
─────────────────────────────
Reads the QUL .db files from:
  km_arabic_linguistic/Tafsirs/          (10 Arabic tafsirs)
  km_arabic_linguistic/Translations/     (2 English translations)

Produces SQL files ready for:
  wrangler d1 execute km_quran --remote --file <file>

Tables populated (km_quran):
  qr_surahs              — all 114 surahs
  qr_scholar_profiles    — one row per scholar
  qr_scholar_works       — one work per tafsir
  qr_tafsir_entries      — per-ayah/group tafsir text (HTML stripped)
  qr_translation_sources — one row per translation
  qr_translations        — 6236 rows × translations

Usage:
  cd ingestion/
  python3 _shared/ingest_tafsir_translations.py
  # then deploy:
  for f in _shared/tafsir_translation_sql/*.sql; do
      wrangler d1 execute km_quran --remote --file "$f" \
          --config ../../workers/quran/wrangler.toml
  done
"""
from __future__ import annotations
import hashlib, html, json, re, sqlite3, sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE         = Path(__file__).resolve().parent.parent
TAFSIR_DIR   = BASE.parent / "Tafsirs"
TRANS_DIR    = BASE.parent / "Translations"
OUT_DIR      = BASE / "_shared/tafsir_translation_sql"
OUT_DIR.mkdir(exist_ok=True)
WRANGLER_CFG = BASE.parent.parent / "workers/quran/wrangler.toml"

# ── Scholar / work metadata ────────────────────────────────────────────────────
# (db_stem, scholar_id_key, name_ar, name_en, birth_h, death_h, birth_ce, death_ce, madhab, title_ar, title_en, work_type, volumes)
TAFSIR_META = [
    ("ar-tafsir-al-tabari",
     "TABARI",
     "محمد بن جرير الطبري", "al-Tabari",
     224, 310, 839, 923, "sunni",
     "جامع البيان في تأويل القرآن", "Jami al-Bayan", "tafsir", 26),

    ("ar-tafsir-ibn-kathir",
     "IBN_KATHIR",
     "إسماعيل بن عمر بن كثير", "Ibn Kathir",
     701, 774, 1301, 1373, "sunni",
     "تفسير القرآن العظيم", "Tafsir al-Quran al-Azim", "tafsir", 8),

    ("al-kashshaf-al-zamakhshari",
     "ZAMAKHSHARI",
     "محمود بن عمر الزمخشري", "al-Zamakhshari",
     467, 538, 1075, 1144, "mutazili",
     "الكشاف عن حقائق التنزيل", "al-Kashshaf", "tafsir", 4),

    ("tafsir-al-razi",
     "RAZI",
     "فخر الدين الرازي", "Fakhr al-Din al-Razi",
     544, 606, 1150, 1210, "ashari",
     "مفاتيح الغيب", "Mafatih al-Ghayb", "tafsir", 32),

    ("al-bahr-al-muhit",
     "ABU_HAYYAN",
     "أبو حيان الأندلسي", "Abu Hayyan al-Andalusi",
     654, 745, 1256, 1344, "sunni",
     "البحر المحيط", "al-Bahr al-Muhit", "tafsir", 8),

    ("al-muharrar-al-wajiz-ibn-atiyyah",
     "IBN_ATIYYA",
     "عبد الحق بن غالب ابن عطية", "Ibn Atiyya al-Andalusi",
     480, 542, 1088, 1147, "maliki",
     "المحرر الوجيز في تفسير الكتاب العزيز", "al-Muharrar al-Wajiz", "tafsir", 6),

    ("ar-tafseer-tahrir-al-tanwir",
     "IBN_ASHUR",
     "محمد الطاهر بن عاشور", "Ibn Ashur",
     None, None, 1879, 1973, "maliki",
     "التحرير والتنوير", "al-Tahrir wa al-Tanwir", "tafsir", 30),

    ("tafsir-al-alusi",
     "ALUSI",
     "شهاب الدين الآلوسي", "al-Alusi",
     1217, 1270, 1802, 1854, "sunni",
     "روح المعاني في تفسير القرآن العظيم", "Ruh al-Maani", "tafsir", 16),

    ("al-jadwal-fi-i-rab-al-quran",
     "SAFI",
     "محمود صافي", "Mahmud Safi",
     None, None, 1905, 1980, "sunni",
     "الجدول في إعراب القرآن", "al-Jadwal fi Irab al-Quran", "irab", 32),

    ("i-rab-al-quran-li-al-darwish",
     "DARWISH",
     "محيي الدين درويش", "Muhyi al-Din Darwish",
     None, None, 1920, 2012, "sunni",
     "إعراب القرآن الكريم وبيانه", "Irab al-Quran (Darwish)", "irab", 9),
]

TRANSLATION_META = [
    ("en-haleem-with-footnote-tags",
     "en-haleem",
     "M.A.S. Abdel Haleem",
     "The Qur'an — Oxford World's Classics (Abdel Haleem)", 1),

    ("en-asad-simple",
     "en-asad",
     "Muhammad Asad",
     "The Message of the Qur'an (Muhammad Asad)", 0),

    ("en-sahih-international",
     "en-sahih",
     "Saheeh International",
     "The Qur'an — Saheeh International", 0),
]

# ── All 114 surahs ─────────────────────────────────────────────────────────────
SURAHS = [
    (1,"الفاتحة","Al-Fatiha","Al-Fatiha","makki",7,1,1,5),
    (2,"البقرة","Al-Baqarah","Al-Baqarah","madani",286,1,2,87),
    (3,"آل عمران","Al-Imran","Al-Imran","madani",200,3,50,89),
    (4,"النساء","An-Nisa","An-Nisa","madani",176,5,77,92),
    (5,"المائدة","Al-Maidah","Al-Maidah","madani",120,6,106,112),
    (6,"الأنعام","Al-Anam","Al-Anam","makki",165,7,128,55),
    (7,"الأعراف","Al-Araf","Al-Araf","makki",206,8,151,39),
    (8,"الأنفال","Al-Anfal","Al-Anfal","madani",75,9,177,88),
    (9,"التوبة","At-Tawbah","At-Tawbah","madani",129,10,187,113),
    (10,"يونس","Yunus","Yunus","makki",109,11,208,51),
    (11,"هود","Hud","Hud","makki",123,11,221,52),
    (12,"يوسف","Yusuf","Yusuf","makki",111,12,235,53),
    (13,"الرعد","Ar-Ra'd","Ar-Ra'd","madani",43,13,249,96),
    (14,"إبراهيم","Ibrahim","Ibrahim","makki",52,13,255,72),
    (15,"الحجر","Al-Hijr","Al-Hijr","makki",99,14,262,54),
    (16,"النحل","An-Nahl","An-Nahl","makki",128,14,267,70),
    (17,"الإسراء","Al-Isra","Al-Isra","makki",111,15,282,50),
    (18,"الكهف","Al-Kahf","Al-Kahf","makki",110,15,293,69),
    (19,"مريم","Maryam","Maryam","makki",98,16,306,44),
    (20,"طه","Ta-Ha","Ta-Ha","makki",135,16,312,45),
    (21,"الأنبياء","Al-Anbiya","Al-Anbiya","makki",112,17,322,73),
    (22,"الحج","Al-Hajj","Al-Hajj","madani",78,17,332,103),
    (23,"المؤمنون","Al-Muminun","Al-Muminun","makki",118,18,342,74),
    (24,"النور","An-Nur","An-Nur","madani",64,18,350,102),
    (25,"الفرقان","Al-Furqan","Al-Furqan","makki",77,18,359,42),
    (26,"الشعراء","Ash-Shuara","Ash-Shuara","makki",227,19,367,47),
    (27,"النمل","An-Naml","An-Naml","makki",93,19,377,48),
    (28,"القصص","Al-Qasas","Al-Qasas","makki",88,20,385,49),
    (29,"العنكبوت","Al-Ankabut","Al-Ankabut","makki",69,20,396,85),
    (30,"الروم","Ar-Rum","Ar-Rum","makki",60,21,404,84),
    (31,"لقمان","Luqman","Luqman","makki",34,21,411,57),
    (32,"السجدة","As-Sajdah","As-Sajdah","makki",30,21,415,75),
    (33,"الأحزاب","Al-Ahzab","Al-Ahzab","madani",73,21,418,90),
    (34,"سبأ","Saba","Saba","makki",54,22,428,58),
    (35,"فاطر","Fatir","Fatir","makki",45,22,434,43),
    (36,"يس","Ya-Sin","Ya-Sin","makki",83,22,440,41),
    (37,"الصافات","As-Saffat","As-Saffat","makki",182,23,446,56),
    (38,"ص","Sad","Sad","makki",88,23,453,38),
    (39,"الزمر","Az-Zumar","Az-Zumar","makki",75,23,458,59),
    (40,"غافر","Ghafir","Ghafir","makki",85,24,467,60),
    (41,"فصلت","Fussilat","Fussilat","makki",54,24,477,61),
    (42,"الشورى","Ash-Shura","Ash-Shura","makki",53,25,483,62),
    (43,"الزخرف","Az-Zukhruf","Az-Zukhruf","makki",89,25,489,63),
    (44,"الدخان","Ad-Dukhan","Ad-Dukhan","makki",59,25,496,64),
    (45,"الجاثية","Al-Jathiyah","Al-Jathiyah","makki",37,25,499,65),
    (46,"الأحقاف","Al-Ahqaf","Al-Ahqaf","makki",35,26,502,66),
    (47,"محمد","Muhammad","Muhammad","madani",38,26,507,95),
    (48,"الفتح","Al-Fath","Al-Fath","madani",29,26,511,111),
    (49,"الحجرات","Al-Hujurat","Al-Hujurat","madani",18,26,515,106),
    (50,"ق","Qaf","Qaf","makki",45,26,518,34),
    (51,"الذاريات","Adh-Dhariyat","Adh-Dhariyat","makki",60,26,520,67),
    (52,"الطور","At-Tur","At-Tur","makki",49,27,523,76),
    (53,"النجم","An-Najm","An-Najm","makki",62,27,526,23),
    (54,"القمر","Al-Qamar","Al-Qamar","makki",55,27,528,37),
    (55,"الرحمن","Ar-Rahman","Ar-Rahman","madani",78,27,531,97),
    (56,"الواقعة","Al-Waqiah","Al-Waqiah","makki",96,27,534,46),
    (57,"الحديد","Al-Hadid","Al-Hadid","madani",29,27,537,94),
    (58,"المجادلة","Al-Mujadila","Al-Mujadila","madani",22,28,542,105),
    (59,"الحشر","Al-Hashr","Al-Hashr","madani",24,28,545,101),
    (60,"الممتحنة","Al-Mumtahanah","Al-Mumtahanah","madani",13,28,549,91),
    (61,"الصف","As-Saf","As-Saf","madani",14,28,551,109),
    (62,"الجمعة","Al-Jumuah","Al-Jumuah","madani",11,28,553,110),
    (63,"المنافقون","Al-Munafiqun","Al-Munafiqun","madani",11,28,554,104),
    (64,"التغابن","At-Taghabun","At-Taghabun","madani",18,28,556,108),
    (65,"الطلاق","At-Talaq","At-Talaq","madani",12,28,558,99),
    (66,"التحريم","At-Tahrim","At-Tahrim","madani",12,28,560,107),
    (67,"الملك","Al-Mulk","Al-Mulk","makki",30,29,562,77),
    (68,"القلم","Al-Qalam","Al-Qalam","makki",52,29,564,2),
    (69,"الحاقة","Al-Haqqah","Al-Haqqah","makki",52,29,566,78),
    (70,"المعارج","Al-Maarij","Al-Maarij","makki",44,29,568,79),
    (71,"نوح","Nuh","Nuh","makki",28,29,570,71),
    (72,"الجن","Al-Jinn","Al-Jinn","makki",28,29,572,40),
    (73,"المزمل","Al-Muzzammil","Al-Muzzammil","makki",20,29,574,3),
    (74,"المدثر","Al-Muddaththir","Al-Muddaththir","makki",56,29,575,4),
    (75,"القيامة","Al-Qiyamah","Al-Qiyamah","makki",40,29,577,31),
    (76,"الإنسان","Al-Insan","Al-Insan","madani",31,29,578,98),
    (77,"المرسلات","Al-Mursalat","Al-Mursalat","makki",50,29,580,33),
    (78,"النبأ","An-Naba","An-Naba","makki",40,30,582,80),
    (79,"النازعات","An-Naziat","An-Naziat","makki",46,30,583,81),
    (80,"عبس","Abasa","Abasa","makki",42,30,585,24),
    (81,"التكوير","At-Takwir","At-Takwir","makki",29,30,586,7),
    (82,"الإنفطار","Al-Infitar","Al-Infitar","makki",19,30,587,82),
    (83,"المطففين","Al-Mutaffifin","Al-Mutaffifin","makki",36,30,587,86),
    (84,"الإنشقاق","Al-Inshiqaq","Al-Inshiqaq","makki",25,30,588,83),
    (85,"البروج","Al-Buruj","Al-Buruj","makki",22,30,590,27),
    (86,"الطارق","At-Tariq","At-Tariq","makki",17,30,591,36),
    (87,"الأعلى","Al-Ala","Al-Ala","makki",19,30,591,8),
    (88,"الغاشية","Al-Ghashiyah","Al-Ghashiyah","makki",26,30,592,68),
    (89,"الفجر","Al-Fajr","Al-Fajr","makki",30,30,593,10),
    (90,"البلد","Al-Balad","Al-Balad","makki",20,30,594,35),
    (91,"الشمس","Ash-Shams","Ash-Shams","makki",15,30,595,26),
    (92,"الليل","Al-Layl","Al-Layl","makki",21,30,595,9),
    (93,"الضحى","Ad-Duha","Ad-Duha","makki",11,30,596,11),
    (94,"الشرح","Ash-Sharh","Ash-Sharh","makki",8,30,596,12),
    (95,"التين","At-Tin","At-Tin","makki",8,30,597,28),
    (96,"العلق","Al-Alaq","Al-Alaq","makki",19,30,597,1),
    (97,"القدر","Al-Qadr","Al-Qadr","makki",5,30,598,25),
    (98,"البينة","Al-Bayyinah","Al-Bayyinah","madani",8,30,598,100),
    (99,"الزلزلة","Az-Zalzalah","Az-Zalzalah","madani",8,30,599,93),
    (100,"العاديات","Al-Adiyat","Al-Adiyat","makki",11,30,599,14),
    (101,"القارعة","Al-Qariah","Al-Qariah","makki",11,30,600,30),
    (102,"التكاثر","At-Takathur","At-Takathur","makki",8,30,600,16),
    (103,"العصر","Al-Asr","Al-Asr","makki",3,30,601,13),
    (104,"الهمزة","Al-Humazah","Al-Humazah","makki",9,30,601,32),
    (105,"الفيل","Al-Fil","Al-Fil","makki",5,30,601,19),
    (106,"قريش","Quraysh","Quraysh","makki",4,30,602,29),
    (107,"الماعون","Al-Maun","Al-Maun","makki",7,30,602,17),
    (108,"الكوثر","Al-Kawthar","Al-Kawthar","makki",3,30,602,15),
    (109,"الكافرون","Al-Kafirun","Al-Kafirun","makki",6,30,603,18),
    (110,"النصر","An-Nasr","An-Nasr","madani",3,30,603,114),
    (111,"المسد","Al-Masad","Al-Masad","makki",5,30,603,6),
    (112,"الإخلاص","Al-Ikhlas","Al-Ikhlas","makki",4,30,604,22),
    (113,"الفلق","Al-Falaq","Al-Falaq","makki",5,30,604,20),
    (114,"الناس","An-Nas","An-Nas","makki",6,30,604,21),
]

# ── Helpers ────────────────────────────────────────────────────────────────────
def sha1(prefix, *parts):
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode()).hexdigest()[:24]

def sv(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

HTML_TAG  = re.compile(r'<[^>]+>')
MULTI_SPC = re.compile(r'\s+')

def strip_html(text: str) -> str:
    if not text: return ""
    text = html.unescape(text)
    text = HTML_TAG.sub(' ', text)
    text = MULTI_SPC.sub(' ', text).strip()
    return text

def parse_ayah_key(key: str) -> tuple[int, int]:
    """'12:3' → (12, 3)"""
    parts = str(key).split(":")
    return int(parts[0]), int(parts[1])

# ── SQL writer ─────────────────────────────────────────────────────────────────
class SqlWriter:
    MAX_BYTES = 3_800_000  # 3.8 MB per file (D1 safe limit)

    def __init__(self, prefix: str):
        self.prefix = prefix
        self.idx = 1
        self.buf: list[str] = []
        self.buf_bytes = 0
        self.total_stmts = 0
        self.files: list[Path] = []

    def add(self, stmt: str):
        stmt = stmt.rstrip() + "\n"
        b = len(stmt.encode("utf-8"))
        if self.buf and self.buf_bytes + b > self.MAX_BYTES:
            self._flush()
        self.buf.append(stmt)
        self.buf_bytes += b
        self.total_stmts += 1

    def _flush(self):
        if not self.buf: return
        p = OUT_DIR / f"{self.prefix}-{self.idx:04d}.sql"
        p.write_text("".join(self.buf), encoding="utf-8")
        self.files.append(p)
        self.idx += 1
        self.buf = []
        self.buf_bytes = 0

    def close(self) -> list[Path]:
        self._flush()
        return self.files


# ══════════════════════════════════════════════════════════════════════════════
def gen_surahs(w: SqlWriter):
    print("  Generating qr_surahs (114 rows)...")
    for sid, name_ar, name_en, name_tr, rev, ayah_count, juz, page, order in SURAHS:
        w.add(
            f"INSERT OR IGNORE INTO qr_surahs "
            f"(id,name_ar,name_en,name_transliteration,revelation_type,ayah_count,juz_start,page_start,order_revelation) "
            f"VALUES ({sid},{sv(name_ar)},{sv(name_en)},{sv(name_tr)},{sv(rev)},{ayah_count},{juz},{page},{order});"
        )


def gen_tafsirs(w: SqlWriter):
    print(f"\n  Generating tafsir entries from {len(TAFSIR_META)} sources...")

    for (stem, sch_key, name_ar, name_en, birth_h, death_h, birth_ce, death_ce,
         madhab, title_ar, title_en, work_type, volumes) in TAFSIR_META:

        db_path = TAFSIR_DIR / f"{stem}.db"
        if not db_path.exists():
            print(f"    SKIP (not found): {db_path.name}")
            continue

        sch_id  = f"QR:SCH:{sch_key}"
        work_id = f"QR:WORK:{sch_key}:{stem.upper()[:12]}"

        # Scholar profile
        w.add(
            f"INSERT OR IGNORE INTO qr_scholar_profiles "
            f"(id,name_ar,name_en,birth_year_hijri,death_year_hijri,birth_year_ce,death_year_ce,"
            f"era,madhab,specialization) "
            f"VALUES ({sv(sch_id)},{sv(name_ar)},{sv(name_en)},"
            f"{sv(birth_h)},{sv(death_h)},{sv(birth_ce)},{sv(death_ce)},"
            f"{sv('classical' if (death_ce or 9999) < 1800 else 'modern')},"
            f"{sv(madhab)},{sv(work_type)});"
        )

        # Scholar work
        w.add(
            f"INSERT OR IGNORE INTO qr_scholar_works "
            f"(id,scholar_id,title_ar,title_en,work_type,composition_year_ce,volumes) "
            f"VALUES ({sv(work_id)},{sv(sch_id)},{sv(title_ar)},{sv(title_en)},"
            f"{sv(work_type)},{sv(death_ce)},{volumes});"
        )

        # Tafsir entries — deduplicate on group_ayah_key
        cx = sqlite3.connect(db_path)
        rows = cx.execute(
            "SELECT group_ayah_key, from_ayah, to_ayah, text "
            "FROM tafsir GROUP BY group_ayah_key ORDER BY from_ayah"
        ).fetchall()
        cx.close()

        n = 0
        for group_key, from_key, to_key, raw_text in rows:
            try:
                surah, ayah_from = parse_ayah_key(from_key or group_key)
                _, ayah_to       = parse_ayah_key(to_key   or from_key or group_key)
            except Exception:
                continue

            clean = strip_html(raw_text)
            if len(clean) < 20:
                continue
            # D1 SQLITE_TOOBIG: cap individual entry at 30,000 chars
            if len(clean) > 30000:
                clean = clean[:30000] + "…"

            entry_id = sha1("QR:TE:", sch_key, surah, ayah_from, ayah_to)
            entry_type = "irab" if work_type == "irab" else "explanation"

            w.add(
                f"INSERT OR IGNORE INTO qr_tafsir_entries "
                f"(id,surah,ayah_from,ayah_to,entry_type,scholar_id,work_id,content_ar) "
                f"VALUES ({sv(entry_id)},{surah},{ayah_from},{ayah_to},"
                f"{sv(entry_type)},{sv(sch_id)},{sv(work_id)},{sv(clean)});"
            )
            n += 1

        print(f"    ✓ {stem:<44}  {n:>5} entries")


def gen_translations(w: SqlWriter):
    print(f"\n  Generating translations from {len(TRANSLATION_META)} sources...")

    for stem, source_code, translator, edition, is_default in TRANSLATION_META:
        db_path = TRANS_DIR / f"{stem}.db"
        if not db_path.exists():
            print(f"    SKIP (not found): {db_path.name}")
            continue

        src_id = f"QR:TRANS:{source_code.upper().replace('-','_')}"

        # Translation source
        w.add(
            f"INSERT OR IGNORE INTO qr_translation_sources "
            f"(id,source_code,translator_name,language,edition,is_default) "
            f"VALUES ({sv(src_id)},{sv(source_code)},{sv(translator)},'en',{sv(edition)},{is_default});"
        )

        cx = sqlite3.connect(db_path)
        # Check whether this DB has footnotes column
        has_footnotes = any(
            row[1] == 'footnotes'
            for row in cx.execute("PRAGMA table_info(translation)").fetchall()
        )
        if has_footnotes:
            rows = cx.execute("SELECT sura, ayah, text, footnotes FROM translation ORDER BY sura, ayah").fetchall()
        else:
            rows = [(r[0], r[1], r[2], None) for r in cx.execute("SELECT sura, ayah, text FROM translation ORDER BY sura, ayah").fetchall()]
        cx.close()

        n = 0
        for sura, ayah, text, footnotes in rows:
            if not text: continue
            # Strip surrounding quotes if present
            text = text.strip().strip('"').strip()
            if len(text) > 10000:
                text = text[:10000] + "…"
            # Parse footnotes JSON → markdown
            fn_md = None
            if footnotes and footnotes != '{}':
                try:
                    fn_data = json.loads(footnotes)
                    if fn_data:
                        fn_md = "; ".join(f"[{k}] {v}" for k, v in fn_data.items())
                except Exception:
                    pass

            tid = sha1("QR:TR:", src_id, sura, ayah)
            w.add(
                f"INSERT OR IGNORE INTO qr_translations "
                f"(id,source_id,surah,ayah,translation_text,footnote_md) "
                f"VALUES ({sv(tid)},{sv(src_id)},{sura},{ayah},{sv(text)},{sv(fn_md)});"
            )
            n += 1

        print(f"    ✓ {stem:<44}  {n:>5} verses")


# ══════════════════════════════════════════════════════════════════════════════
def main():
    print("\n" + "═"*60)
    print("  K-Maps Tafsir + Translation Ingestion")
    print("═"*60)

    w = SqlWriter("tafsir-translation")

    gen_surahs(w)
    gen_tafsirs(w)
    gen_translations(w)

    files = w.close()

    print(f"\n{'─'*60}")
    print(f"  Total SQL statements : {w.total_stmts:,}")
    print(f"  SQL files generated  : {len(files)}")
    for f in files:
        print(f"    {f.name}  ({f.stat().st_size // 1024} KB)")

    print(f"\n{'─'*60}")
    print("  Deploy to km_quran remote D1:")
    print(f"  (run `wrangler login` first if needed)\n")

    cfg = WRANGLER_CFG
    for f in files:
        print(f"  wrangler d1 execute km_quran --remote --file {f} --config {cfg}")

    # Write a deploy shell script
    deploy_sh = OUT_DIR / "deploy.sh"
    lines = ["#!/bin/bash", "set -e", f"CFG={cfg}", ""]
    for f in files:
        lines.append(f"echo 'Deploying {f.name}...'")
        lines.append(f"wrangler d1 execute km_quran --remote --file '{f}' --config \"$CFG\"")
    lines.append("\necho 'Done.'")
    deploy_sh.write_text("\n".join(lines))
    deploy_sh.chmod(0o755)
    print(f"\n  Or run: bash {deploy_sh}")


if __name__ == "__main__":
    main()
