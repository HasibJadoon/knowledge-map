#!/usr/bin/env python3
"""
gen_s12_seed.py — Generate all SQL seeds for a complete Surah 12 use case.

Outputs (all ready to wrangler d1 execute):
  out/s12_qr_spine.sql        → km_quran  (qr_surahs, qr_ayah, qr_word_occurrences, qr_lemmas, qr_lemma_occurrences)
  out/s12_al_roots_lemmas.sql → km_arabic_linguistic (ar_ling_roots, ar_ling_lemmas, ar_ling_lemma_root_links)
  out/s12_al_taxonomy.sql     → km_arabic_linguistic (ar_ling_nahw_concepts, ar_ling_balagha_concepts)
  out/s12_al_claims_irab.sql  → km_arabic_linguistic (ar_ling_source_claims — irab layer, normalized)
  out/s12_al_claims_balagha.sql → km_arabic_linguistic (ar_ling_source_claims — balagha layer, normalized)

Usage:
    python3 s12/scripts/gen_seed.py
"""
from __future__ import annotations
import hashlib, json, sqlite3
from pathlib import Path
from collections import defaultdict

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE   = Path(__file__).resolve().parents[2]           # ingestion/
SPINE  = BASE / "صرف/kmaps-sarf/data/raw/spine/spine.sqlite"
OUT    = Path(__file__).resolve().parents[1] / "sql"   # s12/sql/
OUT.mkdir(exist_ok=True)

CLAIMS_IRAB    = BASE / "اعراب/kmaps-irab/data/staging/claims"
CLAIMS_BALAGHA = BASE / "بلاغة/kmaps-balagha/data/staging/claims"

SURAH = 12

# ── Helpers ────────────────────────────────────────────────────────────────────
def sha1(prefix, *parts):
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode()).hexdigest()[:24]

