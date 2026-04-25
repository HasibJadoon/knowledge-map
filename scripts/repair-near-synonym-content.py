#!/usr/bin/env python3
"""
Repair near-synonym member content:
- basic_gloss: concise English gloss for each Arabic word
- nuance_note: how this word is specifically used in the Quran
- contrast_note: how it differs from other set members

Generated from classical Arabic / Quranic knowledge. Conservative — if uncertain, leaves empty.
"""

import json, re, sys

# ── Arabic word knowledge base ────────────────────────────────────────────────
# Each entry: arabic_word -> { gloss, nuance, contrast }
# contrast is relative to most common synonym
WORD_KB = {
    # ── SETTLEMENT / TO SETTLE ──────────────────────────────────────────────
    "سَكَنَ":    ("to dwell, become still", "Primary root for settling; conveys quietude and tranquility", "Most general term; unique in conveying stillness and peace"),
    "سَكَنَ (skn)":  ("to dwell, become still", "Root s-k-n; same as سَكَنَ", "Most general term; unique in conveying stillness and peace"),
    "تَبَوَّأَ": ("to take up a dwelling place", "Implies intentional settling with suitability; used for Paradise", "Emphasises choosing and making oneself at home; more deliberate than سَكَنَ"),
    "تَبَوَّأَ (بوء)": ("to take up a dwelling place", "Implies intentional settling with suitability; used for Paradise", "Emphasises choosing and making oneself at home; more deliberate than سَكَنَ"),
    "ثَوَى":    ("to stay, reside", "Used for extended stay; implies permanence", "Conveys longer, more settled residence than سَكَنَ"),
    "بَدَا (بَدُو)": ("to appear, dwell in the desert", "Used for Bedouin-style dwelling in the open country", "Contrasts urban settlement; implies nomadic or wilderness dwelling"),
    "حَضَرَ":   ("to be present, settle near", "Implies presence near a city or civilisation", "Contrasts بَدَا; implies sedentary civilised dwelling"),
    "أَسْكَنَ": ("to cause to dwell, to settle (someone)", "Causative of سَكَنَ; Allah causes beings to inhabit places", "Causative form — the agent places another in a dwelling"),
    "بَوَّأَ":  ("to settle (someone) in a place", "Causative of تَبَوَّأَ; to assign a suitable abode", "Implies fitness and suitability of the place assigned"),
    "عَمَرَ":   ("to inhabit, build up, populate", "Emphasises flourishing habitation and civilisation building", "Conveys prosperity and building activity, unlike mere dwelling"),
    "آوَى":    ("to shelter, take refuge", "Implies giving or receiving shelter, especially protective", "Has protective/refuge connotation absent in other settlement words"),

    # ── AFTERLIFE / AAKHIRAH ────────────────────────────────────────────────
    "آخرة":         ("the Hereafter, life after death", "The general term for the next life; occurs 115+ times in the Quran", "The most comprehensive term for post-death existence"),
    "دار الآخرة":   ("the abode of the Hereafter", "Emphasises the Hereafter as a home/abode (دار)", "Stresses the dwelling aspect; contrasts with دار الدنيا (this world)"),
    "دار القرار":   ("the eternal settled abode", "قرار means stability; this is the abode of permanent settlement", "Emphasises permanence and finality — everyone settles there forever"),
    "أَخَّرَتْ":   ("the latter, that which is behind", "Participial form emphasising the temporal posteriority", "Less frequent; stresses temporal sequence rather than the nature of the life"),
    "اليَومُ الآخِرْ": ("the Last Day", "Qiyamah framing; emphasises finality of that day", "Names the Day rather than the period of life that follows it"),
    "يَومُ البَعْثْ": ("the Day of Resurrection", "بَعْث = raising/sending forth; focuses on the resurrection event", "Highlights the rising from graves, not the afterlife period itself"),

    # ── TO PUNISH / RECOMPENSE ──────────────────────────────────────────────
    "عَذَّبَ":   ("to torment, to punish severely", "Root ع-ذ-ب; indicates severe, prolonged punishment — always negative", "The harshest punishment word; refers exclusively to severe torment"),
    "نَكَّلَ":   ("to punish as a deterrent, make an example", "Implies punishing to deter others; has public/exemplary dimension", "Unlike عَذَّبَ, has an instructional/deterrent purpose for onlookers"),
    "جَزَى":    ("to recompense, requite (good or bad)", "Neutral; can be reward or punishment depending on context", "The most neutral term; used for both divine reward and punishment"),
    "ثَوَّبَ":  ("to reward, to give recompense", "Often positive; giving back/returning what is deserved", "More often used for good recompense; contrast with عَذَّبَ"),
    "أَثَابَ":  ("to reward, to recompense", "Same root as ثَوَّبَ; causative reward; common in positive contexts", "Typically positive recompense; not for punishment"),
    "ثَوَّبَ-أَثَابَ": ("to recompense, reward", "Root ث-و-ب; both forms convey returning good for good", "Leans positive; contrasts with عَذَّبَ which is exclusively negative"),
    "دَانَ":    ("to judge, to requite, to hold accountable", "Has legal/judicial dimension; دِين (religion/judgment) shares root", "Emphasises accounting and judicial process, not the execution of punishment"),
    "أَغْنَى":  ("to enrich, to suffice, to avail", "Primarily means to make free of need; used for divine enrichment", "Recompense by enrichment/sufficiency; can also mean to avail naught"),
    "أَنْعَمَ": ("to bestow blessings, confer favour", "Causative of نِعْمَة (blessing); always positive divine gift", "Exclusively positive; divine grace and generosity"),
    "خَوَّلَ":  ("to grant, give in trust", "Implies granting with a stewardship dimension; given to be managed", "Has connotation of entrusting wealth or authority, not just giving"),
    "أَتْرَفَ": ("to make affluent, to indulge", "Implies excessive comfort leading to heedlessness; often negative context", "Unique negative connotation — luxury that leads to moral corruption"),
    "أَقْنَى":  ("to enrich, to make content with little", "Used once in Quran (53:48); implies satisfying needs fully", "A unique word for divine provision that brings contentment"),
    "أَحْسَنَ": ("to do good, to excel, to be beneficent", "Root ح-س-ن (beauty/good); the doing of beautiful deeds", "Positive moral virtue — the pursuit of excellence in action"),

    # ── TO SETTLE SOMEONE ───────────────────────────────────────────────────
    "أَسْكَنَ": ("to cause to dwell, to house", "Allah's causing creatures to inhabit places (e.g., Paradise)", "Causative; emphasises the agent's role in providing a dwelling"),
    "بَوَّأَ":  ("to settle (someone) suitably", "Root ب-و-أ; assigning a fitting abode", "Implies suitability and proper allocation, unlike mere housing"),
    "عَمَّرَ":  ("to populate, make prosper", "Intensive form of عَمَرَ; filling with inhabitants and life", "Focuses on the flourishing civilisation aspect"),
    "آوَى":    ("to shelter, to give refuge", "Giving shelter, protection; used for orphans (93:6) and companions", "Has protective, sheltering quality; the closest to 'refuge'"),

    # ── MAN / HUMAN ─────────────────────────────────────────────────────────
    "إِنسَان":  ("human being, the human", "General term for the human species; stresses social/emotional nature", "Most comprehensive; covers humanity as a species"),
    "بَشَر":    ("human being (physical)", "Emphasises physical/bodily nature; used for prophets' humanity", "Stresses corporeal nature — humans as creatures of flesh"),
    "نَاس":     ("people, mankind", "Collective plural; emphasises humans as a social community", "Collective social meaning; contrasts with the individual emphasis of إنسان"),
    "آدَم":     ("Adam, the human (sons of Adam)", "Refers to humanity as descendants of Adam", "Historical/genealogical reference; traces humanity to its origin"),
    "مَرْء":    ("a man, a person", "More literary/individualised term for a person", "Specifically individual; less common in Quran than إنسان"),
    "رَجُل":    ("a man (adult male)", "Specifically male adult; contrasts with مَرْأَة (woman)", "Gender-specific; refers only to males, unlike إنسان"),

    # ── TO LIVE / LIFE ──────────────────────────────────────────────────────
    "حَيَاة":   ("life, existence (noun)", "The abstract noun for life; the state of being alive", "General noun for life — both worldly and eternal"),
    "عَاشَ":    ("to live, to be alive", "Active living; daily existence and sustenance", "Emphasises the process and experience of living"),
    "بَقِيَ":   ("to remain, to endure", "Staying/surviving; often in contexts of eternal permanence", "Emphasises continuity and survival beyond others"),
    "عُمِّرَ":  ("to be granted long life", "Being given a long lifespan by Allah", "Specific to long duration of life, unlike general حَيَاة"),

    # ── REST / TRANQUILITY ──────────────────────────────────────────────────
    "رَاحَة":   ("rest, relief", "Cessation of work or hardship; physical and mental relief", "Most common word for rest/relaxation"),
    "سَكِينَة": ("tranquility, serenity (from Allah)", "Divine tranquility sent down into the hearts of believers", "Uniquely divine origin — Allah's specific gift of inner peace"),
    "طُمَأْنِينَة": ("serenity, contentment of heart", "Inner stillness and satisfaction; state of the content soul", "More about internal contentment than external rest"),
    "سُبَاتاً": ("deep sleep, suspension of activity", "Root س-ب-ت; the body's night rest and suspension of consciousness", "Specifically the sleep-rest that restores; more biological than spiritual"),

    # ── HEAVEN / HEREAFTER LOCATIONS ───────────────────────────────────────
    "جَنَّة":   ("garden, Paradise", "The divine garden of Paradise for believers", "The primary word for Paradise — a garden of rewards"),
    "فِرْدَوْس": ("the highest Paradise", "The highest level of Paradise; used twice in Quran", "More specific and elevated than جَنَّة; the pinnacle of Paradise"),
    "دَار السَّلَام": ("Abode of Peace", "Allah's calling to the abode of peace", "Emphasises peace as the defining quality of Paradise"),
    "جَهَنَّم": ("Hell, Gehenna", "The principal word for Hell in the Quran", "The general and most common term for Hell"),
    "نَار":     ("fire, Hellfire", "Literally fire; used for Hell's punishing fire", "Emphasises the element of fire as the mode of punishment"),
    "سَعِير":   ("blazing fire, Hell", "Intensely blazing fire; more intense than نَار alone", "Emphasises the intensity and ferocity of the flames"),
    "لَظَى":    ("the raging flame", "A name of Hell emphasising the licking, enveloping flame", "Focuses on the encircling quality of Hell's fire"),
    "حُطَمَة":  ("the crusher, the smasher (Hell)", "Hell that crushes and smashes; from حَطَمَ (to break into pieces)", "Emphasises the destructive, crushing nature of Hell"),

    # ── KNOWLEDGE / KNOWING ─────────────────────────────────────────────────
    "عَلِمَ":   ("to know", "General cognitive knowledge; the most common root for knowing", "The broadest knowledge word; general awareness and information"),
    "عَرَفَ":   ("to recognise, be acquainted with", "Experiential recognition; knowing from acquaintance or experience", "More about recognition and practical familiarity than abstract knowing"),
    "دَرَى":    ("to know (by perception)", "Knowledge through awareness or subtle perception", "Implies more subtle or indirect knowing than عَلِمَ"),
    "شَعَرَ":   ("to perceive, be aware of", "Sensory-level awareness or consciousness", "More about immediate sensory or emotional awareness"),
    "خَبَرَ":   ("to be informed, to have experience", "Knowledge through experience or being told; خَبِير (All-Aware) is Allah's name", "Emphasises experiential or reported knowledge"),

    # ── WORSHIP / SERVANTS ──────────────────────────────────────────────────
    "عَبَدَ":   ("to worship, to serve", "The act of worship and servitude to Allah", "The most complete act — worship involving submission and servitude"),
    "خَشَعَ":   ("to be humble, to submit in awe", "Humility and submissiveness especially in prayer", "Focuses on inner awe and physical submission"),
    "خَضَعَ":   ("to be submissive, to yield", "Submission and yielding, often physical", "More physical compliance/submission than spiritual humility"),
    "أَنَابَ":  ("to turn, repent, return to Allah", "Turning back to Allah in repentance; orientation of the heart", "Emphasises the return and direction toward Allah, unlike general worship"),

    # ── SPEAK / SAY ─────────────────────────────────────────────────────────
    "قَالَ":    ("to say, to speak", "The most common verb of speech in the Quran", "General speech; the default word for saying/declaring"),
    "تَكَلَّمَ": ("to speak, to converse", "Mutual or extended speech/conversation", "Implies more sustained or reciprocal conversation"),
    "نَطَقَ":   ("to articulate speech", "Articulate, clear speaking — especially of meaningful utterance", "Emphasises the capacity and act of articulation"),
    "نَادَى":   ("to call out, to summon", "Calling out, especially across a distance", "Directional call; implies calling someone at a distance"),

    # ── HEART / SOUL ────────────────────────────────────────────────────────
    "قَلْب":    ("heart (as seat of reason/feeling)", "The cognitive and emotional heart; used for understanding and intention", "The most comprehensive heart word; seat of both intellect and emotion"),
    "فُؤَاد":   ("heart (emotional/innermost)", "The innermost heart with strong emotional resonance", "More intimate and emotionally charged than قَلْب"),
    "صَدْر":   ("chest, breast (as seat of feelings)", "The chest as the container of feelings and anxieties", "Wider spatial sense — the whole chest; where Allah opens or constricts"),
    "لُبّ":     ("core of the mind, pure intellect", "The innermost essence of the mind; pure reason", "Specifically intellectual; أُولُو الْأَلْبَاب = those of pure intellect"),

    # ── GUIDANCE / PATH ─────────────────────────────────────────────────────
    "هَدَى":    ("to guide, to show the way", "General divine guidance; the most frequent guidance root", "The broadest guidance word in the Quran"),
    "أَرْشَدَ": ("to guide, to direct rightly", "Guiding to the straight/sound course; more directional", "Has connotation of directing to what is correct and sound"),
    "دَلَّ":    ("to point, to indicate", "Pointing toward something; indication and direction", "More of a pointing/directing action than full guidance"),

    # ── GOOD / EVIL ─────────────────────────────────────────────────────────
    "خَيْر":    ("good, goodness, better", "Comparative goodness; the good/better of two things or general benefit", "The most comprehensive word for good/benefit; also used comparatively"),
    "بِرّ":     ("righteousness, piety, goodness", "Comprehensive moral righteousness including obedience to parents/Allah", "Specifically moral goodness and righteous conduct"),
    "إِحْسَان": ("excellence, doing beautiful good", "The highest level of spiritual excellence — worshipping as if seeing Allah", "The pinnacle concept of moral/spiritual excellence"),
    "حَسُنَ":   ("to be good, beautiful", "Root ح-س-ن; being good and beautiful in form or character", "Stresses aesthetic/qualitative goodness"),
    "نِعْمَ":   ("how excellent!, how good!", "Particle of praise; often used for emphatic approval", "Used in praise formulae; not describing a quality but expressing approval"),

    # ── DESTROY / PERISH ────────────────────────────────────────────────────
    "هَلَكَ":   ("to perish, to be destroyed", "The most common word for perishing; applies to individuals and nations", "General destruction/perishing; applies widely"),
    "أَهْلَكَ": ("to cause to perish, to destroy", "Causative of هَلَكَ; Allah destroying wrongdoing peoples", "Causative form — agent deliberately brings about destruction"),
    "دَمَّرَ":  ("to utterly destroy", "Total, ruinous destruction; more emphatic than هَلَكَ", "More emphatic and complete than هَلَكَ; implies total ruin"),
    "أَبَادَ":  ("to annihilate, to wipe out", "Complete annihilation, leaving no remnant", "Most extreme — leaving no trace; rarer in Quran"),
    "بَادَ":    ("to perish utterly, to be wiped out", "Utter perishing with no survivors", "Total, complete destruction with no remainder"),

    # ── FEAR / GOD-CONSCIOUSNESS ─────────────────────────────────────────────
    "خَافَ":    ("to fear", "General fear; can be natural fear or fear of Allah", "The most general fear word"),
    "خَشِيَ":  ("to fear with reverence (awe)", "Fear combined with awe and reverence; often used for fearing Allah", "More reverential than خَافَ; implies respect and awe, not just dread"),
    "رَهِبَ":  ("to be frightened, to be in awe", "Fear that causes awe; used with believers fearing Allah (رَهَبًا)", "More about trembling awe; رَهْبَانِيَّة (monasticism) shares this root"),
    "وَجِلَ":  ("to be in awe, heart trembling with fear", "The trembling of the heart out of fear of Allah", "Specifically the physical trembling sensation of the heart"),
    "تَقِيَ":  ("to be God-fearing, to have taqwā", "Comprehensive God-consciousness and piety (تَقْوَى)", "The most holistic concept — not just fear but protective righteousness"),

    # ── SEE / LOOK ──────────────────────────────────────────────────────────
    "رَأَى":   ("to see, to have vision", "Physical sight and also insight/opinion", "Most comprehensive; covers physical sight and mental perception"),
    "نَظَرَ":  ("to look, to gaze, to reflect", "Active looking/gazing; often deliberate and reflective", "More active and intentional than رَأَى; implies attention and reflection"),
    "أَبْصَرَ": ("to perceive with the eyes", "Visual perception; faculty of sight", "Specifically sensory visual perception; بَصِير (All-Seeing) — Allah's name"),
    "شَهِدَ":  ("to witness, to be present", "Being a witness or being present at an event", "Emphasises bearing witness and presence at an event"),

    # ── SEND / MESSENGER ───────────────────────────────────────────────────
    "أَرْسَلَ": ("to send, to dispatch", "Sending a messenger or thing; the root of رَسُول (messenger)", "Most common verb for divine sending of messengers"),
    "بَعَثَ":  ("to raise, to send, to resurrect", "Raising/sending; also used for resurrection of the dead", "Dual meaning: sending with mission AND resurrection"),
    "وَجَّهَ": ("to direct, to send toward", "Directing someone or something toward a destination", "Emphasises the directional pointing/sending"),
}

