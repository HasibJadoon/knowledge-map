# On-Disk Deep Dive: 8 Tafsir SQLite Databases

Source dir: `/Users/abdulhasibahmedjadoon/Documents/LLM/8-Sandbox/_Repositories/knowledge-map/km_arabic_linguistic/ingestion/Tafsirs/`

All 8 share the same schema and exactly **6,236 rows** (one per ayah):
```sql
CREATE TABLE tafsir (ayah_key TEXT, group_ayah_key TEXT, from_ayah TEXT, to_ayah TEXT, ayah_keys TEXT, text TEXT)
```

`ayah_key` is the actual ayah; `group_ayah_key` is the anchor row where commentary lives. Follower rows for grouped commentary contain `text=''` and point to the anchor via `group_ayah_key`. `ayah_keys` is a comma-separated list of all ayahs the anchor covers.

---

## 1. Tafsir al-Alusi (Rūḥ al-Maʿānī)
File: `tafsir-al-alusi.db` (60.4 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 97,652 | 5,059 | 333 | 3,103 | 11,284 | 607 | 793 |

### B. Group structure
- Anchors (`ayah_key = group_ayah_key`): **5,629**
- Followers (empty text rows): **607**
- Multi-ayah commentary entries (`ayah_keys` contains `,`): **463**
- Largest group: `26:158` covers 8 ayahs `26:158…26:165`

### C. Samples
**1:1** — `ayah_key=1:1`, `group_ayah_key=1:1`, `from_ayah=1:1`, `to_ayah=1:1`, `ayah_keys=1:1`, `length(text)=70284`

```
<div class=ar lang=ar><p><p class="page-num">صفحة 39</p><span class="hlt"><span class="qpc-hafs">﴿بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ﴾</span></span></p><p>فِيها أبْحاثٌ (البَحْثُ الأوَّلُ) اخْتَلَفَ العُلَماءُ فِيها، هَلْ هي مِن خَواصِّ هَذِهِ الأُمَّةِ أمْ لا؟ فَنَقَلَ العَلّامَةُ أبُو بَكْرٍ التُّونُسِيُّ إجْماعَ عُلَماءِ كُلِّ مِلَّةٍ عَلى أنَّ اللَّهَ تَعالى افْتَتَحَ كُلَّ كِتابٍ بِها، ورَوى السُّيُوطِيُّ فِيما نَقَلَهُ عَنْهُ السِّرْمِينِيُّ والعُهْدَةُ عَلَيْهِ: بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ فاتِحَةُ كُلِّ كِتابٍ، وذَهَبَ هَذا الرّاوِي إلى أنَّ البَسْمَلَةَ مِنَ الخُصُوصِيّاتِ لِما رُوِيَ <span class="hlt">«أنَّهُ صَلّى اللَّهُ تَعالى عَلَيْهِ وسَلَّمَ كانَ يَكْتُبُ: بِاسْمِكَ اللَّهُمَّ، إلى أنْ نَزَلَ: <span class="qpc-hafs">﴿بِسْمِ اللَّهِ مَجْراها﴾</span></span> فَأمَر
```

**2:255** — `ayah_key=2:255`, `group=2:255`, `length(text)=38419`

```
<div class=ar lang=ar><p><span class="hlt"><span class="qpc-hafs">﴿اللَّهُ لا إلَهَ إلا هُوَ﴾</span></span> مُبْتَدَأٌ وخَبَرٌ، والمُرادُ هو المُسْتَحِقُّ لِلْعُبُودِيَّةِ لا غَيْرَ، قِيلَ: ولِلنّاسِ في رَفْعِ الضَّمِيرِ المُنْفَصِلِ وكَذا في الِاسْمِ الكَرِيمِ إذا حَلَّ مَحَلَّهُ أقْوالٌ خَمْسَةٌ: قَوْلانِ مُعْتَبِرانِ، وثَلاثَةٌ لا مُعَوَّلَ عَلَيْها، فالقَوْلانِ المُعْتَبِرانِ: أحَدُهُما: أنْ يَكُونَ رَفْعُهُ عَلى البَدَلِيَّةِ، وثانِيهُما: أنْ يَكُونَ عَلى الخَبَرِيَّةِ والأوَّلُ هو الجارِي عَلى ألْسِنَةِ المُعْرِبِينَ وهو رَأْيُ اِبْنِ مالِكٍ، وعَلَيْهِ إمّا أنْ يُقَدَّرَ لِلْأخِيرِ أوْ لا، والقائِلُونَ بِالتَّقْدِيرِ اِخْتَلَفُوا؛ فَمِن مُقَدِّرٍ أمْرًا عامًّا كالوُجُودِ والإمْكانِ؛ ومِن مُقَدِّرٍ أمْرًا خاصًّا كَلَنا ولِلْخَلْقِ، واعْتُرِضَ تَقْدِيرُ العامِّ بِأنَّهُ يَلْزَمُ مِنهُ
```

**112:1** — `ayah_key=112:1`, `group=112:1`, `length(text)=20822`

```
<div class=ar lang=ar><p>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ <span class="hlt"><span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span></span> المَشْهُورُ أنَّ هو ضَمِيرُ الشَّأْنِ ومَحَلُّهُ الرَّفْعُ عَلى الِابْتِداءِ، خَبَرُهُ الجُمْلَةُ بَعْدَهُ، ومِثْلُها لا يَكُونُ لَها رابِطٌ؛ لِأنَّها عَيْنُ المُبْتَدَأِ في المَعْنى، والسِّرُّ في تَصْدِيرِها بِهِ التَّنْبِيهُ مِن أوَّلِ الأمْرِ عَلى فَخامَةِ مَضْمُونِها مَعَ ما فِيهِ مِن زِيادَةِ التَّحْقِيقِ والتَّقْرِيرِ؛ فَإنَّ الضَّمِيرَ لا يُفْهَمُ مِنهُ مِن أوَّلِ الأمْرِ إلّا شَأْنٌ مُبْهَمٌ لَهُ خَطَرٌ جَلِيلٌ فَيَبْقى الذِّهْنُ مُتَرَقِّبًا لِما أمامَهُ مِمّا يُفَسِّرُهُ ويُزِيلُ إبْهامَهُ فَيَتَمَكَّنُ عِنْدَ وُرُودِهِ لَهُ فَضْلُ تَمَكُّنٍ.</p><p>وقَوْلُ الشَّيْخِ عَبْدِ القاهِرِ في دَلائِلِ الإعْجازِ: إنَّ لَهُ مَعَ <span class="hlt">«إن
```

### D. Quirks
- **Brackets**: target Qurʾān words in `﴿…﴾` (Unicode ornate parens) wrapped in `<span class="qpc-hafs">`; hadith quotations in `«…»`; iʿrāb categories in `(…)` (e.g. `(البَحْثُ الأوَّلُ)`).
- **HTML**: heavy. `<div class=ar lang=ar>`, `<p>`, `<span class="hlt">` (highlight wrapper), `<span class="qpc-hafs">` (Qurʾānic text), `<span class="ayah-tag">`, `<p class="page-num">صفحة 39</p>`. 5,629/6,236 anchors have all of these; 3,785 contain page-num markers; 695 contain cross-reference `ayah-tag` spans.
- **Attribution**: `قال` appears in 4,749 rows; `روى/رُوِيَ` in 2,051. Sample: `فَنَقَلَ العَلّامَةُ أبُو بَكْرٍ التُّونُسِيُّ إجْماعَ عُلَماءِ` and `ورَوى السُّيُوطِيُّ فِيما نَقَلَهُ عَنْهُ السِّرْمِينِيُّ`.
- **Isnad chains**: none in classical `حدثنا…عن` format (haddathana count = 0); attribution is paraphrased, not chained.
- **Cross-references**: yes — `<span class="ayah-tag">[Surah: ayah]</span>` style (e.g. `[النساء: ١٦٠]`). Arabic-numeral form, surah-name not numeric.
- **Voweling**: **fully voweled** (tashkīl on virtually every letter).
- **Headings**: inline parenthetical: `(البَحْثُ الأوَّلُ)`, `(المَسْألَةُ الثّانِيَةُ)`. No `<h3>`.

---

## 2. al-Taḥrīr wa-al-Tanwīr (Ibn ʿĀshūr)
File: `ar-tafseer-tahrir-al-tanwir.db` (51.2 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 63,322 | 4,453 | 0 | 2,944 | 11,299 | 2,313 | 813 |

### B. Group structure
- Anchors: **3,923** / Followers: **2,313** / Multi-ayah anchors: **1,224**
- Largest group: `70:22` covers 14 ayahs (`70:22…70:35`)

### C. Samples
**1:1** — `length=44879`

```
<div class=ar lang=ar><p></p><p class="page-num">صفحة ١٣٧</p>البَسْمَلَةُ اسْمٌ لِكَلِمَةِ ”باسِمِ اللَّهِ، صِيغَ هَذا الِاسْمُ عَلى مادَّةٍ مُؤَلَّفَةٍ مِن حُرُوفِ الكَلِمَتَيْنِ (باسْمِ) و(اللَّهِ) عَلى طَرِيقَةٍ تُسَمّى النَّحْتُ، وهو صَوْغُ فِعْلِ مُضِيٍّ عَلى زِنَةِ فَعْلَلَ مُؤَلَّفَةٍ مادَّتُهُ مِن حُرُوفِ جُمْلَةٍ أوْ حُرُوفِ مُرَكَّبٍ إضافِيٍّ، مِمّا يَنْطِقُ بِهِ النّاسُ اخْتِصارًا عَنْ ذِكْرِ الجُمْلَةِ كُلِّها لِقَصْدِ التَّخْفِيفِ لِكَثْرَةِ دَوَرانِ ذَلِكَ عَلى الألْسِنَةِ.<p>وقَدِ اسْتَعْمَلَ العَرَبُ النَّحْتَ في النَّسَبِ إلى الجُمْلَةِ أوِ المُرَكَّبِ إذا كانَ في النَّسَبِ إلى صَدْرِ ذَلِكَ أوْ إلى عَجُزِهِ التِباسٌ، كَما قالُوا في النِّسْبَةِ إلى عَبْدِ شَمْسٍ“ عَبْشَمِيٌّ ”خَشْيَةَ الِالتِباسِ بِالنَّسَبِ إلى عَبْدٍ أوْ إلى شَمْسٍ، وفي النِّسْبَةِ إلى عَبْدِ الدّارِ“ عَ
```

**2:255** — `length=23428`

```
<div class=ar lang=ar><p></p><p class="page-num">صفحة ١٧</p><span class="hlt"><span class="qpc-hafs">﴿اللَّهُ لا إلَهَ إلّا هو الحَيُّ القَيُّومُ لا تَأْخُذُهُ سِنَةٌ ولا نَوْمٌ لَهُ ما في السَّماواتِ وما في الأرْضِ مَن ذا الَّذِي يَشْفَعُ عِنْدَهُ إلّا بِإذْنِهِ يَعْلَمُ ما بَيْنَ أيْدِيهِمْ وما خَلْفَهم ولا يُحِيطُونَ بِشَيْءٍ مِن عِلْمِهِ إلّا بِما شاءَ وسِعَ كُرْسِيُّهُ السَّماواتِ والأرْضَ ولا يَئُودُهُ حِفْظُهُما وهْوَ العَلِيُّ العَظِيمُ﴾</span></span> .<p>لَمّا ذَكَرَ هَوْلَ يَوْمِ القِيامَةِ وذَكَرَ حالَ الكافِرِينَ اسْتَأْنَفَ بِذِكْرِ تَمْجِيدِ اللَّهِ تَعالى وذِكْرِ صِفاتِهِ إبْطالًا لِكُفْرِ الكافِرِينَ وقَطْعًا لِرَجائِهِمْ، لِأنَّ فِيها <span class="hlt"><span class="qpc-hafs">﴿مَن ذا الَّذِي يَشْفَعُ عِنْدَهُ إلّا بِإذْنِهِ﴾</span></span> وجُعِلَتْ هَذِهِ الآيَةُ ابْتِداءً
```

**112:1** — `length=11329`

```
<div class=ar lang=ar><p><span class="hlt"><span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span></span></p><p>افْتِتاحُ هَذِهِ السُّورَةِ بِالأمْرِ بِالقَوْلِ لِإظْهارِ العِنايَةِ بِما بَعْدَ فِعْلِ القَوْلِ كَما عَلِمْتَ ذَلِكَ عِنْدَ قَوْلِهِ تَعالى: <span class="hlt"><span class="qpc-hafs">﴿قُلْ يا أيُّها الكافِرُونَ﴾</span></span> <span class="ayah-tag">[الكافرون: ١]</span> .</p><p>ولِذَلِكَ الأمْرِ في هَذِهِ السُّورَةِ فائِدَةٌ أُخْرى، وهي أنَّها نَزَلَتْ عَلى سَبَبِ قَوْلِهِ تَعالى: <span class="hlt"><span class="qpc-hafs">﴿قُلْ يا أيُّها الكافِرُونَ﴾</span></span> <span class="ayah-tag">[الإسراء: ٨٥]</span> فَكانَ لِلْأمْرِ بِفِعْلِ (قُلْ) فائِدَتانِ.</p><p>وضَمِيرُ (هو) ضَ
```

### D. Quirks
- **Brackets**: `﴿…﴾` for Qurʾān; `(…)` round parens for cited words and section ids; left/right curly quotes `”…“` for embedded quotes.
- **HTML**: same stack as Alusi — `qpc-hafs`, `hlt`, `page-num` (3,749 rows), `ayah-tag` (3,670 rows — heaviest cross-ref user of any source).
- **Attribution**: `قال` in 3,325 rows, `روى` in 626. Far fewer narrator chains than Tabari/Ibn Kathir.
- **Isnad chains**: none.
- **Cross-references**: extensive — `<span class="ayah-tag">[الكافرون: ١]</span>` with Indic-Arabic numerals (`١`). Used most aggressively here.
- **Voweling**: fully voweled.
- **Page numbers**: Indic-Arabic (`صفحة ١٣٧`) — distinct from Alusi which uses Western numerals (`صفحة 39`).
- **Headings**: numbered Fawāʾid lists inline. No `<h3>`.

---

## 3. Tafsir al-Tabari (Jāmiʿ al-Bayān)
File: `ar-tafsir-al-tabari.db` (41.9 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 87,445 | 3,656 | 0 | 1,462 | 9,627 | 2,600 | 592 |

### B. Group structure
- Anchors: **3,636** / Followers: **2,600** / Multi-ayah anchors: **1,334**
- Largest group: `80:5` covers 13 ayahs (`80:5…80:17`)

### C. Samples
**1:1** — `length=36589`

```
<div class=ar lang=ar><p>القول في تأويل <span class="qpc-hafs">﴿بسم الله الرحمن الرحيم﴾</span></p><p>القول في تأويل قوله: <span class="qpc-hafs">﴿بِسْمِ﴾</span> .</p><p>قال أبو جعفر: إن الله تعالى ذكره وتقدَّست أسماؤه أدّب نبيه محمدًا ﷺ بتعليمه تقديمَ ذكر أسمائه الحسنى أمام جميع أفعاله، وتقدَّم إليه في وَصفه بها قبل جميع مُهمَّاته [[تقدم إليه بشيء: أمره بفعله أو إتيانه.]] ، وجعل ما أدّبه به من ذلك وعلَّمه إياه، منه لجميع خلقه سُنَّةً يستَنُّون بها [[يقول: جعل الله ذلك سنة منه لجميع خلقه يستنون بها. فقدم قوله "منه لجميع خلقه".]] ، وسبيلا يتَّبعونه عليها، فبه افتتاح أوائل منطقهم [[في المطبوعة: "في افتتاح. . . " والضمير في "فبه" عائد إلى "ما أدبه به".]] ، وصدور رسائلهم وكتبهم وحاجاتهم، حتى أغنت دلالة ما ظهر من قول القائل: "بسم الله"، على من بطن من مراده الذي هو محذوف.</p><p>وذلك أن الباء من "
```

**2:255** — `length=34018`

```
<div class=ar lang=ar><p>القول في تأويل قوله تعالى: <span class="qpc-hafs">﴿اللَّهُ لا إِلَهَ إِلا هُوَ الْحَيُّ الْقَيُّومُ﴾</span></p><p>قال أبو جعفر: قد دللنا فيما مضى على تأويل قوله:"الله" [[انظر تفسير"الله" فيما سلف ١: ١٢٢- ١٢٦.]] .</p><h3>* *</h3><p>وأما تأويل قوله:"لا إله إلا هو" فإن معناه: النهي عن أن يعبد شيء غير الله الحي القيوم الذي صفته ما وصف به نفسه تعالى ذكره في هذه الآية. يقول:"الله" الذي له عبادة الخلق="الحي القيوم"، لا إله سواه، لا معبود سواه، يعني: ولا تعبدوا شيئا سوى الحي القيوم الذي لا يأخذه سِنة ولا نوم، [[في المطبوعة: "ولا تعبدوا شيئا سواه الحي القيوم"، والصواب من المخطوطة.]] والذي صفته ما وصف في هذه الآية.</p><h3>* *</h3><p>وهذه الآية إبانة من الله تعالى ذكره للمؤمنين by في هذه الآية إبانة من الله تعالى ذكره للمؤمنين به وبرسوله عما جاءت به أقوال المختلفين في البينات= [[في المطبوعة: "المختلفين في البينات"، بزيادة"في
```

**112:1** — `ayah_key=112:1`, `group=112:1`, `to_ayah=112:4`, `ayah_keys=112:1,112:2,112:3,112:4`, `length=14157`

```
<div class=ar lang=ar><p>القول في تأويل قوله جل ثناؤه وتقدست أسماؤه: <span class="qpc-hafs">﴿قُلْ هُوَ اللَّهُ أَحَدٌ (١) اللَّهُ الصَّمَدُ (٢) لَمْ يَلِدْ وَلَمْ يُولَدْ (٣) وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ (٤) ﴾</span> .</p><p>ذُكر أن المشركين سألوا رسول الله ﷺ عن نسب ربّ العزّة، فأنزل الله هذه السورة جوابا لهم. وقال بعضهم: بل نزلت من أجل أن اليهود سألوه، فقالوا له: هذا الله خلق الخلق، فمن خلق الله؟ فأُنزلت جوابا لهم.</p><p>ذكر من قال: أنزلت جوابا للمشركين الذين سألوه أن ينسب لهم الربّ تبارك وتعالى.</p><p>⁕ حدثنا أحمد بن منيع المَرْوَزِي ومحمود بن خداش الطالَقاني، قالا ثنا أبو سعيد الصنعاني، قال: ثنا أبو جعفر الرازي، عن الربيع بن أنس، عن أبي العالية، عن أبي بن كعب، قال: قال المشركون للنبيّ ﷺ: انسُب لنا ربك، فأنزل الله: <span class="qpc-hafs">﴿قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ﴾<
```

### D. Quirks
- **Brackets**: `﴿…﴾` for Qurʾān; `"…"` ASCII double quotes for cited lexemes (not curly); `[[…]]` for editorial footnotes (2,288 rows).
- **HTML**: minimal — `<div class=ar>`, `<p>`, `<h3>* *</h3>` as section divider (3,300 rows). **NO** `hlt`, `page-num`, or `ayah-tag` classes.
- **Attribution**: classical `قال أبو جعفر:` (Tabari self-attribution) ubiquitous; explicit narrator chains `حدثنا…عن…قال` in 3,024 rows; `أخبرنا` in 1,954. This is the only source besides Kashshaf/Ibn Kathir with full isnad chains.
- **Isnad chains**: YES, abundant. Sample: `حدثنا أحمد بن منيع المَرْوَزِي ومحمود بن خداش الطالَقاني، قالا ثنا أبو سعيد الصنعاني، قال: ثنا أبو جعفر الرازي، عن الربيع بن أنس، عن أبي العالية، عن أبي بن كعب`. Riwāya separator `⁕` (U+2055 FLOWER PUNCTUATION MARK) introduces each chain.
- **Cross-references**: editorial only, inside `[[…]]` like `[[انظر تفسير"الله" فيما سلف ١: ١٢٢- ١٢٦.]]` — *editor's* page references, not in-text ayah refs.
- **Voweling**: **partial** — selective tashkīl, mostly on disambiguation points. Much lighter than Alusi/Ibn ʿĀshūr.
- **Headings**: `<h3>* *</h3>` literal asterisks as section break (Bulaq/Shakir edition style).

---

## 4. Tafsir al-Razi (Mafātīḥ al-Ghayb)
File: `tafsir-al-razi.db` (49.6 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 92,321 | 4,356 | 0 | 0 | 12,083 | 3,267 | 848 |

Note: **p50 = 0** — over half the rows are empty followers (3,267 rows are <100 chars, mostly 0). Anchors are very long when they appear.

### B. Group structure
- Anchors: **2,969** / Followers: **3,267** / Multi-ayah anchors: **1,440**
- Largest group: `26:123` covers 33 ayahs (`26:123…26:155`) — one of the widest in the corpus.

### C. Samples
**1:1** — `length=1965` (shorter than expected here; Razi's main 1:1 commentary appears split)

```
<div class=ar lang=ar><p>الباءَ في قَوْلِهِ: (بِسْمِ اللَّهِ) باءُ الإلْصاقِ وهي مُتَعَلِّقَةٌ بِفِعْلٍ، والتَّقْدِيرُ: بِاسْمِ اللَّهِ أشْرَعُ في أداءِ،الطّاعاتِ، وهَذا المَعْنى لا يَصِيرُ مُلَخَّصًا مَعْلُومًا إلّا بَعْدَ الوُقُوفِ عَلى أقْسامِ الطّاعاتِ وهي العَقائِدُ الحَقَّةُ والأعْمالُ الصّافِيَةُ مَعَ الدَّلائِلِ والبَيِّناتِ ومَعَ الأجْوِبَةِ عَنِ الشُّبُهاتِ، وهَذا المَجْمُوعُ رُبَّما زادَ عَلى عَشَرَةِ آلافِ مَسْألَةٍ.</p><p>ومِنَ اللَّطائِفِ أنَّ قَوْلَهُ: (أعُوذُ بِاللَّهِ) إشارَةٌ إلى نَفْيِ ما لا يَنْبَغِي مِنَ العَقائِدِ والأعْمالِ، وقَوْلَهُ: (بِسْمِ اللَّهِ) إشارَةٌ إلى ما يَنْبَغِي مِنَ الِاعْتِقاداتِ والعَمَلِيّاتِ فَقَوْلُهُ: (بِسْمِ اللَّهِ) لا يَصِيرُ مَعْلُومًا إلّا بَعْدَ الوُقُوفِ عَلى جَمِيعِ العَقائِدِ الحَقَّةِ والأعْمالِ الصّافِيَةِ وهَذا هو التَّرْتِيبُ الَّذِ
```

**2:255** — `length=44753`

```
<div class=ar lang=ar><p>قَوْلُهُ تَعالى: <span class="hlt"><span class="qpc-hafs">﴿اللَّهُ لا إلَهَ إلّا هو الحَيُّ القَيُّومُ لا تَأْخُذُهُ سِنَةٌ ولا نَوْمٌ لَهُ ما في السَّماواتِ وما في الأرْضِ مَن ذا الَّذِي يَشْفَعُ عِنْدَهُ إلّا بِإذْنِهِ يَعْلَمُ ما بَيْنَ أيْدِيهِمْ وما خَلْفَهم ولا يُحِيطُونَ بِشَيْءٍ مِن عِلْمِهِ إلّا بِما شاءَ وسِعَ كُرْسِيُّهُ السَّماواتِ والأرْضَ ولا يَئُودُهُ حِفْظُهُما وهو العَلِيُّ العَظِيمُ﴾</span></span> .</p><p>اعْلَمْ أنَّ مِن عادَتِهِ سُبْحانَهُ وتَعالى في هَذا الكِتابِ الكَرِيمِ أنَّهُ يَخْلِطُ هَذِهِ الأنْواعَ الثَّلاثَةَ بَعْضَها بِالبَعْضِ، أعْنِي عِلْمَ التَّوْحِيدِ، وعِلْمَ الأحْكامِ، وعِلْمَ القَصَصِ، والمَقْصُودُ مِن ذِكْرِ القَصَصِ إمّا تَقْرِيرُ دَلائِلِ التَّوْحِيدِ، وإمّا المُبالَغَةُ في إلْزامِ الأحْكامِ والتَّكالِيفِ، وهَذا الطَّرِيقُ هو
```

**112:1** — `length=28029`

```
<div class=ar lang=ar><p></p><p class="page-num">صفحة ١٦٠</p>(سُورَةُ الإخْلاصِ) .<p>أرْبَعُ آياتٍ، مَكِّيَّةٌ.</p><p>﷽</p><p><span class="hlt"><span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span></span> .</p><p>﷽</p><p><span class="hlt"><span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span></span> قَبْلَ الخَوْضِ في التَّفْسِيرِ لا بُدَّ مِن تَقْدِيمِ فُصُولٍ:</p><p>الفَصْلُ الأوَّلُ: رَوى أُبَيٌّ، قالَ: قالَ رَسُولُ اللَّهِ ﷺ: ”<span class="hlt">«مَن قَرَأ سُورَةَ“ <span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span></span> ”فَكَأنَّما قَرَأ ثُلُثَ القُرْآنِ وأُعْطِيَ مِنَ الأجْرِ عَشْرَ حَسَناتٍ بِعَدَدِ مَن أشَرَكَ بِاللَّهِ وآمَنَ بِاللَّهِ»  وقالَ عَلَيْهِ الصَّلاةُ والسَّلامُ:“ <span class="hlt">«مَن قَرَأ ”<span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span></span>“ مَرَّةً واحِد
```

### D. Quirks
- **Brackets**: `﴿…﴾` (Qurʾān); `(…)` round (1,420+ uses: surah titles, masāʾil markers like `(الفَصْلُ الأوَّلُ)`, target lexemes); `«…»` for hadith.
- **HTML**: full Alusi-style stack — `qpc-hafs` (2,968), `hlt`, `page-num` (2,655), `ayah-tag` (2,202).
- **Attribution**: 2,949 `قال`, 920 `روى`; no narrator chains (`حدثنا` = 0). Razi uses scholarly citation by name (e.g. `الفَصْلُ الأوَّلُ: رَوى أُبَيٌّ، قالَ:`) rather than full isnād.
- **Isnad chains**: none.
- **Structural markers**: `الفَصْلُ الأوَّلُ`, `المَسْألَةُ الأُولى` — Razi's hallmark masāʾil/fuṣūl numbered organization, inline in `<p>` rather than `<h3>`.
- **Bismillah glyph**: `﷽` (U+FDFD) literal between sections.
- **Voweling**: fully voweled.
- **Cross-references**: `ayah-tag` spans.

---

## 5. al-Bahr al-Muhit (Abū Ḥayyān)
File: `al-bahr-al-muhit.db` (34.3 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 61,305 | 2,934 | 0 | 0 | 12,147 | 4,809 | 772 |

p50 = 0 — **77% of rows are empty followers**; the grammatical commentary is heavily grouped onto pericope anchors.

### B. Group structure
- Anchors: **1,427** / Followers: **4,809** (highest in corpus) / Multi-ayah anchors: **843**
- Largest group: `26:27` covers **49 ayahs** (`26:27…26:75`) — the widest pericope in the corpus, ~4x median.

### C. Samples
**1:1** — `length=16664`

```
<div class=ar lang=ar><h3>* *</h3><p>(سُورَةُ أُمِّ القُرْآنِ)</p><p><span class="qpc-hafs">﴿بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ﴾</span> باءُ الجَرِّ تَأْتِي لِمَعانٍ: لِلْإلْصاقِ، والِاسْتِعانَةِ، والقَسَمِ، والسَّبَبِ، والحالِ، والظَّرْفِيَّةِ، والنَّقْلِ. فالإلْصاقُ حَقِيقَةً: مَسَحْتُ بِرَأْسِي، ومَجازًا مَرَرْتُ بِزَيْدٍ. والِاسْتِعانَةُ: ذَبَحْتُ بِالسِّكِّينِ. والسَّبَبُ: <span class="qpc-hafs">﴿فَبِظُلْمٍ مِنَ الَّذِينَ هادُوا حَرَّمْنا﴾</span> [النساء: ١٦٠] . والقَسَمُ: بِاللَّهِ لَقَدْ قامَ. والحالُ: جاءَ زَيْدٌ بِثِيابِهِ. والظَّرْفِيَّةُ: زَيْدٌ بِالبَصْرَةِ. والنَّقْلُ: قُمْتُ بِزَيْدٍ. وتَأْتِي زائِدَةً لِلتَّوْكِيدِ: شَرِبْنَ بِماءِ البَحْرِ، والبَدَلُ: فَلَيْتَ لِي بِهِمْ قَوْمًا أيْ بَدَلَهم، والمُجاوَزَةُ: <span class="qpc-ha
```

**2:255** — `length=22833`

```
<div class=ar lang=ar><p><span class="qpc-hafs">﴿لا إلَهَ إلّا هو الحَيُّ القَيُّومُ﴾</span> هَذِهِ الآيَةُ تُسَمّى آيَةَ الكُرْسِيِّ لِذِكْرِهِ فِيها، وثَبَتَ في (صَحِيحِ مُسْلِمٍ) مِن حَدِيثِ أُبَيٍّ أنَّها أعْظَمُ آيَةٍ، وفي (صَحِيحِ البُخارِيِّ) مِن حَدِيثِ أبِي هُرَيْرَةَ: أنَّ قارِئَها إذا آوى إلى فِراشِهِ لَنْ يَزالَ عَلَيْهِ مِنَ اللَّهِ حافِظٌ، ولا يَقْرَبُهُ شَيْطانٌ حَتّى يُصْبِحَ، ووَرَدَ أنَّها تَعْدِلُ ثُلُثَ القُرْآنِ، ووَرَدَ أنَّها ما قُرِئَتْ في دارٍ إلّا اهْتَجَرَتْها الشَّياطِينُ ثَلاثِينَ يَوْمًا، ولا يَدْخُلُها ساحِرٌ ولا ساحِرَةٌ أرْبَعِينَ يَوْمًا، ووَرَدَ أنَّ مَن قَرَأها إذا أخَذَ مَضْجَعَهُ أمَّنَهُ اللَّهُ عَلى نَفْسِهِ وجارِهِ وجارِ جارِهِ والأبْياتِ حَوْلَهُ، ووَرَدَ: أنَّ سَيِّدَ الكَلامِ القُرْآنُ، وسَيِّدَ القُرْآنِ البَقَرَةُ، وسَيِّدَ البَقَرَةِ آيَةُ الكُ
```

**112:1** — `ayah_keys=112:1,112:2,112:3,112:4`, `length=9422`

```
<div class=ar lang=ar><p>سُورَةُ الإخْلاصِ مَكِّيَّةٌ وهي أرْبَعُ آياتٍ</p><p>﷽</p><p><span class="qpc-hafs">﴿قُلْ هو اللَّهُ أحَدٌ﴾</span> <span class="qpc-hafs">﴿اللَّهُ الصَّمَدُ﴾</span> <span class="qpc-hafs">﴿لَمْ يَلِدْ ولَمْ يُولَدْ﴾</span> <span class="qpc-hafs">﴿ولَمْ يَكُنْ لَهُ كُفُوًا أحَدٌ﴾</span> .</p><p>الصَّمَدُ: فَعَلٌ بِمَعْنى مَفْعُولٍ مِن صَمَدَ إلَيْهِ إذا قَصَدَهُ، وهو السَّيِّدُ المَصْمُودُ إلَيْهِ في الحَوائِجِ ويَسْتَقِلُّ بِها، قالَ:</p><p>؎ألا بَكَّرَ النّاعِي بِخَيْرِ بَنِي أسَدِ بِعَمْرِو بْنِ مَسْعُودٍ بِالسَّيِّدِ الصَّمَدِ</p><p>(p-٧١٠)بِسْمِ اللهِ الرَحْمَنِ الرَحِيمِ</p><p>الكُفُوُ: النَّظِيرُ.</p>
```

### D. Quirks
- **Brackets**: `﴿…﴾` (Qurʾān); `(…)` for source-book titles (`(صَحِيحِ مُسْلِمٍ)`, `(صَحِيحِ البُخارِيِّ)`); inline `[Surah: ayah]` for cross-refs **without** the `ayah-tag` HTML wrapper (just bare brackets).
- **HTML**: lean — `<div class=ar>`, `<p>`, `<h3>* *</h3>` (176 rows). **NO** `hlt`, `page-num`, `ayah-tag` classes. Just `qpc-hafs`.
- **Poetry marker**: `؎` (U+061E ARABIC TRIPLE DOT PUNCTUATION MARK) precedes lines of poetry, e.g. `؎ألا بَكَّرَ النّاعِي بِخَيْرِ بَنِي أسَدِ`. Distinctive to Abū Ḥayyān; used for the shawāhid.
- **Hemistich separator**: `∗∗∗` between hemistichs (`عَلَوْتُهُ بِحُسامٍ ثُمَّ قُلْتُ لَهُ ∗∗∗ خُذْها`).
- **Attribution**: 1,414 `قال`, 789 `روى`; no isnad chains. Grammar-first, hadith via "ثَبَتَ في (صَحِيحِ ...) ".
- **Cross-references**: bare `[النساء: ١٦٠]` style, Indic-Arabic.
- **Voweling**: fully voweled.
- **Structure**: starts with grammatical enumeration: `باءُ الجَرِّ تَأْتِي لِمَعانٍ: لِلْإلْصاقِ، والِاسْتِعانَةِ، …` — instantly recognizable as Abū Ḥayyān's parsing/case-cataloging style.

---

## 6. al-Kashshaf (al-Zamakhsharī)
File: `al-kashshaf-al-zamakhshari.db` (12.6 MB — smallest)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 29,384 | **952** | 0 | 0 | 2,880 | 3,275 | **34** |

Smallest, leanest source by ~3x; only 34 rows above 10 KB; p90 less than half of any other source's p90.

### B. Group structure
- Anchors: **2,978** / Followers: **3,258** / Multi-ayah anchors: **1,409**
- Largest group: `53:33` covers 22 ayahs (`53:33…53:54`)

### C. Samples
**1:1** — `length=17980` (an outlier anchor; the Fatiha intro is unusually long)

```
<div class=ar lang=ar><p>مكية. وقيل مكية ومدنية لأنها نزلت بمكة مرة وبالمدينة أخرى. وتسمى أمّ القرآن لاشتمالها على المعاني التي في القرآن من الثناء على اللَّه تعالى بما هو أهله، ومن التعبد بالأمر والنهى، ومن الوعد والوعيد. وسورة الكنز والوافية لذلك. وسورة الحمد والمثاني لأنها تثنى في كل ركعة. وسورة الصلاة لأنها تكون فاضلة أو مجزئة بقراءتها فيها. وسورة الشفاء والشافية. وهي سبع آيات بالاتفاق، إلا أنّ منهم من عدّ أَنْعَمْتَ عَلَيْهِمْ دون التسمية، ومنهم من مذهبه على العكس.</p><p>قرّاء المدينة والبصرة والشأم وفقهاؤها على أنّ التسمية ليست بآية من الفاتحة ولا من غيرها من السور، وإنما كتبت للفصل والتبرك بالابتداء بها، كما بدأ بذكرها في كل أمر ذى بال، وهو مذهب أبى حنيفة رحمه اللَّه ومن تابعه، ولذلك لا يجهر بها عندهم في الصلاة. وقرّاء مكة والكوفة وفقهاؤهما على أنها آية من الفاتحة ومن كل سورة، وعليه
```

**2:255** — `length=11064`

```
<div class=ar lang=ar><p>الْحَيُّ الباقي الذي لا سبيل عليه للفناء، [[قوله «الحي الباقي الذي لا سبيل عليه ... الخ» المعتزلة يفرون من أن يثبتوا للَّه صفة وجودية كالحياة التي تنافى الموت فلذا فسر الحي بما قال. (ع)]] وهو على اصطلاح المتكلمين الذي يصح أن يعلم ويقدر. والْقَيُّومُ الدائم القيام بتدبير الخلق وحفظه. وقرئ: القيام، والقيم. والسنة: ما يتقدّم النوم من الفتور الذي يسمى النعاس. قال ابن الرقاع العاملي:</p><p>وَسْنَانُ أقْصَدَهُ النُّعَاسُ فَرَنَّقَتْ ... فِى عَيْنِهِ سِنَةٌ وَلَيْسَ بِنائِمِ [[لولا الحياء وإن رأسى قد عثى ... فيه المشيب لزرت أم القاسم
وكأنها بين النساء أعارها ... عينيه أحور من جآذر جاسم
وسنان أقصده النعاس فرنقت ... في عينه سنة وليس بنائم
لعدي بن الرقاع في تشبيب مدح الوليد بن عبد الملك. وعن الأصمعى: أنه لأحمد بن الرقاع. وعثى يعثى كسعي يسعى، وعاث يعيث كعاش
```

**112:1** — `ayah_keys=112:1,112:2,112:3,112:4`, `length=4597`

```
<div class=ar lang=ar><p>مكية، وقيل مدنية، وآياتها 4 «نزلت بعد الناس» بِسْمِ اللَّهِ الرَّحْمنِ الرَّحِيمِ</p><p>هُوَ ضمير الشأن، واللَّهُ أَحَدٌ هو الشأن، كقولك: هو زيد منطلق، كأنه قيل:</p><p>الشأن هذا، وهو أنّ الله واحد لا ثانى له. فإن قلت: ما محل هو؟ قلت: الرفع على الابتداء والخبر الجملة. فإن قلت: فالجملة الواقعة خبرا لا بد فيها من راجع إلى المبتدإ، فأين الراجع؟ قلت: حكم هذه الجملة حكم المفرد في قولك «زيد غلامك» في أنه هو المبتدأ في المعنى، وذلك أن قوله اللَّهُ أَحَدٌ هو الشأن الذي هو عبارة عنه، وليس كذلك «زيد أبوه منطلق» فإنّ زيدا والجملة يدلان على معنيين مختlf، فلا بد مما يصل بينهما. وعن ابن عباس: قالت قريش: يا محمد، صف لنا ربك الذي تدعونا إليه، فنزلت: yعnى: الذي سألتمونى وصفه هو الله، وأحد: بدل من قوله، الله. أو على: هو أحد، وهو بمعنى واحد، وأصله وحد. beكتاب
```

### D. Quirks
- **Brackets**: NO `﴿…﴾` ornate brackets — Qurʾānic text is inline, lightly voweled, **NOT** wrapped in `qpc-hafs` spans (`qpc-hafs` count = 0). Quoted phrases use `«…»`.
- **HTML**: skeletal — only `<div class=ar>` and `<p>`. No `hlt`, `qpc-hafs`, `page-num`, `ayah-tag`, `h3`. Most minimal of all sources.
- **Editorial footnotes**: heavy `[[…]]` use (1,952 rows) — editor's gloss embedded inline, e.g. `[[قوله «الحي الباقي ...» المعتزلة يفرون من أن يثبتوا للَّه صفة وجودية ... (ع)]]`. The `(ع)` marker is the editor (likely al-ʿAllāma) tag. These footnotes often have **Muʿtazilī rebuttals** — a doctrinal signal.
- **Attribution**: 2,138 `قال`, 791 `روى`; 82 `حدثنا`, 61 `أخبرنا` — modest but present.
- **Voweling**: **partial / stripped** — much lighter than other sources. Many Qurʾānic citations bare or barely voweled (e.g. `اللَّهُ أَحَدٌ` only partially).
- **Style**: dialectical `فَإنْ قُلْتَ ... قُلْتُ` (Zamakhsharī's iterative Q&A pattern). Visible in 112:1 sample.
- **Cross-references**: rare and informal.

---

## 7. al-Muharrar al-Wajiz (Ibn ʿAṭiyya)
File: `al-muharrar-al-wajiz-ibn-atiyyah.db` (19.0 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 25,478 | 1,573 | 0 | 0 | 6,172 | 4,565 | 135 |

Concise: 2nd shortest after Kashshaf. p90 only 6 KB.

### B. Group structure
- Anchors: **1,672** / Followers: **4,564** / Multi-ayah anchors: **1,458**
- Largest group: `26:141` covers 19 ayahs (`26:141…26:159`)

### C. Samples
**1:1** — `length=18661`

```
<div class=ar lang=ar><p>(p-٥٨)القَوْلُ في تَفْسِيرِ <span class="qpc-hafs">﴿بِسْمِ اللهِ الرَحْمَنِ الرَحِيمِ﴾</span></p><p>رُوِيَ عن جَعْفَرِ بْنِ مُحَمَّدٍ الصادِقِ، رَضِيَ اللهُ عنهُ أنَّهُ قالَ: البَسْمَلَةُ تِيجانُ السُوَرِ.</p><p>ورُوِيَ «أنَّ رَجُلًا قالَ بِحَضْرَةِ النَبِيِّ ﷺ: تَعِسَ الشَيْطانُ، فَقالَ رَسُولُ اللهِ ﷺ: لا تَقُلْ ذَلِكَ؛ فَإنَّهُ يَتَعاظَمُ عِنْدَهُ، ولَكِنْ قُلْ: بِسْمِ اللهِ الرَحْمَنِ الرَحِيمِ؛ فَإنَّهُ يَصْغُرُ حَتّى يَصِيرَ أقَلَّ مِن ذُبابٍ».</p><p>وقالَ عَلِيُّ بْنُ الحُسَيْنِ رَضِيَ اللهُ عنهُ في تَفْسِيرِ قَوْلِهِ تَعالى: <span class="qpc-hafs">﴿وَإذا ذَكَرْتَ رَبَّكَ في القُرْآنِ وحْدَهُ ولَّوْا عَلى أدْبارِهِمْ نُفُورًا﴾</span> [الإسراء: ٤٦] قالَ: مَعْناهُ: إذا قُلْتَ: (بِسْمِ اللهِ الرَحْمَنِ الرَحِيمِ).</p><p>ورُوِيَ عن جَعْفَرِ بْنِ مُحَمَّدٍ الصادِقِ، رَضِيَ اللهُ عنهُ
```

**2:255** — `length=9929`

```
<div class=ar lang=ar><p>قوله عزّ وجلّ:</p><p><span class="qpc-hafs">﴿اللهُ لا إلَهَ إلا هو الحَيُّ القَيُّومُ لا تَأْخُذُهُ سِنَةٌ ولا نَوْمٌ لَهُ ما في السَماواتِ وما في الأرْضِ مَن ذا الَّذِي يَشْفَعُ عِنْدَهُ إلا بِإذْنِهِ يَعْلَمُ ما بَيْنَ أيْدِيهِمْ وما خَلْفَهُمْ﴾</span></p><p>هَذِهِ الآيَةُ سَيِّدَةُ آيِ القُرْآنِ، ورَدَ ذَلِكَ في الحَدِيثِ، ووَرَدَ أنَّها تَعْدِلُ ثُلُثَ القُرْآنِ، ووَرَدَ أنَّ مَن قَرَأها أوَّلَ لَيْلِهِ لَمْ يَقْرَبْهُ شَيْطانٌ، وكَذَلِكَ مَن قَرَأها أوَّلَ (p-٢٣)نَهارِهِ. وهَذِهِ مُتَضَمِّنَةٌ التَوْحِيدَ، والصِفاتِ العُلى و"اللهُ" مُبْتَدَأٌ، و"لا إلَهَ" مُبْتَدَأٌ ثانٍ، وخَبَرُهُ مَحْذُوفٌ تَقْدِيرُهُ: "مَعْبُودٌ" أو "مَوْجُودٌ"، و"إلّا هُوَ" بَدَلٌ مِن مَوْضِعِ: "لا إلَهَ"، و"الحَيُّ" صِفَةٌ مِن صِفاتِ آلَيْها
```

**112:1** — `ayah_keys=112:1,112:2,112:3,112:4`, `length=4616`

```
<div class=ar lang=ar><p>(p-٧١٠)بِسْمِ اللهِ الرَحْمَنِ الرَحِيمِ</p><p>تَفْسِيرُ سُورَةِ [الإخْلاصِ]</p><p>هَذِهِ السُورَة مَكِّيَّةٌ، قالَهُ مُجاهِدٌ -بِخِلافٍ عنهُ- وعَطاءٌ وقَتادَةُ، وقالَ ابْنُ عَبّاسٍ، والقُرْطُبِيُّ وأبُو العالِيَةِ: هي مَدَنِيَّةٌ.</p><p>قوله عزّ وجلّ:</p><p><span class="qpc-hafs">﴿قُلْ هو اللهُ أحَدٌ﴾</span> <span class="qpc-hafs">﴿اللهُ الصَمَدُ﴾</span> <span class="qpc-hafs">﴿لَمْ يَلِدْ ولَمْ يُولَدْ﴾</span> <span class="qpc-hafs">﴿وَلَمْ يَكُنْ لَهُ كُفُوًا أحَدٌ﴾</span></p><p>قَرَأ عُمَرُ بْنُ الخَطّابِ، وابْنُ مَسْعُودٍ، والرَبِيعُ بْنُ خَيْثَمَ: "قُلْ هو اللهُ أحَدٌ الواحِدُ الصَمَدُ"، ورَوى أُبَيُّ بْنُ كَعْبٍ «أنَّ المُشْرِكِينَ سَألُوا رَسُولَ اللهِ ﷺ عن نَسَبِ رَبِّهِ -بِسْمِ اللهِ تَعالى عَمّا يَقُولُ الجاهِلُونَ- فَنَزَلَتْ هَذِهِ السُورَةُ،» ورَوى ابْنُ عَبّاسٍ «
```

### D. Quirks
- **Brackets**: `﴿…﴾` for Qurʾān (in `qpc-hafs`); `(…)` for paginations `(p-٥٨)` and `(بِسْمِ اللهِ ...)`; `«…»` for hadith; `[الإخْلاصِ]` for surah-name; `[Surah: ٤٦]` cross-refs.
- **HTML**: medium — `<div class=ar>`, `<p>`, `qpc-hafs` (1,670). **NO** `hlt`, `page-num`, `ayah-tag` classes. Has 25 `<h3>`.
- **Page markers**: distinctive `(p-٥٨)` / `(p-٢٣)` inline pagination (Latin "p" with Indic numeral), NOT a separate HTML span. No other source uses this format.
- **Allāh orthography quirk**: writes "اللهِ" (without shadda) rather than "اللَّهِ" — Maghribī manuscript convention, distinct from all other sources.
- **Attribution**: 1,648 `قال`, 1,090 `روى` (highest ratio of `روى`/total). No isnad chains.
- **Voweling**: fully voweled, but with the "اللهِ" exception.
- **Sectarian variants**: cites Shīʿī authorities (`جَعْفَرِ بْنِ مُحَمَّدٍ الصادِقِ`, `عَلِيُّ بْنُ الحُسَيْنِ`) within the first 800 chars of 1:1 — Andalusī ecumenical reception.
- **Concise** — even anchor-row tails are typically <6 KB.

---

## 8. Tafsir Ibn Kathir
File: `ar-tafsir-ibn-kathir.db` (27.3 MB)

### A. Length distribution
| n | min | max | avg | p10 | p50 | p90 | <100 | >10k |
|---|---|---|---|---|---|---|---|---|
| 6236 | 0 | 73,841 | 2,313 | 0 | 0 | 7,721 | 4,325 | 452 |

### B. Group structure
- Anchors: **1,911** / Followers: **4,325** / Multi-ayah anchors: **1,421**
- Largest group: `74:11` covers 20 ayahs (`74:11…74:30`)

### C. Samples
**1:1** — `length=53376`

```
<div class=ar lang=ar><p>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p><p>فَاتِحَةُ الْكِتَابِ</p><p>يُقَالُ لَهَا: الْفَاتِحَةُ، أَيْ فَاتِحَةُ الْكِتَابِ خَطًّا، وَبِهَا تُفْتَحُ [[في أ: "يفتتح".]] الْقِرَاءَةُ فِي الصَّلَاةِ [[في أ: "الصلوات".]] وَيُقَالُ لَهَا أَيْضًا: أُمُّ الْكِتَابِ عِنْدَ الْجُمْهُورِ، وَكَرِهَ أَنَسٌ، وَالْحَسَنُ وَابْنُ سِيرِينَ كَرِهَا تَسْمِيَتَهَا بِذَلِكَ، قَالَ الْحَسَنُ وَابْنُ سِيرِينَ: إِنَّمَا ذَلِكَ اللَّوْحُ الْمَحْفُوظُ، وَقَالَ الْحَسَنُ: الْآيَاتُ الْمُحْكَمَاتُ: هُنَّ أُمُّ الْكِتَابِ، وَلِذَا كَرِهَا [[في أ: "كذا".]] -أَيْضًا -أَنْ يُقَالَ لَهَا أُمُّ الْقُرْآنِ وَقَدْ ثَبَتَ فِي [الْحَدِيثِ] [[زِيَادَةٌ مِنْ أ.]] الصَّحِيحِ عِنْدَ التِّرْمِذِيِّ وَصَحَّحَهُ عَنْ أَبِي هُرَيْرَةَ قَالَ: قَالَ رَسُولُ اللَّهِ ﷺ: " الْحَمْدُ لِلَّهِ أُمُّ الْقُرْآنِ وَأُمُّ ال
```

**2:255** — `length=38245`

```
<div class=ar lang=ar><p>هَذِهِ آيَةُ الْكُرْسِيِّ وَلَهَا شَأْنٌ عَظِيمٌ قَدْ صَحَّ الْحَدِيثُ عَنْ رَسُولِ اللَّهِ ﷺ بِأَنَّهَا أَفْضَلُ آيَةٍ فِي كِتَابِ اللَّهِ. قَالَ الْإِمَامُ أَحْمَدُ: حَدَّثَنَا عَبْدُ الرَّزَّاقِ حَدَّثَنَا سُفْيَانُ عَنْ سَعِيدٍ الْجَرِيرِيِّ عَنْ أَبِي السَّلِيلِ عَنْ عَبْدِ اللَّهِ بْنِ رَبَاحٍ، عَنْ أُبَيٍّ -هُوَ ابْنُ كَعْبٍ-أَنَّ النَّبِيَّ ﷺ سَأَلَهُ: "أَيُّ آيَةٍ فِي كِتَابِ اللَّهِ أَعْظَمُ"؟ قَالَ: اللَّهُ وَرَسُولُهُ أَعْلَمُ. فَرَدَّدَهَا مِرَارًا ثُمَّ قَالَ أُبَيٌّ: آيَةُ الْكُرْسِيِّ. قَالَ: "لِيَهْنك الْعِلْمُ أَبَا الْمُنْذِرِ، وَالَّذِي نَفْسِي بِيَدِهِ إِنَّ لَهَا لِسَانًا وَشَفَتَيْنِ تُقَدِّسُ الْمَلِكَ عِنْدَ سَاقِ الْعَرْشِ" وَقَدْ رَوَاهُ مُسْلِمٌ عَنْ أَبِي بَكْرِ بْنِ أَبِي شَيْبَةَ عَنْ عَبْدِ الْأَعْلَى بْنِ عَبْدِ الْأَعْلَى عَنِ الْج
```

**112:1** — `ayah_keys=112:1,112:2,112:3,112:4`, `length=37557`

```
<div class=ar lang=ar><p>تَفْسِيرُ سُورَةِ الْإِخْلَاصِ</p><p>وَهِيَ مَكِّيَّةٌ.</p><p>ذِكْرُ سَبَبِ نُزُولِهَا وَفَضِيلَتِهَا [[في م، أ: "وفضلها".]]</p><p>قَالَ الْإِمَامُ أَحْمَدُ: حَدَّثَنَا أَبُو سَعْدٍ مُحَمَّدُ بْنُ مُيَسّر الصَّاغَانِيُّ، حَدَّثَنَا أَبُو جَعْفَرٍ الرَّازِيُّ، حَدَّثَنَا الرَّبِيعِ بْنُ أَنَسٍ، عَنْ أَبِي الْعَالِيَةِ، عَنْ أُبَيِّ بْنِ كَعْبٍ: أَنَّ الْمُشْرِكِينَ قَالُوا لِلنَّبِيِّ ﷺ: يَا مُحَمَّدُ، انْسُبْ لَنَا رَبَّكَ، فَأَنْزَلَ اللَّهُ: " قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ لَمْ يَلِدْ وَلَمْ يُو لَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ " [[المسند (٥/١٣٣) .]] .</p><p>отказ
```

### D. Quirks
- **Brackets**: `"…"` ASCII double quotes around quoted material (NOT `«…»` or `﴿…﴾` — the only narrative tafsir that uses ASCII quotes consistently); `[…]` for editorial insertions like `[الْحَدِيثِ]`; `[[…]]` for variant readings and editorial citations (1,857 rows).
- **HTML**: light — `<div class=ar>`, `<p>`, `<h3>` (1,311 rows used as section dividers). `qpc-hafs` only **partially** present (1,888 of 1,911 anchors — Qurʾānic citations sometimes wrapped, sometimes inline in quotes). NO `hlt`, `page-num`, `ayah-tag`.
- **Isnad chains**: YES, classical. Sample: `قَالَ الْإِمَامُ أَحْمَدُ: حَدَّثَنَا عَبْدُ الرَّزَّاقِ حَدَّثَنَا سُفْيَانُ عَنْ سَعِيدٍ الْجَرِيرِيِّ عَنْ أَبِي السَّلِيلِ عَنْ عَبْدِ اللَّهِ بْنِ رَبَاحٍ، عَنْ أُبَيٍّ`. 203 `حدثنا` rows.
- **Hadith book references**: `[[المسند (٥/١٣٣) .]]` — volume/page citations inline.
- **Voweling**: **fully voweled but with shadda+fatha-style hyperharakah** — visibly heavier than Tabari, distinctive of modern editions.
- **Cross-references**: editorial only (in `[[…]]`).
- **Tahriri convention**: `ﷺ` (U+FDFA) for ṣallallāhu ʿalayhi wa-sallam; appears across all sources but Ibn Kathir uses it densely.

---

## E. Cross-source comparison table

| source | n_rows | n_anchors | max_group_size | min_len | median_len | max_len | bracket_style | has_html | has_isnad | primary_quirk |
|---|---|---|---|---|---|---|---|---|---|---|
| Alusi | 6236 | 5629 | 8 | 0 | 3,103 | 97,652 | `﴿…﴾` + `«…»` + `(…)` | heavy: `hlt`,`qpc-hafs`,`page-num`,`ayah-tag` | no | most-anchored (90% anchor rate), encyclopedic, fully voweled |
| Ibn ʿĀshūr | 6236 | 3923 | 14 | 0 | 2,944 | 63,322 | `﴿…﴾` + `”…“` + `(…)` | heavy, heaviest `ayah-tag` use (3,670) | no | densest cross-references, modern literary style, Indic page numbers |
| Tabari | 6236 | 3636 | 13 | 0 | 1,462 | 87,445 | `﴿…﴾` + `"…"` + `[[…]]` | minimal: `<h3>* *</h3>` only | **yes** (3,024 ḥaddathanā) | full isnād chains with `⁕` riwāya separator; `قال أبو جعفر:` self-attribution; partial voweling |
| Razi | 6236 | 2969 | 33 | 0 | 0 | 92,321 | `﴿…﴾` + `«…»` + `(…)` | heavy, like Alusi | no | dialectical masāʾil/fuṣūl structure; `﷽` bismillah glyph; very wide pericope groups |
| Abū Ḥayyān | 6236 | 1427 | **49** | 0 | 0 | 61,305 | `﴿…﴾` + `(…)` + bare `[Surah: ayah]` | lean: only `qpc-hafs` | no | poetry markers `؎` and `∗∗∗`; widest pericope grouping; grammar-cataloging openings |
| Zamakhsharī | 6236 | 2978 | 22 | 0 | 0 | **29,384** | `«…»` + `[[…]]` only (NO `﴿…﴾`) | **skeletal** (no `qpc-hafs` at all) | yes (light: 82 ḥaddathanā) | shortest by 3x; Muʿtazilī editorial footnotes `(ع)`; partial voweling; `فإن قلت…قلت` dialectic |
| Ibn ʿAṭiyya | 6236 | 1672 | 19 | 0 | 0 | 25,478 | `﴿…﴾` + `«…»` + `[…]` + `(p-N)` | medium: `qpc-hafs` + 25 `<h3>` | no | `(p-N)` Maghribī page markers; `اللهِ` shadda-less orthography; cites Shīʿī authorities |
| Ibn Kathir | 6236 | 1911 | 20 | 0 | 0 | 73,841 | `"…"` ASCII + `[…]` + `[[…]]` | medium: `<h3>` (1,311) | **yes** (203 ḥaddathanā, but mostly `قال الإمام أحمد:` framed) | hadith-book volume/page refs `[[المسند (٥/١٣٣)]]`; ASCII double-quotes; heavy voweling |

### Empty-row counts (followers)
- Alusi 607, Ibn ʿĀshūr 2,313, Tabari 2,600, Razi 3,267, Abū Ḥayyān **4,809**, Zamakhsharī 3,258, Ibn ʿAṭiyya 4,564, Ibn Kathir 4,325.

### Voweling profile
- **Full**: Alusi, Ibn ʿĀshūr, Razi, Abū Ḥayyān, Ibn ʿAṭiyya, Ibn Kathir.
- **Partial/selective**: Tabari, Zamakhsharī.

### HTML stack profile
- **Full stack** (`hlt`+`qpc-hafs`+`page-num`+`ayah-tag`): Alusi, Ibn ʿĀshūr, Razi.
- **Just `qpc-hafs`**: Abū Ḥayyān, Ibn ʿAṭiyya.
- **`<h3>* *</h3>` skeleton, no Qurʾān spans**: Tabari.
- **`<h3>` only**: Ibn Kathir.
- **No Qurʾān spans, just `<div>`/`<p>`**: Zamakhsharī (uniquely minimal).
