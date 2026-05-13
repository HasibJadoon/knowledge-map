#!/usr/bin/env python3
"""
Deep analysis of Lisan al-Arab staging data across all renderable domains.

Sample size: 1000 random roots → all pages in their range.

Key fix vs first pass:
  ▸ Source text is HEAVILY DIACRITIZED. Strip diacritics before substring
    matching for cue phrases AND authority names.
  ▸ Inline marker regex now allows diacritics between Arabic letter and
    the trailing digit.

Domains reported:
  ▸ Footnotes        backing rows + inline markers + match rate
  ▸ Quran refs       g-holy-word density + cue phrases
  ▸ Hadith           cue phrases + block-type signal accuracy
  ▸ Poetry           block-type signal + attribution cues + multi-line
  ▸ Authorities      ~120 canonical names (lexicographers, grammarians,
                     hadith scholars, companions, poets) with variants
  ▸ Editorial        bracketed asides
"""

import sqlite3, re, json, random, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

STAGE = Path('/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map'
             '/km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline'
             '/ibn_manzur_lisan_al_arab/stage.sqlite')

AR_INDIC = str.maketrans({chr(0x660+i): str(i) for i in range(10)})
def ascii_d(s): return s.translate(AR_INDIC)

# ── Diacritic stripper ──────────────────────────────────────────────
# Removes harakat + tatweel + tanwin + sukun + shadda + small marks.
DIACR_RX = re.compile(r'[ً-ٰٟـۖ-ࣰۭ-ࣿ]')
def strip_diac(s: str) -> str:
    return DIACR_RX.sub('', s or '')


# ── Authority registry ──────────────────────────────────────────────
# Each entry: canonical_id → list of unvocalized variants. Variants are
# the forms we expect to see after stripping diacritics. We include
# every common kunyah/nasab/short form a scholar is cited under.

