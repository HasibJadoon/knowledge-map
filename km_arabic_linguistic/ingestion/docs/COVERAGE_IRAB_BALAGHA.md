# Iʿrāb + Balāgha Source Coverage

> Generated: 2026-04-27. Inventory of what we already have ✅ vs. what's being added 🔄 vs. recommended additions ⏳.

## What "Major" Means Here

For Quranic Arabic, the canonical irab + balagha bibliography is well-defined. Mahmoud Safi's **الجدول في إعراب القرآن** (which you mentioned) is the most comprehensive modern irab — and **we already have it fully chunked** as `SRC:SHAMELA:SAFI_JADWAL` (3,257 chunks) inside the tafsir corpus.

---

## IʿRĀB — Top-Tier Sources

| # | Work | Author (d. AH) | Authority | Status |
|---|------|----------------|-----------|--------|
| 1 | **التبيان في إعراب القرآن** | Abu al-Baqāʾ al-ʿUkbarī (616) | Classical foundational | 🔄 **scraping now** (1,203 pages from Wayback) |
| 2 | **الجدول في إعراب القرآن وصرفه وبيانه** | Maḥmūd Ṣāfī (modern) | Most comprehensive modern | ✅ **3,257 chunks already embedded** |
| 3 | **إعراب القرآن وبيانه** | Muḥyī al-Dīn Darwīsh (modern) | Standard reference | ✅ **1,387 chunks already embedded** |
| 4 | **إعراب القرآن** | Abū Jaʿfar al-Naḥḥās (338) | Older foundational | ⏳ candidate |
| 5 | **مشكل إعراب القرآن** | Makkī b. Abī Ṭālib (437) | Hard-cases reference | ⏳ candidate |
| 6 | **البحر المحيط** (irab sections) | Abū Ḥayyān al-Andalusī (745) | Comprehensive linguistic tafsir | ✅ **1,427 chunks already embedded** |

**Bottom line for irab: 3 of the top 6 are already in production.** Tibyan landing in ~30 min makes it 4 of 6. Naḥḥās and Makkī are nice-to-have but optional — the existing four cover all major irab analyses.

---

## BALĀGHA — Top-Tier Sources

| # | Work | Author (d. AH) | Authority | Status |
|---|------|----------------|-----------|--------|
| 1 | **الكشاف** (al-Kashshāf) | al-Zamakhsharī (538) | **Founding Quran-balagha work** | ✅ **2,972 chunks embedded** |
| 2 | **التحرير والتنوير** | Ibn ʿĀshūr (1393) | Best modern Quran-balagha | ✅ **3,923 chunks embedded** |
| 3 | **روح المعاني** | al-Ālūsī (1270) | Comprehensive linguistic-spiritual | ✅ **5,629 chunks embedded** |
| 4 | **مفاتيح الغيب** | Fakhr al-Dīn al-Rāzī (606) | Reasoned linguistic exegesis | ✅ **2,969 chunks embedded** |
| 5 | **البحر المحيط** | Abū Ḥayyān (745) | Linguistic encyclopedia | ✅ **1,427 chunks embedded** |
| 6 | **المحرر الوجيز** | Ibn ʿAṭiyya (542) | Concise balagha-aware | ✅ **1,672 chunks embedded** |
| 7 | **دلائل الإعجاز** | ʿAbd al-Qāhir al-Jurjānī (471) | **Founder of meaning theory** (naẓm) | ⏳ recommended — high-value gap |
| 8 | **أسرار البلاغة** | al-Jurjānī (471) | Bayān + badīʿ theory | ⏳ recommended — high-value gap |
| 9 | **إعجاز القرآن** | al-Bāqillānī (403) | Earliest iʿjāz work | ⏳ candidate |
| 10 | **الإيضاح في علوم البلاغة** | al-Qazwīnī (739) | Standard balagha textbook | ⏳ candidate (general, not Quran-specific) |
| 11 | **الإتقان في علوم القرآن** (chs. 56–60) | al-Suyūṭī (911) | Encyclopedic chapter on balagha | ⏳ candidate |
| 12 | **معترك الأقران في إعجاز القرآن** | al-Suyūṭī (911) | I'jaz aspects | ⏳ candidate |

**Bottom line for balagha: 6 of the top 12 are already in production** — covering all major Quran-applied balagha. The two Jurjānī works (دلائل الإعجاز, أسرار البلاغة) are the most valuable additions — they are *the* theoretical foundation that all 6 existing tafsirs cite. Without Jurjānī, balagha extraction will quote "what" but not always "why".

---

## What I'm Doing

### Now (next 30 min)
1. ✅ **Tibyan scrape** running (PID 11318) — 1,203 pages, ~30 min ETA
2. ⏳ **Migration drafts** — write the 3 SQL migrations (005 staging / 006 irab / 007 balagha)

### Next (after Tibyan finishes)
3. Chunk Tibyan pages by ayah anchors (`قَوْلُهُ تَعَالَى` heading detection)
4. Filter existing 6 tafsir corpora for balagha-bearing paragraphs (trigger words: تقديم, تأخير, التفات, حصر, جناس, طباق, مقابلة, تعريف, تنكير, إيجاز, إطناب, مساواة, أسلوب الحكيم, …)
5. Build 2 new Qdrant collections: `kmaps_irab_source_chunks`, `kmaps_balagha_source_chunks`

### Recommended additions (need user approval — same Wayback approach)
6. **al-Jurjānī's two works** (دلائل الإعجاز, أسرار البلاغة) — high-value balagha theory gap
   - Both available on Shamela. Wayback has good coverage. Estimated +400 pages, +30 min scrape.
7. **al-Naḥḥās إعراب القرآن** — older irab (8th c. AH). 600+ pages estimated.
8. **Makkī مشكل إعراب القرآن** — difficult cases. ~500 pages.

---

## Mahmoud Safi specifically

You mentioned Maḥmūd Ṣāfī's *الجدول*. Status:

```
Source ID:  AL:SRC:65cf5c98917fd9b6f9c52b0e
Title:      Safi - al-Jadwal fi I'rab al-Quran
Chunks:     3,257  (already embedded ✅)
Coverage:   Surahs 1-114, ayah-by-ayah irab + sarf + bayan
Position:   Tafsir DB (sarf-Tafsirs/)
```

Each chunk is one ayah segment with full irab (case markings, governance, taʿlīq, taqdīr) plus brief balagha. This is already in your Qdrant index and will be retrieved automatically by `extract_claims.py` when querying any Quran word.

**Action for you:** none — Safi is fully integrated.

---

## Recommendation

**Don't add more sources right now.** What's already in the index covers:
- Iʿrāb: 3 top works → 4 once Tibyan finishes
- Balāgha: 6 top works (the entire classical-modern Quran-balagha canon)

**The two ʿAbd al-Qāhir al-Jurjānī works are the only meaningful gap**, but they are theory books — not ayah-by-ayah commentary. Their value is in citation/grounding, not direct claim extraction. Worth scraping if you want extraction to cite Jurjānī by name. Otherwise: skip and revisit later.

If you say go, I'll add Jurjānī to the Tibyan scrape queue (it's the same Wayback flow, ~30 min more).