def sv(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'","''") + "'"
    return "'" + str(v).replace("'","''") + "'"

def write_sql(name: str, stmts: list[str]):
    path = OUT / name
    path.write_text("\n".join(stmts) + "\n", encoding="utf-8")
    kb = path.stat().st_size // 1024
    print(f"  ✓ {name:45s}  {len(stmts):>5} stmts  {kb:>5} KB")

# ── 1. QR SPINE (km_quran tables) ─────────────────────────────────────────────
def gen_qr_spine():
    cx = sqlite3.connect(SPINE)
    cx.row_factory = sqlite3.Row
    words = cx.execute(
        "SELECT * FROM qr_word_occurrences WHERE surah=? ORDER BY ayah, word_index", (SURAH,)
    ).fetchall()

    stmts = []

    # qr_surahs — Surah 12 row
    stmts.append(
        f"INSERT OR IGNORE INTO qr_surahs "
        f"(id, name_ar, name_en, name_transliteration, revelation_type, ayah_count, juz_start, page_start, order_revelation) "
        f"VALUES (12,'يوسف','Yusuf','Yusuf','makki',111,12,235,53);"
    )

    # Group words by ayah → build qr_ayah rows
    ayah_words = defaultdict(list)
    for w in words:
        ayah_words[w["ayah"]].append(dict(w))

    for ayah_no, aws in sorted(ayah_words.items()):
        text = " ".join(w["word_text"] for w in aws if w.get("word_text"))
        text_bare = " ".join((w.get("word_text_bare") or w["word_text"]) for w in aws if w.get("word_text"))
        stmts.append(
            f"INSERT OR IGNORE INTO qr_ayah "
            f"(id, surah, ayah, text_uthmani, text_uthmani_clean, text_bare, text) "
            f"VALUES ({sv(f'QR:AYAH:{SURAH}:{ayah_no}')},{SURAH},{ayah_no},{sv(text)},{sv(text)},{sv(text_bare)},{sv(text)});"
        )

    # qr_word_occurrences — copy from spine
    seen_lemmas: dict[str, str] = {}  # lemma_text → qr_lemma id
    for w in words:
        d = dict(w)
        wid = d.get("id") or sha1("QR:WO:", SURAH, d["ayah"], d["word_index"])
        stmts.append(
            f"INSERT OR IGNORE INTO qr_word_occurrences "
            f"(id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag) "
            f"VALUES ({sv(wid)},{SURAH},{d['ayah']},{d['word_index']},"
            f"{sv(d.get('word_text'))},{sv(d.get('word_text_bare'))},{sv(d.get('root'))},"
            f"{sv(d.get('lemma'))},{sv(d.get('pos'))},{sv(d.get('morphology_tag'))});"
        )
        # Collect unique lemmas
        lt = d.get("lemma")
        if lt and lt not in seen_lemmas:
            lid = sha1("QR:LEM:", lt)
            seen_lemmas[lt] = (lid, d.get("root"))

    # qr_lemmas
    for lt, (lid, root) in seen_lemmas.items():
        stmts.append(
            f"INSERT OR IGNORE INTO qr_lemmas (id, lemma_text, root) "
            f"VALUES ({sv(lid)},{sv(lt)},{sv(root)});"
        )

    # qr_lemma_occurrences — link each word to its lemma
    for w in words:
        d = dict(w)
        lt = d.get("lemma")
        if not lt: continue
        lid, _ = seen_lemmas[lt]
        wid = d.get("id") or sha1("QR:WO:", SURAH, d["ayah"], d["word_index"])
        lo_id = sha1("QR:LO:", lid, wid)
        stmts.append(
            f"INSERT OR IGNORE INTO qr_lemma_occurrences "
            f"(id, lemma_id, surah, ayah, word_index, word_occurrence_id) "
            f"VALUES ({sv(lo_id)},{sv(lid)},{SURAH},{d['ayah']},{d['word_index']},{sv(wid)});"
        )

    cx.close()
    write_sql("s12_qr_spine.sql", stmts)
    return seen_lemmas

# ── 2. AL ROOTS + LEMMAS (km_arabic_linguistic) ───────────────────────────────
def gen_al_roots_lemmas(seen_lemmas: dict):
    cx = sqlite3.connect(SPINE)
    cx.row_factory = sqlite3.Row
    words = cx.execute(
        "SELECT DISTINCT root, lemma, pos FROM qr_word_occurrences WHERE surah=? AND root IS NOT NULL",
        (SURAH,)
    ).fetchall()
    cx.close()

    stmts = []
    seen_roots: set[str] = set()

    # ar_ling_roots
    for w in words:
        root = w["root"]
        if not root or root in seen_roots: continue
        seen_roots.add(root)
        rid = sha1("AL:ROOT:", root)
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_roots "
            f"(id, root_text, root_text_bare, root_type, frequency_quran) "
            f"VALUES ({sv(rid)},{sv(root)},{sv(root)},'sound',0);"
        )

    # ar_ling_lemmas + ar_ling_lemma_root_links
    seen_lem: set[str] = set()
    cx = sqlite3.connect(SPINE)
    cx.row_factory = sqlite3.Row
    lem_rows = cx.execute(
        "SELECT DISTINCT lemma, root, pos FROM qr_word_occurrences WHERE surah=? AND lemma IS NOT NULL",
        (SURAH,)
    ).fetchall()
    cx.close()

    for row in lem_rows:
        lt, root, pos = row["lemma"], row["root"], row["pos"]
        if not lt or lt in seen_lem: continue
        seen_lem.add(lt)
        lid = sha1("AL:LEM:", lt)
        rid = sha1("AL:ROOT:", root) if root else None

        # Map POS tag → part_of_speech
        pos_map = {"N":"noun","V":"verb","ADJ":"adjective","ADV":"adverb","P":"particle",
                   "PN":"proper_noun","PRON":"pronoun","REL":"particle","CONJ":"particle",
                   "DEM":"pronoun","T":"particle","INL":"particle","DET+N":"noun"}
        part = pos_map.get(pos, "noun")

        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_lemmas "
            f"(id, root_id, lemma_text, lemma_text_bare, part_of_speech, is_quran_word) "
            f"VALUES ({sv(lid)},{sv(rid)},{sv(lt)},{sv(lt)},{sv(part)},1);"
        )
        if rid:
            lrl_id = sha1("AL:LRL:", lid, rid)
            stmts.append(
                f"INSERT OR IGNORE INTO ar_ling_lemma_root_links (id, lemma_id, root_id, link_type) "
                f"VALUES ({sv(lrl_id)},{sv(lid)},{sv(rid)},'primary');"
            )

    write_sql("s12_al_roots_lemmas.sql", stmts)