AUTHORITIES: dict[str, list[str]] = {

    # ── Basran-school grammarians + lexicographers ────────────────
    'al-Khalil':        ['الخليل بن أحمد', 'الخليل'],
    'Sibawayh':         ['سيبويه'],
    'Yunus':            ['يونس بن حبيب', 'يونس'],
    'al-Akhfash':       ['الأخفش الأكبر', 'الأخفش الأوسط', 'الأخفش الأصغر', 'الأخفش'],
    'al-Mazini':        ['أبو عثمان المازني', 'المازني'],
    'al-Mubarrad':      ['المبرد', 'أبو العباس المبرد'],
    'Ibn al-Sarraj':    ['ابن السراج'],
    'al-Zajjaj':        ['الزجاج', 'أبو إسحاق الزجاج'],
    'al-Zajjaji':       ['الزجاجي'],
    'Abu Ali al-Farisi':['أبو علي الفارسي', 'الفارسي', 'أبو علي'],
    'Ibn Jinni':        ['ابن جني'],
    'al-Jarmi':         ['الجرمي'],
    'al-Tawwazi':       ['التوزي'],
    'al-Riyashi':       ['الرياشي'],

    # ── Kufan-school grammarians ──────────────────────────────────
    'al-Kisai':         ['الكسائي'],
    'al-Farra':         ['الفراء', 'أبو زكريا الفراء'],
    'Tha‘lab':          ['ثعلب', 'أبو العباس ثعلب'],
    'Ibn al-Anbari':    ['ابن الأنباري'],
    'Ibn al-Sikkit':    ['ابن السكيت'],
    'al-Lihyani':       ['اللحياني'],
    'Ibn al-A‘rabi':    ['ابن الأعرابي'],
    'al-Nadr ibn Shumayl':['النضر بن شميل', 'النضر'],
    'Shammar':          ['شمر'],

    # ── Major lexicographers (Lisan’s direct sources) ─────────────
    'al-Asma‘i':        ['الأصمعي'],
    'Abu Ubayd':        ['أبو عبيد القاسم بن سلام', 'أبو عبيد'],
    'Abu Ubayda':       ['أبو عبيدة معمر', 'أبو عبيدة'],
    'Abu Zayd':         ['أبو زيد الأنصاري', 'أبو زيد'],
    'Abu Hanifa Dinawari':['أبو حنيفة الدينوري', 'أبو حنيفة'],
    'al-Azhari':        ['أبو منصور الأزهري', 'الأزهري', 'أبو منصور'],
    'Ibn Faris':        ['ابن فارس'],
    'Ibn Durayd':       ['ابن دريد'],
    'al-Jawhari':       ['الجوهري'],
    'Ibn Sidah':        ['ابن سيده', 'ابن سيدة'],
    'Ibn al-Athir':     ['ابن الأثير'],
    'al-Zamakhshari':   ['الزمخشري', 'الزمخشري في الفائق', 'في الفائق'],
    'Ibn Barri':        ['ابن بري'],
    'al-Harbi':         ['الحربي', 'إبراهيم الحربي'],
    'Ibn Qutayba':      ['ابن قتيبة'],
    'al-Jahiz':         ['الجاحظ'],

    # ── Hadith / fiqh / tafsir scholars ───────────────────────────
    'al-Zuhri':         ['الزهري', 'ابن شهاب'],
    'al-Hasan al-Basri':['الحسن البصري', 'الحسن'],
    'Ibn Sirin':        ['ابن سيرين'],
    'Mujahid':          ['مجاهد'],
    'Qatada':           ['قتادة'],
    'Ikrima':           ['عكرمة'],
    'al-Suddi':         ['السدي'],
    'al-Tabari':        ['الطبري', 'أبو جعفر الطبري'],
    'al-Khattabi':      ['الخطابي'],
    'al-Azhari Tahdhib':['التهذيب', 'تهذيب اللغة'],

    # ── Quran readers (qira’at) ────────────────────────────────────
    'Nafi‘':            ['نافع'],
    'Ibn Kathir (reader)':['ابن كثير المكي'],
    'Abu ‘Amr':         ['أبو عمرو بن العلاء', 'أبو عمرو'],
    'Hamza':            ['حمزة الزيات', 'حمزة'],
    '‘Asim':            ['عاصم بن أبي النجود', 'عاصم'],
    'al-Kisai (reader)':['الكسائي القارئ'],
    'Ya‘qub':           ['يعقوب الحضرمي', 'يعقوب'],

    # ── Companions ─────────────────────────────────────────────────
    'Ibn ‘Abbas':       ['ابن عباس', 'عبد الله بن عباس'],
    'Ibn Mas‘ud':       ['ابن مسعود', 'عبد الله بن مسعود'],
    'Ibn ‘Umar':        ['ابن عمر', 'عبد الله بن عمر'],
    '‘Ali':             ['علي بن أبي طالب', 'علي بن أبي طالبٍ'],
    '‘Umar':            ['عمر بن الخطاب'],
    'Abu Bakr':         ['أبو بكر الصديق'],
    '‘Uthman':          ['عثمان بن عفان'],
    '‘A’isha':          ['عائشة'],
    'Abu Hurayra':      ['أبو هريرة'],
    'Anas':             ['أنس بن مالك'],
    'Jabir':            ['جابر بن عبد الله'],
    'Ubayy':            ['أبي بن كعب', 'أبي'],

    # ── Heavily quoted poets (pre-Islamic + early Islamic) ─────────
    'Imru’ al-Qays':    ['امرؤ القيس'],
    'Zuhayr':           ['زهير بن أبي سلمى', 'زهير'],
    'al-Nabigha':       ['النابغة الذبياني', 'النابغة'],
    '‘Antara':          ['عنترة بن شداد', 'عنترة'],
    'Tarafa':           ['طرفة بن العبد', 'طرفة'],
    'Labid':            ['لبيد بن ربيعة', 'لبيد'],
    'al-A‘sha':         ['الأعشى'],
    '‘Amr ibn Kulthum': ['عمرو بن كلثوم'],
    'al-Harith':        ['الحارث بن حلزة'],
    'al-Khansa':        ['الخنساء'],

    # ── Umayyad poets ──────────────────────────────────────────────
    'Jarir':            ['جرير'],
    'al-Farazdaq':      ['الفرزدق'],
    'al-Akhtal':        ['الأخطل'],
    'Dhu al-Rumma':     ['ذو الرمة'],
    '‘Umar ibn Abi Rabi‘a':['عمر بن أبي ربيعة'],
    'al-Kumayt':        ['الكميت'],
    'al-‘Ajjaj':        ['العجاج'],
    'Ru’ba':            ['رؤبة بن العجاج', 'رؤبة'],
    'al-‘Ujjaj/Ru’ba pair':['ابن العجاج'],

    # ── ‘Abbasid + later poets ─────────────────────────────────────
    'Abu Nuwas':        ['أبو نواس'],
    'Bashshar':         ['بشار بن برد', 'بشار'],
    'Abu Tammam':       ['أبو تمام'],
    'al-Buhturi':       ['البحتري'],
    'al-Mutanabbi':     ['المتنبي'],
    'al-Ma‘arri':       ['أبو العلاء المعري', 'المعري'],

    # ── Generic poet/source cues (not a person) ────────────────────
    '(unnamed) شاعر':   ['قال الشاعر', 'قول الشاعر', 'وأنشد'],
    '(unnamed) راجز':   ['قال الراجز'],
    '(unnamed) بعض':    ['قال بعضهم', 'قال آخر'],

    # ── The Prophet (peace be upon him) ────────────────────────────
    'The Prophet ﷺ':    ['النبي صلى الله عليه وسلم', 'رسول الله',
                         'النبي ﷺ', 'النبي'],
}