def sql_escape(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

def get_member_data(arabic_display, set_canonical_en):
    """Return (gloss, nuance, contrast) for a given Arabic word."""
    # Try exact match first
    word = (arabic_display or "").strip()
    if word in WORD_KB:
        g, n, c = WORD_KB[word]
        return g, n, c
    # Try without diacritics (strip harakat)
    bare = re.sub(r'[\u064B-\u065F\u0670]', '', word)
    for k, v in WORD_KB.items():
        k_bare = re.sub(r'[\u064B-\u065F\u0670]', '', k)
        if k_bare == bare:
            return v
    return None, None, None

# Load DB members
BASE = '/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/km_arabic_linguistic/ingestion/near_synonyms'
with open(f'{BASE}/output/merged_near_synonym_members.json') as f:
    members = json.load(f)
with open(f'{BASE}/output/merged_near_synonym_sets.json') as f:
    sets = {s['id']: s for s in json.load(f)}

sql_lines = [
    "-- Near-synonym member content repair",
    "-- Populates basic_gloss, nuance_note, contrast_note from classical Arabic knowledge",
    "-- Generated by repair-near-synonym-content.py",
    "",
]

matched = 0
for m in members:
    arabic = (m.get('arabic_display') or '').strip()
    if not arabic:
        continue
    s = sets.get(m['set_id'], {})
    canonical_en = s.get('canonical_en') or s.get('set_name') or ''

    gloss, nuance, contrast = get_member_data(arabic, canonical_en)

    if not any([gloss, nuance, contrast]):
        continue

    matched += 1
    mid = m['id']
    parts = []
    if gloss:
        parts.append(f"basic_gloss = {sql_escape(gloss)}")
    if nuance:
        parts.append(f"nuance_note = {sql_escape(nuance)}")
    if contrast:
        parts.append(f"contrast_note = {sql_escape(contrast)}")

    if parts:
        sql_lines.append(f"UPDATE ar_ling_near_synonym_members SET {', '.join(parts)} WHERE id = {sql_escape(mid)};")

# Also: set description_md for sets where it's 'TOdo'
sql_lines.append("")
sql_lines.append("-- Fix 'TOdo' description_md → derive from canonical_en")
sql_lines.append("-- Sets where description_md still says 'TOdo' get a sensible placeholder")
sql_lines.append("""UPDATE ar_ling_near_synonym_sets
SET description_md = 'Arabic words used in the Quran with the meaning: ' || canonical_en
WHERE description_md = 'TOdo' OR description_md = '';""")

outpath = '/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/database/seeds/repair-near-synonym-members-content.sql'
with open(outpath, 'w') as f:
    f.write('\n'.join(sql_lines) + '\n')

print(f"Total members: {len(members)}")
print(f"Members with KB match: {matched}")
print(f"SQL written to: {outpath}")