# ── 3. AL TAXONOMY (nahw_concepts + balagha_concepts) ─────────────────────────
def gen_al_taxonomy():
    stmts = []

    # ── Nahw (grammar) concepts ───────────────────────────────────────────────
    # Container
    nahw_container_id = sha1("AL:DC:", "nahw-core")
    stmts.append(
        f"INSERT OR IGNORE INTO ar_ling_discipline_containers "
        f"(id, name_ar, name_en, discipline) "
        f"VALUES ({sv(nahw_container_id)},'النحو','Arabic Grammar','nahw');"
    )

    NAHW_CONCEPTS = [
        # (key, name_ar, name_en, concept_type, parent_key)
        ("mubtada",      "مُبْتَدَأ",          "Subject (mubtada)",          "irab_role",  None),
        ("khabar",       "خَبَر",              "Predicate (khabar)",         "irab_role",  None),
        ("fail",         "فَاعِل",             "Subject of verb (fail)",      "irab_role",  None),
        ("mafool_bihi",  "مَفْعُول بِه",       "Object (mafool bihi)",        "irab_role",  None),
        ("hal",          "حَال",               "Circumstantial (hal)",        "irab_role",  None),
        ("tamyeez",      "تَمْيِيز",           "Specification (tamyeez)",     "irab_role",  None),
        ("badal",        "بَدَل",              "Substitution (badal)",        "irab_role",  None),
        ("nat",          "نَعْت/صِفَة",        "Adjective (naat)",            "irab_role",  None),
        ("tawkeed",      "تَوْكِيد",           "Emphasis (tawkeed)",          "irab_role",  None),
        ("atf",          "عَطْف",              "Conjunction (atf)",           "irab_role",  None),
        ("mudaf",        "مُضَاف",             "Construct (mudaf)",           "irab_role",  None),
        ("mudaf_ilayh",  "مُضَاف إِلَيْه",    "Genitive (mudaf ilayh)",      "irab_role",  None),
        ("zarf_makan",   "ظَرْف مَكَان",       "Locative adverb",             "irab_role",  None),
        ("zarf_zaman",   "ظَرْف زَمَان",       "Temporal adverb",             "irab_role",  None),
        ("taalluq",      "تَعَلُّق",           "Attachment (taalluq)",        "rule",       None),
        ("taqdir",       "تَقْدِير",           "Ellipsis (taqdir)",           "rule",       None),
        ("ikhtilaf_qiraat", "اخْتِلَاف قِرَاءَات", "Qiraat variant",        "rule",       None),
        ("governance",   "عَمَل/إِعْمَال",    "Governance (amal)",           "rule",       None),
    ]
    seen_nahw = {}
    for key, name_ar, name_en, ctype, parent_key in NAHW_CONCEPTS:
        nid = sha1("AL:NC:", key)
        seen_nahw[key] = nid
        pid = seen_nahw.get(parent_key)
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_nahw_concepts "
            f"(id, parent_id, name_ar, name_en, concept_type) "
            f"VALUES ({sv(nid)},{sv(pid)},{sv(name_ar)},{sv(name_en)},{sv(ctype)});"
        )

    # ── Balagha concepts ──────────────────────────────────────────────────────
    balagha_container_id = sha1("AL:DC:", "balagha-core")
    stmts.append(
        f"INSERT OR IGNORE INTO ar_ling_discipline_containers "
        f"(id, name_ar, name_en, discipline) "
        f"VALUES ({sv(balagha_container_id)},'البلاغة','Arabic Rhetoric','balagha');"
    )

    BALAGHA_CONCEPTS = [
        # (key, name_ar, name_en, branch)
        # معاني
        ("taqdim_takhir", "تَقْدِيم وَتَأْخِير", "Fronting & Deferral",          "maani"),
        ("iltifat",       "الِالْتِفَات",         "Shift of Address (iltifat)",   "maani"),
        ("hasr_qasr",     "الْحَصْر وَالْقَصْر", "Restriction (hasr/qasr)",      "maani"),
        ("ijaaz",         "الإِيجَاز",            "Brevity (ijaaz)",              "maani"),
        ("itnaab",        "الإِطْنَاب",           "Amplification (itnaab)",       "maani"),
        ("musawat",       "الْمُسَاوَاة",         "Proportionality (musawat)",    "maani"),
        ("fasl_wasl",     "الْفَصْل وَالْوَصْل", "Asyndeton/Polysyndeton",       "maani"),
        ("tarif_tankir",  "التَّعْرِيف وَالتَّنْكِير", "Definiteness choice",   "maani"),
        ("ijab_inshaa",   "الإِيجَاب وَالإِنْشَاء", "Declarative vs Performative","maani"),
        # بيان
        ("tashbih",       "التَّشْبِيه",          "Simile (tashbih)",             "bayan"),
        ("istiarah",      "الاسْتِعَارَة",        "Metaphor (istiarah)",          "bayan"),
        ("majaz",         "الْمَجَاز",            "Figurative usage (majaz)",     "bayan"),
        ("kinayah",       "الْكِنَايَة",          "Allusion (kinayah)",           "bayan"),
        # بديع
        ("jinas",         "الْجِنَاس",            "Paronomasia (jinas)",          "badi"),
        ("tibaq",         "الطِّبَاق",            "Antithesis (tibaq)",           "badi"),
        ("muqabalah",     "الْمُقَابَلَة",        "Parallelism (muqabalah)",      "badi"),
        ("saj",           "السَّجْع",             "Rhymed prose (saj)",           "badi"),
        ("takrar",        "التَّكْرَار",          "Repetition (takrar)",          "badi"),
        # other
        ("asloob_hakim",  "أُسْلُوب الْحَكِيم",  "Hakim style (wise redirection)","other"),
        ("naktah",        "النُّكْتَة",           "Subtle rhetorical point",      "other"),
        ("surah_movement","حَرَكَة السُّورَة",    "Surah narrative movement",     "other"),
        ("rule_reference","قَاعِدَة بَلَاغِيَّة","Rhetorical rule reference",    "other"),
    ]
    for key, name_ar, name_en, branch in BALAGHA_CONCEPTS:
        bid = sha1("AL:BC:", key)
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_balagha_concepts "
            f"(id, name_ar, name_en, branch, concept_type) "
            f"VALUES ({sv(bid)},{sv(name_ar)},{sv(name_en)},{sv(branch)},'device');"
        )

    write_sql("s12_al_taxonomy.sql", stmts)