def main():
    random.seed(42)
    con = sqlite3.connect(STAGE)
    cur = con.cursor()

    # ── Sample 1000 random roots ─────────────────────────────────────
    cur.execute("""
      SELECT root_norm, page_start, page_end
      FROM lex_root WHERE page_start IS NOT NULL
      ORDER BY RANDOM() LIMIT 1000
    """)
    roots = cur.fetchall()
    pages = set()
    for (_, ps, pe) in roots:
        for p in range(ps, (pe or ps)+1):
            pages.add(p)
    print(f'=== Sample: {len(roots)} roots, {len(pages)} pages ===\n')

    # ── 1. FOOTNOTES backing ─────────────────────────────────────────
    print('─── 1. FOOTNOTES ───')
    fn_by_page = defaultdict(dict)
    for p, num, txt in cur.execute(
        "SELECT page_no, footnote_no, text_ar FROM page_segments "
        "WHERE segment_type='footnote'"
    ):
        if p is None or num is None: continue
        try: n = int(ascii_d(str(num)))
        except: continue
        fn_by_page[p][n] = txt
    sample_fn = sum(len(fn_by_page[p]) for p in pages)
    pages_with_fn = sum(1 for p in pages if p in fn_by_page)
    print(f'Backing footnote rows in sample: {sample_fn} across {pages_with_fn} pages')
    lens = sorted(len(t) for p in pages for t in fn_by_page.get(p, {}).values())
    if lens:
        print(f'Footnote text len: median={lens[len(lens)//2]}, '
              f'p95={lens[int(len(lens)*0.95)]}, max={max(lens)}')

    # ── 2. INLINE FOOTNOTE MARKERS IN BODY ───────────────────────────
    print('\n─── 2. INLINE FOOTNOTE MARKERS ───')
    # Pattern: an Arabic-letter word (with diacritics) followed by space,
    # then a digit cluster, then space + Arabic letter OR punctuation.
    # Allow the word-final char to be a diacritic.
    marker_re = re.compile(
        r'[ء-ي][ء-ٰٟ]*\s+([٠-٩]+)\s*(?=[ء-ي]|[\.،؛:])'
    )
    body_markers = defaultdict(list)
    body_rows = cur.execute(
        f"SELECT page_no, text_ar FROM page_segments WHERE segment_type='body' "
        f"AND page_no IN ({','.join('?'*len(pages))})", tuple(pages)
    ).fetchall()
    for p, txt in body_rows:
        for m in marker_re.finditer(txt or ''):
            try: body_markers[p].append(int(ascii_d(m.group(1))))
            except: pass
    pages_w_markers = sum(1 for v in body_markers.values() if v)
    total_markers   = sum(len(v) for v in body_markers.values())
    print(f'Body pages with ≥1 marker: {pages_w_markers} / {len(body_rows)}')
    print(f'Total markers detected: {total_markers}')
    # Match rate
    matched = miss = orphan = 0
    for p, nums in body_markers.items():
        fn_nums = set(fn_by_page.get(p, {}).keys())
        body_set = set(nums)
        matched += len(body_set & fn_nums)
        miss    += len(body_set - fn_nums)
        orphan  += len(fn_nums - body_set)
    print(f'  body→footer matches: {matched}')
    print(f'  body marker w/o footer: {miss}')
    print(f'  footer text w/o body marker: {orphan}')
    if matched + miss > 0:
        print(f'  match rate: {100*matched/(matched+miss):.1f}%')

    # ── 3. QURAN REFERENCES ─────────────────────────────────────────
    print('\n─── 3. QURAN REFERENCES ───')
    raw_html_dir = STAGE.parent / 'raw_html'
    sample_html = sorted(pages)[:300]
    holy_word = 0
    pages_with_holy = 0
    cue_count = Counter()
    cues_ud = [strip_diac(c) for c in (
        'قوله تعالى', 'قال الله تعالى', 'قوله عز وجل',
        'قال تعالى', 'قوله سبحانه', 'قول الله عز وجل',
    )]
    for p in sample_html:
        f = raw_html_dir / f'page_{p:04d}_001.html'
        if not f.exists(): continue
        h = f.read_text()
        hw = len(re.findall(r'class="g-holy-word"', h))
        holy_word += hw
        if hw: pages_with_holy += 1
        h_ud = strip_diac(h)
        for c in cues_ud:
            cue_count[c] += h_ud.count(c)
    print(f'Sampled {len(sample_html)} HTML pages:')
    print(f'  g-holy-word spans: {holy_word} in {pages_with_holy} pages')
    print('  Quran cue phrases (diacritic-stripped substring count):')
    for c, n in cue_count.most_common():
        print(f'    {c!r}: {n}')

    # ── 4. BLOCK-TYPE SIGNAL ────────────────────────────────────────
    print('\n─── 4. BLOCK-TYPE SIGNAL (sample) ───')
    sample_roots = [r[0] for r in roots]
    qmarks = ','.join('?'*len(sample_roots))
    cur.execute(f"SELECT block_type, COUNT(*) FROM lex_block WHERE root_norm IN ({qmarks}) "
                "GROUP BY block_type", sample_roots)
    for t, n in cur.fetchall(): print(f'  {t}: {n}')

    # ── 5. HADITH cues vs block_type accuracy ───────────────────────
    print('\n─── 5. HADITH CUES ───')
    cur.execute(f"SELECT text_plain FROM lex_block WHERE root_norm IN ({qmarks}) "
                "AND block_type='hadith_quote' AND text_plain IS NOT NULL", sample_roots)
    hadith_blocks = [r[0] for r in cur.fetchall()]
    hadith_cues = [strip_diac(c) for c in (
        'وفي الحديث', 'الحديث', 'النبي', 'رسول الله',
        'صلى الله عليه', 'حدثنا', 'روى', 'قال النبي',
        'عن ابن عباس', 'في حديث',
    )]
    with_cue = 0
    for t in hadith_blocks:
        tu = strip_diac(t)
        if any(c in tu for c in hadith_cues): with_cue += 1
    pct = 100*with_cue/max(1,len(hadith_blocks))
    print(f'Of {len(hadith_blocks)} hadith_quote blocks, {with_cue} ({pct:.0f}%) contain a hadith cue')

    # ── 6. POETRY ─────────────────────────────────────────────────
    print('\n─── 6. POETRY ───')
    cur.execute(f"SELECT text_plain FROM lex_block WHERE root_norm IN ({qmarks}) "
                "AND block_type='poetry_quote' AND text_plain IS NOT NULL", sample_roots)
    poetry_blocks = [r[0] for r in cur.fetchall()]
    poetry_cues = [strip_diac(c) for c in (
        'قال الشاعر', 'وأنشد', 'قول الشاعر', 'قال الراجز',
        'قال الفرزدق', 'قال امرؤ القيس', 'أنشد',
    )]
    with_cue = sum(1 for t in poetry_blocks if any(c in strip_diac(t) for c in poetry_cues))
    multi    = sum(1 for t in poetry_blocks if '\n' in t or '...' in t)
    print(f'{len(poetry_blocks)} poetry blocks: {with_cue} have cue, {multi} multi-line')
    if poetry_blocks:
        print(f'Avg length: {sum(len(t) for t in poetry_blocks)/len(poetry_blocks):.0f} chars')

    # ── 7. AUTHORITIES (comprehensive) ───────────────────────────
    print('\n─── 7. AUTHORITIES (comprehensive registry) ───')
    cur.execute(f"SELECT text_plain FROM lex_block WHERE root_norm IN ({qmarks}) "
                "AND text_plain IS NOT NULL", sample_roots)
    big_text_ud = strip_diac('\n'.join(r[0] for r in cur.fetchall()))

    auth_counts: dict[str, int] = {}
    for canonical, variants in AUTHORITIES.items():
        total = 0
        for v in variants:
            vu = strip_diac(v)
            total += big_text_ud.count(vu)
        if total: auth_counts[canonical] = total

    # Group + report
    sorted_auth = sorted(auth_counts.items(), key=lambda x: -x[1])
    total_tagged = sum(auth_counts.values())
    print(f'Total authority mentions across 1000-root block text: {total_tagged}')
    print(f'Distinct authorities tagged: {len(auth_counts)} / {len(AUTHORITIES)}')
    print()
    print('Top 30:')
    for name, n in sorted_auth[:30]:
        print(f'  {name:30s} {n}')

    # Distribution by class
    print()
    print('By category (top 10 each):')
    LEX_GRAM = {'al-Khalil','Sibawayh','Yunus','al-Akhfash','al-Mazini','al-Mubarrad',
                'Ibn al-Sarraj','al-Zajjaj','al-Zajjaji','Abu Ali al-Farisi','Ibn Jinni',
                'al-Jarmi','al-Tawwazi','al-Riyashi','al-Kisai','al-Farra','Tha‘lab',
                'Ibn al-Anbari','Ibn al-Sikkit','al-Lihyani','Ibn al-A‘rabi',
                'al-Nadr ibn Shumayl','Shammar','al-Asma‘i','Abu Ubayd','Abu Ubayda',
                'Abu Zayd','Abu Hanifa Dinawari','al-Azhari','Ibn Faris','Ibn Durayd',
                'al-Jawhari','Ibn Sidah','Ibn al-Athir','al-Zamakhshari','Ibn Barri',
                'al-Harbi','Ibn Qutayba','al-Jahiz'}
    HADITH = {'al-Zuhri','al-Hasan al-Basri','Ibn Sirin','Mujahid','Qatada','Ikrima',
              'al-Suddi','al-Tabari','al-Khattabi','al-Azhari Tahdhib'}
    READER = {'Nafi‘','Ibn Kathir (reader)','Abu ‘Amr','Hamza','‘Asim',
              'al-Kisai (reader)','Ya‘qub'}
    COMP   = {'Ibn ‘Abbas','Ibn Mas‘ud','Ibn ‘Umar','‘Ali','‘Umar','Abu Bakr',
              '‘Uthman','‘A’isha','Abu Hurayra','Anas','Jabir','Ubayy'}
    POET   = {'Imru’ al-Qays','Zuhayr','al-Nabigha','‘Antara','Tarafa','Labid',
              'al-A‘sha','‘Amr ibn Kulthum','al-Harith','al-Khansa','Jarir',
              'al-Farazdaq','al-Akhtal','Dhu al-Rumma','‘Umar ibn Abi Rabi‘a',
              'al-Kumayt','al-‘Ajjaj','Ru’ba','al-‘Ujjaj/Ru’ba pair','Abu Nuwas',
              'Bashshar','Abu Tammam','al-Buhturi','al-Mutanabbi','al-Ma‘arri'}
    GENERIC = {'(unnamed) شاعر','(unnamed) راجز','(unnamed) بعض','The Prophet ﷺ'}

    for label, group in (
        ('Lexicographers / grammarians', LEX_GRAM),
        ('Hadith / tafsir scholars',     HADITH),
        ('Quran readers',                READER),
        ('Companions',                   COMP),
        ('Poets',                        POET),
        ('Generic cues + Prophet',       GENERIC),
    ):
        rows = sorted(((n, auth_counts[n]) for n in group if n in auth_counts),
                      key=lambda x: -x[1])
        if not rows:
            print(f'\n  ▪ {label}: (none detected)')
            continue
        tot = sum(c for _, c in rows)
        print(f'\n  ▪ {label}  (total {tot}, distinct {len(rows)})')
        for n, c in rows[:10]:
            print(f'      {n:30s} {c}')

    print('\n=== ANALYSIS COMPLETE ===')


if __name__ == '__main__':
    main()