# ── 4. AL CLAIMS — irab + balagha (normalized, from existing JSON) ─────────────
VALID_BALAGHA = {
    "taqdim_takhir","iltifat","hasr_qasr","ijaaz","itnaab","musawat",
    "tashbih","istiarah","majaz","kinayah","jinas","tibaq","muqabalah",
    "saj","takrar","asloob_hakim","naktah","surah_movement",
    "fasl_wasl","tarif_tankir","ijab_inshaa","rule_reference"
}
VALID_IRAB = {
    "irab","taalluq","taqdir","qiraat_irab","ikhtilaf_irab","wajh_irab",
    "semantic_effect","rule_reference","dirasat_note"
}
BALAGHA_NORM = {
    "maani":"ijaaz","معاني":"ijaaz","بديع":"jinas","جناس":"jinas",
    "badi:jinas":"jinas","bayan":"tashbih","بيان":"tashbih",
    "مقابلة":"muqabalah","badi":"tibaq","ijaz":"ijaaz",
    "muaqabalah":"muqabalah","mucabalah":"muqabalah",
    "mukabalah / parallelism":"muqabalah",
    "tibaq / muqabalah (antithesis / contrast)":"tibaq",
    "طباق/مقابلة":"tibaq","مقابلة/طباق (سنابل خضر ويابسات)":"muqabalah",
    "التفات":"iltifat","iltifat (shift in address / vocative)":"iltifat",
    "الالتفات (التبدّل في المتكلم / إلتفات)":"iltifat",
    "حصر/قصر (hasr_qasr)":"hasr_qasr",
    "تشبيه / تصوير مجازي":"tashbih",
    "استعارة/تشخيص (تجسيد النفس كفاعل)":"istiarah",
    "أسلوب حكيم / حركة السرد":"asloob_hakim",
    "أسلوب حكيم (استئناف بياني)":"asloob_hakim",
    "أسلوب إنشائي / أسلوب الأمر (حكمي)":"ijab_inshaa",
    "استفهام إنشائي / إنشائيّ مقنع":"ijab_inshaa",
    "تحرك السورة / انتقال سردي":"surah_movement",
    "تحريك موضوعي/مَوْضِع السورة":"surah_movement",
    "surah_movement (تأطير/إحالة سياقية)":"surah_movement",
    "use_of_إِنَّ_for_emphasis":"ijab_inshaa",
    "توكيد بـ(إِنَّ ... لَ)":"ijab_inshaa",
    "توكيد/تصحيح بالمقابلة (استدراك بـ «بل») / بلاغة التصويب":"muqabalah",
    "kinayah (excuse/indirect attribution)":"kinayah",
    "تمييز/ترتيب الوصف (اقتصاد اللفظ)":"ijaaz",
    "جناس (تجانس لفظي)":"jinas",
    "تنبيه":"rule_reference","إسلاف جواب":"rule_reference",
    "معاني (إعجاز/إيجاز)":"ijaaz","بديع (مقابلة)":"muqabalah",
}
IRAB_NORM = {"qiraat":"qiraat_irab","ikhtilaf":"ikhtilaf_irab"}

def normalize_ct(ct: str, layer: str) -> str | None:
    norm = BALAGHA_NORM if layer == "balagha" else IRAB_NORM
    valid = VALID_BALAGHA if layer == "balagha" else VALID_IRAB
    ct = norm.get(ct, ct)
    if ct in valid: return ct
    # fuzzy fallback
    for k, v in norm.items():
        if k in ct or ct in k: return v
    return None  # drop

def gen_al_claims(layer: str, claims_dir: Path):
    files = sorted(claims_dir.glob("12_*.json"))
    stmts = []
    run_id = sha1(f"AL:RUN:{layer.upper()}:", "S12", "seed-v2")
    n_ok = n_drop = 0

    for f in files:
        data = json.loads(f.read_text())
        s, a = [int(x) for x in data["ayah_key"].split(":")]
        claims = data["result"].get("claims", [])

        for claim in claims:
            ct = claim.get("claim_type", "")
            ct_norm = normalize_ct(ct, layer)
            if not ct_norm:
                n_drop += 1
                continue

            wi = int(claim.get("word_index") or 1)
            src = {"source_id": "UNKNOWN", "chunk_id": "UNKNOWN"}
            cid = sha1(f"AL:CLAIM:{layer.upper()}:",
                       src["source_id"], src["chunk_id"], ct_norm, s, a, wi,
                       (claim.get("source_quote_ar") or "")[:30])
            payload = {k: v for k, v in claim.items()
                       if k not in ("claim_type","source_quote_ar","root","lemma","word_index")}
            stmts.append(
                f"INSERT INTO ar_ling_source_claims "
                f"(id,layer,claim_type,source_id,chunk_id,surah,ayah_from,ayah_to,word_index,"
                f"source_quote_ar,claim_payload,confidence,run_id,created_at) "
                f"VALUES ({sv(cid)},{sv(layer)},{sv(ct_norm)},"
                f"{sv(src['source_id'])},{sv(src['chunk_id'])},"
                f"{s},{a},{a},{wi},"
                f"{sv(claim.get('source_quote_ar') or '')},"
                f"{sv(payload)},"
                f"{sv(claim.get('confidence','pending'))},"
                f"{sv(run_id)},datetime('now')) "
                f"ON CONFLICT(id) DO UPDATE SET claim_payload=excluded.claim_payload,"
                f"confidence=excluded.confidence;\n"
            )
            n_ok += 1

    write_sql(f"s12_al_claims_{layer}.sql", stmts)
    print(f"    {n_ok} claims written, {n_drop} dropped (invalid claim_type)")

# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\nGenerating S12 SQL seeds → {OUT}\n")
    seen_lemmas = gen_qr_spine()
    gen_al_roots_lemmas(seen_lemmas)
    gen_al_taxonomy()
    gen_al_claims("irab",    CLAIMS_IRAB)
    gen_al_claims("balagha", CLAIMS_BALAGHA)
    print(f"\nDone. Files in {OUT}")
