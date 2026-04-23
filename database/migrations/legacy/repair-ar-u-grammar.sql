PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=TRUE;

-- Ensure the source table exists before legacy copy/rebuild logic runs.
CREATE TABLE IF NOT EXISTS ar_u_grammar (
  ar_u_grammar     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  grammar_id       TEXT NOT NULL UNIQUE,
  category         TEXT,
  sub_category     TEXT,
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  lookup_keys_json JSON CHECK (lookup_keys_json IS NULL OR json_valid(lookup_keys_json)),
  canonical_norm   TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

-- Stage a raw copy of the current data (legacy schema columns only).
DROP TABLE IF EXISTS ar_u_grammar_raw;
CREATE TABLE ar_u_grammar_raw (
  ar_u_grammar     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  grammar_id       TEXT NOT NULL UNIQUE,
  category         TEXT,
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL,
  updated_at       TEXT
);

INSERT INTO ar_u_grammar_raw (
  ar_u_grammar,
  canonical_input,
  grammar_id,
  category,
  title,
  title_ar,
  definition,
  definition_ar,
  meta_json,
  created_at,
  updated_at
)
SELECT
  ar_u_grammar,
  canonical_input,
  grammar_id,
  category,
  title,
  title_ar,
  definition,
  definition_ar,
  meta_json,
  created_at,
  updated_at
FROM ar_u_grammar;

-- Rebuild the main table with the latest schema.
DROP TABLE IF EXISTS ar_u_grammar;
CREATE TABLE IF NOT EXISTS ar_u_grammar (
  ar_u_grammar     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  grammar_id       TEXT NOT NULL UNIQUE,
  category         TEXT,
  sub_category     TEXT,
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  lookup_keys_json JSON CHECK (lookup_keys_json IS NULL OR json_valid(lookup_keys_json)),
  canonical_norm   TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL,
  updated_at       TEXT
);

-- Recreate indexes (dropped with the table).
CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_category ON ar_u_grammar(category);
CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_grammar_id ON ar_u_grammar(grammar_id);
CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_canonical_norm ON ar_u_grammar(canonical_norm);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_u_grammar_canonical_norm
  ON ar_u_grammar(canonical_norm)
  WHERE canonical_norm IS NOT NULL AND canonical_norm <> '';

-- Copy rows and split dotted category into category/sub_category.
INSERT INTO ar_u_grammar (
  ar_u_grammar,
  canonical_input,
  grammar_id,
  category,
  sub_category,
  title,
  title_ar,
  definition,
  definition_ar,
  lookup_keys_json,
  canonical_norm,
  meta_json,
  created_at,
  updated_at
)
SELECT
  ar_u_grammar,
  canonical_input,
  grammar_id,
  CASE
    WHEN category LIKE '%.%' THEN substr(category, 1, instr(category, '.') - 1)
    ELSE category
  END AS category,
  CASE
    WHEN category LIKE '%.%' THEN substr(category, instr(category, '.') + 1)
    ELSE NULL
  END AS sub_category,
  title,
  title_ar,
  definition,
  definition_ar,
  NULL AS lookup_keys_json,
  NULL AS canonical_norm,
  meta_json,
  created_at,
  updated_at
FROM ar_u_grammar_raw;

-- Remove legacy "gram|..." rows. Canonical replacements will be inserted below.
DELETE FROM ar_u_grammar
WHERE canonical_input LIKE 'gram|%';

-- iʿrāb states
UPDATE ar_u_grammar
SET category='nahw', sub_category='irab',
    title='Rafʿ (nominative / indicative)', title_ar='الرفع',
    definition='A core iʿrāb state: nouns are marfūʿ in specific syntactic roles; the imperfect verb is marfūʿ when not preceded by a nāṣib or jāzim.',
    definition_ar='الرفع حالةٌ إعرابية يكون فيها الاسم في مواضعَ مخصوصة، ويكون فيها الفعل المضارع إذا لم يسبقه ناصبٌ ولا جازمٌ.',
    canonical_norm='raf',
    meta_json='{"ilm":"nahw","group":"irab","source":"lesson-authoring"}'
WHERE canonical_input='grammar|raf';

UPDATE ar_u_grammar
SET category='nahw', sub_category='irab',
    title='Naṣb (accusative / subjunctive)', title_ar='النصب',
    definition='A core iʿrāb state: nouns are manṣūb in common roles like objects; the imperfect verb becomes manṣūb after particles of نصب.',
    definition_ar='النصب حالةٌ إعرابية يكون فيها الاسم في مواضعَ شائعة كالمفاعيل، ويُنصب الفعلُ المضارع إذا سبقته أدواتُ النصب.',
    canonical_norm='nasb',
    meta_json='{"ilm":"nahw","group":"irab","source":"lesson-authoring"}'
WHERE canonical_input='grammar|nasb';

UPDATE ar_u_grammar
SET category='nahw', sub_category='irab',
    title='Jarr (genitive)', title_ar='الجر',
    definition='A core iʿrāb state of nouns, typically caused by prepositions, iḍāfa, or following a majrūr term.',
    definition_ar='الجر حالةٌ إعرابية للأسماء، يكون بسبب حروف الجر أو الإضافة أو التبعية لمجرور.',
    canonical_norm='jarr',
    meta_json='{"ilm":"nahw","group":"irab","source":"lesson-authoring"}'
WHERE canonical_input='grammar|jarr';

UPDATE ar_u_grammar
SET category='nahw', sub_category='irab',
    title='Jazm (jussive)', title_ar='الجزم',
    definition='A core iʿrāb state (mood) of the imperfect verb when preceded by jussive أدوات الجزم.',
    definition_ar='الجزم حالةٌ إعرابية (جزم) للفعل المضارع إذا سبقته أدواتُ الجزم.',
    canonical_norm='jazm',
    meta_json='{"ilm":"nahw","group":"irab","source":"lesson-authoring"}'
WHERE canonical_input='grammar|jazm';

-- Verbal sentence: fix placeholder title/arabic/id
UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    grammar_id='JUMALA_FIʿLIYYA',
    title='Verbal sentence (jumla fiʿliyya)', title_ar='الجملة الفعلية',
    definition='A sentence whose core predication is verbal: it consists of a verb and a subject (and may take an object).',
    definition_ar='جملةٌ ركنُها فعلٌ، وتتألف من فعلٍ وفاعلٍ، وقد تتعدّى إلى مفعولٍ به.',
    canonical_norm='jumala_fiiliyya',
    meta_json='{"ilm":"nahw","group":"jumal"}'
WHERE canonical_input='grammar|jumala_fiiliyya';

-- Shibh jumla / jar-majrur / zarf
UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Semi-sentence (shibh jumla)', title_ar='شبه الجملة',
    definition='A non-finite phrase functioning like a clause in syntax: typically a prepositional phrase (jar+majrūr) or an adverbial phrase (ẓarf).',
    definition_ar='تركيبٌ يؤدي وظيفةً نحويةً دون أن يكون جملةً تامة، وغالبًا يكون جارًّا ومجرورًا أو ظرفًا.',
    canonical_norm='shibh_jumla',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|shibh_jumla';

UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Prepositional phrase (jar wa majrūr)', title_ar='جار ومجرور',
    definition='A preposition (ḥarf jarr) plus its governed noun (ism majrūr), often functioning as shibh jumla.',
    definition_ar='تركيب يتألف من حرف جر واسمٍ مجرورٍ بعده، ويكون غالبًا شبهَ جملة.',
    canonical_norm='jar_majrur',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|jar_majrur';

UPDATE ar_u_grammar
SET category='nahw', sub_category='mansubat',
    title='Adverbial (ẓarf)', title_ar='الظرف',
    definition='A manṣūb noun indicating time or place and conveying the meaning of “in” (fi); it is also called al-mafʿūl fīh.',
    definition_ar='اسمٌ منصوب يدل على زمان وقوع الحدث أو مكانه، ويفيد معنى «في»، ويسمى المفعولَ فيه.',
    canonical_norm='zarf',
    meta_json='{"ilm":"nahw","group":"mansubat","source":"lesson-authoring"}'
WHERE canonical_input='grammar|zarf';

-- Mubtada / faʿil / mafʿūl / ḥāl / tamyīz / nidāʾ
UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Subject of nominal sentence (mubtadaʾ)', title_ar='المبتدأ',
    definition='The noun placed first in a nominal sentence to be spoken about (musnad ilayh).',
    definition_ar='اسمٌ يُوضَع ليُخبَرَ عنه (مسندٌ إليه) في الجملة الاسمية.',
    canonical_norm='mubtada',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|mubtada';

UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Subject (fāʿil)', title_ar='الفاعل',
    definition='A marfūʿ noun (or equivalent) indicating the doer of the action in an active verb clause.',
    definition_ar='اسمٌ مرفوع يدل على من قام بالفعل في الجملة الفعلية.',
    canonical_norm='fail',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|fail';

UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Direct object (mafʿūl bihi)', title_ar='المفعول به',
    definition='A noun or phrase indicating what the action falls upon; it is typically manṣūb.',
    definition_ar='اسمٌ أو تركيب يدل على من وقع عليه الفعل، ويكون غالبًا منصوبًا.',
    canonical_norm='maful_bih',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|maful_bih';

UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Absolute object (mafʿūl muṭlaq)', title_ar='المفعول المطلق',
    definition='A maṣdar placed in naṣb after its verb (or its meaning) for emphasis, type, or number.',
    definition_ar='مصدرٌ منصوب يأتي بعد فعله (أو معناه) للتوكيد أو لبيان النوع أو العدد.',
    canonical_norm='maful_mutlaq',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|maful_mutlaq';

UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Circumstantial accusative (ḥāl)', title_ar='الحال',
    definition='A manṣūb descriptive word/phrase expressing the state in which the action occurs.',
    definition_ar='وصفٌ منصوب يُؤتى به لبيان هيئة صاحب الحال عند وقوع الفعل.',
    canonical_norm='hal',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|hal';

UPDATE ar_u_grammar
SET category='nahw', sub_category='jumal',
    title='Specification (tamyīz)', title_ar='التمييز',
    definition='An explanatory noun (often manṣūb) that removes ambiguity from a preceding word or expression.',
    definition_ar='اسمٌ يرفع إبهامَ ما قبله ويُبيّن المقصود، ويكون كثيرًا منصوبًا.',
    canonical_norm='tamyiz',
    meta_json='{"ilm":"nahw","group":"jumal","source":"lesson-authoring"}'
WHERE canonical_input='grammar|tamyiz';

UPDATE ar_u_grammar
SET category='nahw', sub_category='nida',
    title='Vocative phrase (nidāʾ)', title_ar='النداء',
    definition='A construction used to call/attract the addressee, built from a vocative particle and a called noun (munādā).',
    definition_ar='أسلوبٌ يُستعمل لطلب إقبال المنادى ولفت انتباهه، ويتألف من حرف نداء ومنادى.',
    canonical_norm='nida',
    meta_json='{"ilm":"nahw","group":"nida","source":"lesson-authoring"}'
WHERE canonical_input='grammar|nida';

UPDATE ar_u_grammar
SET category='nahw', sub_category='nida',
    title='Vocative noun (munādā)', title_ar='المنادى',
    definition='The noun addressed after a vocative particle (e.g., يا).',
    definition_ar='اسمٌ يُنادى بعد حرف النداء مثل: يا زيدُ.',
    canonical_norm='munada',
    meta_json='{"ilm":"nahw","group":"nida","source":"lesson-authoring"}'
WHERE canonical_input='grammar|munada';

-- Idāfa: fix missing mudaf-ilayh row
UPDATE ar_u_grammar
SET category='nahw', sub_category='majrurat',
    title='Second term of iḍāfa (muḍāf ilayh)', title_ar='المضاف إليه',
    definition='The second noun in an iḍāfa construction; it is always majrūr.',
    definition_ar='الاسم الثاني في التركيب الإضافي، وهو مجرورٌ دائمًا.',
    canonical_norm='mudaf_ilayh',
    meta_json='{"ilm":"nahw","group":"majrurat","source":"lesson-authoring"}'
WHERE canonical_input='grammar|mudaf_ilayh';

-- Nawāsikh: fill INNA and related roles
UPDATE ar_u_grammar
SET category='nahw', sub_category='nawasikh',
    title='Inna and sisters (ʾinna wa akhawātuhā)', title_ar='إن وأخواتها',
    definition='Particles that enter a nominal sentence: they make the mubtada (ism) manṣūb and keep the khabar marfūʿ.',
    definition_ar='حروفٌ تدخل على الجملة الاسمية فتنصب المبتدأ (اسمها) وترفع الخبر (خبرها).',
    canonical_norm='inna_wa_akhawatuha',
    meta_json='{"ilm":"nahw","group":"nawasikh","source":"lesson-authoring"}'
WHERE canonical_input='grammar|inna_wa_akhawatuha';

UPDATE ar_u_grammar
SET category='nahw', sub_category='nawasikh',
    title='Ism of inna (ism ʾinna)', title_ar='اسم إن',
    definition='The noun governed by ʾinna and its sisters; it is manṣūb.',
    definition_ar='الاسم الواقع بعد «إنَّ» وأخواتها، وهو منصوب.',
    canonical_norm='ism_inna',
    meta_json='{"ilm":"nahw","group":"nawasikh","source":"lesson-authoring"}'
WHERE canonical_input='grammar|ism_inna';

UPDATE ar_u_grammar
SET category='nahw', sub_category='nawasikh',
    title='Khabar of inna (khabar ʾinna)', title_ar='خبر إن',
    definition='The predicate after ʾinna and its sisters; it remains marfūʿ.',
    definition_ar='الخبر الواقع بعد «إنَّ» وأخواتها، وهو مرفوع.',
    canonical_norm='khabar_inna',
    meta_json='{"ilm":"nahw","group":"nawasikh","source":"lesson-authoring"}'
WHERE canonical_input='grammar|khabar_inna';

-- Prohibitive la
UPDATE ar_u_grammar
SET category='nahw', sub_category='nafy',
    title='Prohibitive lā (lā الناهية)', title_ar='لا الناهية',
    definition='A prohibitive particle that requests stopping/avoiding an action; it jussives the imperfect verb.',
    definition_ar='حرف نهي يفيد النهي عن الفعل وطلب الكفّ عنه، ويجزم الفعل المضارع.',
    canonical_norm='la_nahiya',
    meta_json='{"ilm":"nahw","group":"nafy","source":"lesson-authoring"}'
WHERE canonical_input='grammar|la_nahiya';

-- Tawābiʿ placeholders (naat/mawsuf/badal/maʿtūf)
UPDATE ar_u_grammar
SET category='nahw', sub_category='tawabi',
    title='Adjective (naʿt)', title_ar='النعت',
    definition='A modifier used to specify or describe a preceding noun; it follows the noun in iʿrāb.',
    definition_ar='وصفٌ يُستعمل لتحديد اسمٍ قبله أو تخصيصه، ويتبع منعوتَه في الإعراب.',
    canonical_norm='naat',
    meta_json='{"ilm":"nahw","group":"tawabi"}'
WHERE canonical_input='grammar|naat';

UPDATE ar_u_grammar
SET category='nahw', sub_category='tawabi',
    title='Described noun (mawṣūf / manʿūt)', title_ar='الموصوف',
    definition='The noun being described by an adjective (naʿt).',
    definition_ar='الاسم الذي تُذكر له صفةٌ (نعت) لتوضيحه أو تخصيصه.',
    canonical_norm='mawsuf',
    meta_json='{"ilm":"nahw","group":"tawabi","source":"lesson-authoring"}'
WHERE canonical_input='grammar|mawsuf';

UPDATE ar_u_grammar
SET category='nahw', sub_category='tawabi',
    title='Apposition (badal)', title_ar='البدل',
    definition='A follower noun that clarifies or replaces what comes before it (al-mubdal minhu).',
    definition_ar='تابعٌ يذكر بعد اسم قبله لتوضيحه أو لإبداله، ويسمى الأول مبدلًا منه.',
    canonical_norm='badal',
    meta_json='{"ilm":"nahw","group":"tawabi","source":"lesson-authoring"}'
WHERE canonical_input='grammar|badal';

UPDATE ar_u_grammar
SET category='nahw', sub_category='tawabi',
    title='Conjoined term (maʿṭūf)', title_ar='المعطوف',
    definition='The follower element joined by a conjunction particle to what comes before.',
    definition_ar='تابعٌ يتصل بما قبله بواسطة حرف عطف.',
    canonical_norm='maatuf',
    meta_json='{"ilm":"nahw","group":"tawabi","source":"lesson-authoring"}'
WHERE canonical_input='grammar|maatuf';

-- Pronouns & demonstratives & relatives
UPDATE ar_u_grammar
SET category='nahw', sub_category='damaair',
    title='Detached pronoun (ḍamīr munfaṣil)', title_ar='ضمير منفصل',
    definition='A pronoun written independently (not attached to another word).',
    definition_ar='ضميرٌ يُكتب مستقلا غير متصلٍ بكلمة قبله.',
    canonical_norm='damir_munfasil',
    meta_json='{"ilm":"nahw","group":"damaair","source":"lesson-authoring"}'
WHERE canonical_input='grammar|damir_munfasil';

UPDATE ar_u_grammar
SET category='nahw', sub_category='damaair',
    title='Attached pronoun (ḍamīr muttaṣil)', title_ar='ضمير متصل',
    definition='A pronoun written attached to the preceding word (verb, noun, or particle), serving roles like subject, object, or possessor.',
    definition_ar='ضميرٌ يُكتب متصلًا بما قبله (فعلًا أو اسمًا أو حرفًا) ويقع فاعلًا أو مفعولًا أو مضافًا إليه ونحو ذلك.',
    canonical_norm='damir_muttasil',
    meta_json='{"ilm":"nahw","group":"damaair","source":"lesson-authoring"}'
WHERE canonical_input='grammar|damir_muttasil';

UPDATE ar_u_grammar
SET category='nahw', sub_category='ism',
    title='Demonstrative (ism al-ishāra)', title_ar='اسم إشارة',
    definition='Words used to point to and specify referents (near or far), like هذا/ذلك.',
    definition_ar='أسماءٌ تُستخدم لتعيين الأشياء بالإشارة إليها، مثل: هذا، تلك.',
    canonical_norm='ism_ishara',
    meta_json='{"ilm":"nahw","group":"ism","source":"lesson-authoring"}'
WHERE canonical_input='grammar|ism_ishara';

UPDATE ar_u_grammar
SET category='nahw', sub_category='ism',
    title='Relative pronoun (ism mawṣūl)', title_ar='اسم موصول',
    definition='A noun used for specification via a following clause called ṣilat al-mawṣūl (e.g., الذي…).',
    definition_ar='اسمٌ يُستخدم للتعيين بوساطة جملةٍ بعده تُسمى صلة الموصول، مثل: الذي.',
    canonical_norm='ism_mawsul',
    meta_json='{"ilm":"nahw","group":"ism","source":"lesson-authoring"}'
WHERE canonical_input='grammar|ism_mawsul';

UPDATE ar_u_grammar
SET category='nahw', sub_category='ism',
    title='Relative clause (ṣilat al-mawṣūl)', title_ar='صلة الموصول',
    definition='A clause after the relative pronoun that completes its meaning; it is called ṣilat al-mawṣūl.',
    definition_ar='جملةٌ تُذكر بعد الاسم الموصول فتتم معناه وتسمى صلة الموصول.',
    canonical_norm='silat_mawsul',
    meta_json='{"ilm":"nahw","group":"ism","source":"lesson-authoring"}'
WHERE canonical_input='grammar|silat_mawsul';

-- Sarf placeholders: maṣdar / ṣifa mushabbaha / ism tafdil
UPDATE ar_u_grammar
SET category='sarf', sub_category='mushtaqat',
    title='Verbal noun (maṣdar)', title_ar='المصدر',
    definition='A noun derived from a verb root indicating the action/event (e.g., كتب كتابةً).',
    definition_ar='اسمٌ يدل على الحدث مجردًا من الزمان، ويُشتق من الفعل مثل: كتب كتابةً.',
    canonical_norm='masdar',
    meta_json='{"ilm":"sarf","group":"mushtaqat","source":"lesson-authoring"}'
WHERE canonical_input='grammar|masdar';

UPDATE ar_u_grammar
SET category='sarf', sub_category='mushtaqat',
    title='Adjective resembling participle (ṣifa mushabbaha)', title_ar='الصفة المشبهة',
    definition='A derived adjective (often from intransitives) indicating a stable quality (e.g., جميل).',
    definition_ar='صفةٌ مشتقة تدل على ثبوت الصفة غالبًا، وتكون كثيرًا من اللازم مثل: جميل.',
    canonical_norm='sifa_mushabbaha',
    meta_json='{"ilm":"sarf","group":"mushtaqat","source":"lesson-authoring"}'
WHERE canonical_input='grammar|sifa_mushabbaha';

UPDATE ar_u_grammar
SET category='sarf', sub_category='mushtaqat',
    title='Elative / comparative (ism al-tafḍīl)', title_ar='اسم التفضيل',
    definition='A derived form expressing “more/most …” (comparative/superlative).',
    definition_ar='اسمٌ مشتق يدل على المشاركة في صفة مع زيادة أحد الطرفين فيها، مثل: أكبر.',
    canonical_norm='ism_tafdil',
    meta_json='{"ilm":"sarf","group":"mushtaqat","source":"lesson-authoring"}'
WHERE canonical_input='grammar|ism_tafdil';

-- Plural placeholder "jam"
UPDATE ar_u_grammar
SET category='nahw', sub_category='adad',
    title='Plural (jamʿ)', title_ar='الجمع',
    definition='A form indicating more than two in Arabic; major types include sound plurals and broken plural.',
    definition_ar='ما دل على أكثر من اثنين في العربية، ومن أنواعه: جمع سالم وجمع تكسير.',
    canonical_norm='jam',
    meta_json='{"ilm":"nahw","group":"adad","source":"lesson-authoring"}'
WHERE canonical_input='grammar|jam';

-- General ellipsis (hadhf) placeholder
UPDATE ar_u_grammar
SET category='nahw', sub_category='hadhf',
    title='Ellipsis (ḥadhf)', title_ar='الحذف',
    definition='Omission of a word/segment whose meaning is understood from context or a grammatical indicator.',
    definition_ar='إسقاط لفظٍ أو جزءٍ من الكلام مع دلالةٍ عليه من السياق أو القرينة.',
    canonical_norm='hadhf',
    meta_json='{"ilm":"nahw","group":"hadhf","source":"lesson-authoring"}'
WHERE canonical_input='grammar|hadhf';

-- Insert canonical replacements for deleted "gram|..." rows

-- (a) Nahw predicate (disambiguated from balagha "grammar|khabar")
INSERT INTO ar_u_grammar (
  ar_u_grammar, canonical_input, grammar_id,
  category, sub_category, title, title_ar,
  definition, definition_ar,
  lookup_keys_json, canonical_norm,
  meta_json, created_at, updated_at
) VALUES (
  '5735d12fcf4dfa29b4d9b41ae36a1bff9f1390eeac4b185527f15a0a1a2e98bf',
  'grammar|khabar_nahw',
  'KHABAR',
  'nahw', 'jumal',
  'Predicate (khabar)',
  'الخبر',
  'What is stated about the mubtadaʾ to complete the meaning of a nominal sentence.',
  'ما يُخبر به عن المبتدأ ليتمّ معنى الجملة الاسمية.',
  '{"ar":["الخبر"],"en":["khabar","predicate"],"aliases":["gram|khabar"],"id":["KHABAR"]}',
  'khabar_nahw',
  '{"ilm":"nahw","group":"jumal"}',
  datetime('now'),
  NULL
);

-- (b) Idāfa + muḍāf
INSERT INTO ar_u_grammar (
  ar_u_grammar, canonical_input, grammar_id,
  category, sub_category, title, title_ar,
  definition, definition_ar,
  lookup_keys_json, canonical_norm,
  meta_json, created_at, updated_at
) VALUES
(
  'f029f6e1015ffcf597440c4557d24bbd5f8932ea5dbd70c9bbaa2e51b3db4995',
  'grammar|idafa',
  'IDAFA',
  'nahw', 'majrurat',
  'Genitive construction (iḍāfa)',
  'الإضافة',
  'A two-noun construction: first is muḍāf, second is muḍāf ilayh (always majrūr), used for specification/possession.',
  'تركيبٌ يتألف من مضافٍ ومضافٍ إليه (مجرور دائمًا) ويُستعمل للتخصيص والملكية ونحو ذلك.',
  '{"ar":["الإضافة","التركيب الإضافي"],"en":["idafa","iḍāfa","genitive construction"],"aliases":["gram|idafa"],"id":["IDAFA"]}',
  'idafa',
  '{"ilm":"nahw","group":"majrurat"}',
  datetime('now'),
  NULL
),
(
  '6d395e7a78551050164372004c2fa8dd35312000bc6ecea944f8a02999e324b6',
  'grammar|mudaf',
  'MUDAF',
  'nahw', 'majrurat',
  'First term of iḍāfa (muḍāf)',
  'المضاف',
  'The first noun in iḍāfa; it precedes the muḍāf ilayh and typically drops tanwīn.',
  'الاسم الأول في الإضافة، يسبق المضاف إليه، ويُحذف تنوينه غالبًا.',
  '{"ar":["المضاف"],"en":["mudaf","muḍāf"],"aliases":["gram|mudaf"],"id":["MUDAF"]}',
  'mudaf',
  '{"ilm":"nahw","group":"majrurat"}',
  datetime('now'),
  NULL
);

-- (c) Verb tenses/aspects
INSERT INTO ar_u_grammar (
  ar_u_grammar, canonical_input, grammar_id,
  category, sub_category, title, title_ar,
  definition, definition_ar,
  lookup_keys_json, canonical_norm,
  meta_json, created_at, updated_at
) VALUES
(
  '42ff0d728bf2d751805767666bd73ffee093cacd16a728134412a2e5212fe91e',
  'grammar|fiil_madi',
  'FIIL_MADI',
  'nahw', 'afal',
  'Past tense verb (fiʿl māḍī)',
  'الفعل الماضي',
  'A verb form indicating a completed action (typically past); it is mabnī (built).',
  'فعلٌ يدل على حدثٍ وقع وانقضى غالبًا، وهو مبنيّ.',
  '{"ar":["الفعل الماضي"],"en":["fiil madi","fiʿl maadi","past tense"],"aliases":["gram|fiil_madi"],"id":["FIIL_MADI"]}',
  'fiil_madi',
  '{"ilm":"nahw","group":"afal"}',
  datetime('now'),
  NULL
),
(
  '7e4587c4edcb6ab80fd33bc4bfe44fee7e046a8c689c99761ab357ccdb469757',
  'grammar|fiil_mudari',
  'FIʿL_MUDARIʿ',
  'nahw', 'afal',
  'Imperfect verb (fiʿl muḍāriʿ)',
  'الفعل المضارع',
  'A verb form indicating present/future; it is muʿrab by default and can be marfūʿ/manṣūb/majzūm depending on particles.',
  'فعلٌ يدل على الحال أو الاستقبال غالبًا، وهو معرب في الأصل ويكون مرفوعًا أو منصوبًا أو مجزومًا بحسب الأدوات.',
  '{"ar":["الفعل المضارع"],"en":["fiil mudari","fiʿl muḍāriʿ","imperfect"],"aliases":["gram|fiʿl_mudariʿ","gram|fiil_mudari","gram|fiil_mudariʿ"],"id":["FIʿL_MUDARIʿ"]}',
  'fiil_mudari',
  '{"ilm":"nahw","group":"afal"}',
  datetime('now'),
  NULL
),
(
  'ec25dbe8093c7ae23808f984fec8b4e2d4a79c8f63329c52ccc25087e1a8bad8',
  'grammar|fiil_amr',
  'FIIL_AMR',
  'nahw', 'afal',
  'Imperative verb (fiʿl amr)',
  'فعل الأمر',
  'A verb form used for command/request; it is mabnī and commonly built on sukūn (with known patterns).',
  'فعلٌ يدل على طلب الفعل، وهو مبنيّ وغالبًا يُبنى على السكون بحسب القواعد.',
  '{"ar":["فعل الأمر"],"en":["fiil amr","imperative"],"aliases":["gram|fiil_amr"],"id":["FIIL_AMR"]}',
  'fiil_amr',
  '{"ilm":"nahw","group":"afal"}',
  datetime('now'),
  NULL
);

-- (d) Conditional / particles / extras
INSERT INTO ar_u_grammar (
  ar_u_grammar, canonical_input, grammar_id,
  category, sub_category, title, title_ar,
  definition, definition_ar,
  lookup_keys_json, canonical_norm,
  meta_json, created_at, updated_at
) VALUES
(
  '36ae0c7a47ab0768c382df16cb107a9ad82b688733db1ba98e6cadd2cb21fa2e',
  'grammar|min_zaida',
  'MIN_ZAIDA',
  'nahw', 'huruf',
  'Extra min (min zāʾida)',
  'مِن الزائدة',
  'Min that may be زائد in certain structures (often with negation), strengthening meaning while affecting the surface iʿrāb of the following noun.',
  'مِنْ تأتي زائدةً في تراكيبَ مخصوصة (غالبًا مع النفي) لتقوية المعنى مع جرّ الاسم لفظًا.',
  '{"ar":["مِن الزائدة"],"en":["min zaida","extra min"],"aliases":["gram|min_zaida"],"id":["MIN_ZAIDA"]}',
  'min_zaida',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
),
(
  'eb0fddadb2f6df84c39bc8d0677f92eb86035661969040e72f46addfb46c3494',
  'grammar|ma_bima',
  'MA_BIMA',
  'nahw', 'huruf',
  'Extra mā after bi- (bimā)',
  'ما الزائدة (في بِما)',
  'Mā that may appear joined to some particles/prepositions (e.g., bi-mā) without preventing their grammatical governance.',
  'ما قد تأتي زائدةً متصلةً ببعض الحروف مثل «بِما» دون أن تمنع عمل الحرف.',
  '{"ar":["ما الزائدة","بِما"],"en":["ma zaida","bima"],"aliases":["gram|ma_bima"],"id":["MA_BIMA"]}',
  'ma_bima',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
),
(
  'f1ed74fae34d8d230b7642ed7ed1b7fa94de1fc2a012f18b7ecc27e44fe418f5',
  'grammar|waw_hal',
  'WAW_HAL',
  'nahw', 'jumal',
  'Wāw al-ḥāl',
  'واو الحال',
  'A wāw that often introduces a circumstantial clause (jumla ḥāliyya).',
  'واوٌ تقترن بها الجملة الحالية غالبًا وتسمى واو الحال.',
  '{"ar":["واو الحال"],"en":["waw hal","waw al-hal"],"aliases":["gram|waw_hal"],"id":["WAW_HAL"]}',
  'waw_hal',
  '{"ilm":"nahw","group":"jumal"}',
  datetime('now'),
  NULL
),
(
  '87bfd7aeba4d2e2c7253e1f6c8572cf4486c6c2a85bab34adad14dcf4071d90a',
  'grammar|waw_maiyya',
  'WA_MAʿIYYA',
  'nahw', 'mansubat',
  'Wāw of accompaniment (wāw al-maʿiyya)',
  'واو المعية',
  'A wāw meaning “with/along with”; when it indicates accompaniment without participation, the following noun is manṣūb as mafʿūl maʿah.',
  'واوٌ بمعنى «مع»، وإذا دلت على المصاحبة دون المشاركة نُصب الاسم بعدها على أنه مفعول معه.',
  '{"ar":["واو المعية"],"en":["waw al-maiyya","wa maʿiyya"],"aliases":["gram|wa_maʿiyya"],"id":["WA_MAʿIYYA"]}',
  'waw_maiyya',
  '{"ilm":"nahw","group":"mansubat"}',
  datetime('now'),
  NULL
);

-- (e) Inna (mukhaffafa) + lam (ibtida/tawkid)
INSERT INTO ar_u_grammar (
  ar_u_grammar, canonical_input, grammar_id,
  category, sub_category, title, title_ar,
  definition, definition_ar,
  lookup_keys_json, canonical_norm,
  meta_json, created_at, updated_at
) VALUES
(
  '138595f375bc82daa3344a20b7c9c4e73ee3dbbd0ee0d4bca9d4aeef7055cfc1',
  'grammar|inna_mukhaffafa',
  'INNA_MUKHAFFAFA',
  'nahw', 'nawasikh',
  'Lightened inna (ʾin al-mukhaffafa)',
  'إن المخففة من الثقيلة',
  'A lightened form of إنّ; it may be operative or neglected, and when neglected its predicate is often marked with a distinguishing lām.',
  'إنْ المخففة من الثقيلة: تُخفف (إنّ) وقد تُعمل أو تُهمل، وإذا أُهملت اقترن خبرها باللام الفارقة غالبًا.',
  '{"ar":["إن المخففة من الثقيلة"],"en":["inna mukhaffafa","lightened inna"],"aliases":["gram|inna_mukhaffafa"],"id":["INNA_MUKHAFFAFA"]}',
  'inna_mukhaffafa',
  '{"ilm":"nahw","group":"nawasikh"}',
  datetime('now'),
  NULL
),
(
  '32e04748cf40a2bfb6108e8ab37c34fefe449442e69fef7793977b1668c47b99',
  'grammar|lam_ibtida',
  'LAM_IBTIDA',
  'nahw', 'huruf',
  'Lām al-ibtidāʾ (emphatic lām)',
  'لام الابتداء',
  'An emphatic lām used for strengthening, often seen with nominal predicates and with “inna” (as the displaced lām).',
  'لامٌ للتوكيد تدخل لتقوية المعنى، وتظهر كثيرًا مع إنّ وما أشبهها.',
  '{"ar":["لام الابتداء"],"en":["lam ibtida","emphatic lam"],"aliases":["gram|lam_ibtida"],"id":["LAM_IBTIDA"]}',
  'lam_ibtida',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
),
(
  '6fd6be6561bbe1e3750159f670ffcc077276ef45fbd25dd0fafef2a61a8707c0',
  'grammar|lam_tawkid',
  'LAM_TAWKID',
  'nahw', 'huruf',
  'Lām of emphasis (lām al-tawkīd)',
  'لام التوكيد',
  'A lām used for emphasis/strengthening in certain syntactic environments.',
  'لامٌ تُستعمل للتوكيد وتقوية المعنى في تراكيبَ مخصوصة.',
  '{"ar":["لام التوكيد"],"en":["lam tawkid","lam of emphasis"],"aliases":["gram|lam_tawkid"],"id":["LAM_TAWKID"]}',
  'lam_tawkid',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
);

-- Lookup key arrays (flat list) for search + aliases.
UPDATE ar_u_grammar
SET lookup_keys_json='["الرفع","raf","rafʿ","nominative","indicative","grammar|raf","RAF"]'
WHERE canonical_input='grammar|raf';

UPDATE ar_u_grammar
SET lookup_keys_json='["النصب","nasb","naṣb","accusative","subjunctive","grammar|nasb","NASB"]'
WHERE canonical_input='grammar|nasb';

UPDATE ar_u_grammar
SET lookup_keys_json='["الجر","jarr","genitive","grammar|jarr","JARR"]'
WHERE canonical_input='grammar|jarr';

UPDATE ar_u_grammar
SET lookup_keys_json='["الجزم","jazm","jussive","grammar|jazm","JAZM"]'
WHERE canonical_input='grammar|jazm';

UPDATE ar_u_grammar
SET lookup_keys_json='["الجملة الفعلية","verbal sentence","jumla fiʿliyya","grammar|jumala_fiiliyya","JUMALA_FIʿLIYYA","JUMALA_FI_LIYYA"]'
WHERE canonical_input='grammar|jumala_fiiliyya';

UPDATE ar_u_grammar
SET lookup_keys_json='["شبه الجملة","semi-sentence","shibh jumla","grammar|shibh_jumla","SHIBH_JUMLA"]'
WHERE canonical_input='grammar|shibh_jumla';

UPDATE ar_u_grammar
SET lookup_keys_json='["جار ومجرور","jar wa majrur","prepositional phrase","grammar|jar_majrur","JAR_MAJRUR"]'
WHERE canonical_input='grammar|jar_majrur';

UPDATE ar_u_grammar
SET lookup_keys_json='["الظرف","zarf","ẓarf","adverbial","mafʿul fīh","grammar|zarf","ZARF"]'
WHERE canonical_input='grammar|zarf';

UPDATE ar_u_grammar
SET lookup_keys_json='["المبتدأ","mubtada","mubtadaʾ","subject (nominal sentence)","grammar|mubtada","MUBTADA"]'
WHERE canonical_input='grammar|mubtada';

UPDATE ar_u_grammar
SET lookup_keys_json='["الفاعل","faʿil","faaʿil","subject (doer)","grammar|fail","FAIL"]'
WHERE canonical_input='grammar|fail';

UPDATE ar_u_grammar
SET lookup_keys_json='["المفعول به","mafʿul bihi","direct object","grammar|maful_bih","MAFʿUL_BIH"]'
WHERE canonical_input='grammar|maful_bih';

UPDATE ar_u_grammar
SET lookup_keys_json='["المفعول المطلق","mafʿul mutlaq","absolute object","grammar|maful_mutlaq","MAFʿUL_MUTLAQ"]'
WHERE canonical_input='grammar|maful_mutlaq';

UPDATE ar_u_grammar
SET lookup_keys_json='["الحال","haal","ḥāl","circumstantial","grammar|hal","HAL"]'
WHERE canonical_input='grammar|hal';

UPDATE ar_u_grammar
SET lookup_keys_json='["التمييز","tamyiz","specification","grammar|tamyiz","TAMYIZ"]'
WHERE canonical_input='grammar|tamyiz';

UPDATE ar_u_grammar
SET lookup_keys_json='["النداء","nidāʾ","vocative","grammar|nida","NIDA"]'
WHERE canonical_input='grammar|nida';

UPDATE ar_u_grammar
SET lookup_keys_json='["المنادى","munada","munādā","vocative noun","grammar|munada","MUNADA"]'
WHERE canonical_input='grammar|munada';

UPDATE ar_u_grammar
SET lookup_keys_json='["المضاف إليه","mudaf ilayh","second term of idafa","grammar|mudaf_ilayh","MUDAF_ILAYH"]'
WHERE canonical_input='grammar|mudaf_ilayh';

UPDATE ar_u_grammar
SET lookup_keys_json='["إن وأخواتها","inna and sisters","grammar|inna_wa_akhawatuha","INNA_WA_AKHAWATUHA"]'
WHERE canonical_input='grammar|inna_wa_akhawatuha';

UPDATE ar_u_grammar
SET lookup_keys_json='["اسم إن","ism inna","grammar|ism_inna","ISM_INNA"]'
WHERE canonical_input='grammar|ism_inna';

UPDATE ar_u_grammar
SET lookup_keys_json='["خبر إن","khabar inna","grammar|khabar_inna","KHABAR_INNA"]'
WHERE canonical_input='grammar|khabar_inna';

UPDATE ar_u_grammar
SET lookup_keys_json='["لا الناهية","la nahiya","prohibitive la","grammar|la_nahiya","LA_NAHIYA"]'
WHERE canonical_input='grammar|la_nahiya';

UPDATE ar_u_grammar
SET lookup_keys_json='["النعت","naat","naʿt","adjective","grammar|naat","gram|naat","NAʿT"]'
WHERE canonical_input='grammar|naat';

UPDATE ar_u_grammar
SET lookup_keys_json='["الموصوف","المنعوت","mawsuf","manʿut","described noun","grammar|mawsuf","MAWSUF"]'
WHERE canonical_input='grammar|mawsuf';

UPDATE ar_u_grammar
SET lookup_keys_json='["البدل","badal","apposition","grammar|badal","BADAL"]'
WHERE canonical_input='grammar|badal';

UPDATE ar_u_grammar
SET lookup_keys_json='["المعطوف","maʿtuf","conjoined term","grammar|maatuf","MAʿTUF"]'
WHERE canonical_input='grammar|maatuf';

UPDATE ar_u_grammar
SET lookup_keys_json='["ضمير منفصل","damir munfasil","detached pronoun","grammar|damir_munfasil","DAMIR_MUNFASIL"]'
WHERE canonical_input='grammar|damir_munfasil';

UPDATE ar_u_grammar
SET lookup_keys_json='["ضمير متصل","damir muttasil","attached pronoun","grammar|damir_muttasil","DAMIR_MUTTASIL"]'
WHERE canonical_input='grammar|damir_muttasil';

UPDATE ar_u_grammar
SET lookup_keys_json='["اسم إشارة","demonstrative","ism ishara","grammar|ism_ishara","ISM_ISHARA"]'
WHERE canonical_input='grammar|ism_ishara';

UPDATE ar_u_grammar
SET lookup_keys_json='["اسم موصول","relative pronoun","ism mawsul","grammar|ism_mawsul","ISM_MAWSUL"]'
WHERE canonical_input='grammar|ism_mawsul';

UPDATE ar_u_grammar
SET lookup_keys_json='["صلة الموصول","relative clause","silat al-mawsul","grammar|silat_mawsul","SILAT_MAWSUL"]'
WHERE canonical_input='grammar|silat_mawsul';

UPDATE ar_u_grammar
SET lookup_keys_json='["المصدر","masdar","verbal noun","grammar|masdar","MASDAR"]'
WHERE canonical_input='grammar|masdar';

UPDATE ar_u_grammar
SET lookup_keys_json='["الصفة المشبهة","sifa mushabbaha","adjective resembling participle","grammar|sifa_mushabbaha","SIFA_MUSHABBAHA"]'
WHERE canonical_input='grammar|sifa_mushabbaha';

UPDATE ar_u_grammar
SET lookup_keys_json='["اسم التفضيل","ism tafdil","elative","comparative","superlative","grammar|ism_tafdil","ISM_TAFDIL"]'
WHERE canonical_input='grammar|ism_tafdil';

UPDATE ar_u_grammar
SET lookup_keys_json='["الجمع","jam","jamʿ","plural","grammar|jam","JAMʿ"]'
WHERE canonical_input='grammar|jam';

UPDATE ar_u_grammar
SET lookup_keys_json='["الحذف","hadhf","ellipsis","omission","grammar|hadhf","HADHF"]'
WHERE canonical_input='grammar|hadhf';

UPDATE ar_u_grammar
SET lookup_keys_json='["الخبر","khabar","predicate","gram|khabar","KHABAR"]'
WHERE canonical_input='grammar|khabar_nahw';

UPDATE ar_u_grammar
SET lookup_keys_json='["الإضافة","التركيب الإضافي","idafa","iḍāfa","genitive construction","gram|idafa","IDAFA"]'
WHERE canonical_input='grammar|idafa';

UPDATE ar_u_grammar
SET lookup_keys_json='["المضاف","mudaf","muḍāf","gram|mudaf","MUDAF"]'
WHERE canonical_input='grammar|mudaf';

UPDATE ar_u_grammar
SET lookup_keys_json='["الفعل الماضي","fiil madi","fiʿl maadi","past tense","gram|fiil_madi","FIIL_MADI"]'
WHERE canonical_input='grammar|fiil_madi';

UPDATE ar_u_grammar
SET lookup_keys_json='["الفعل المضارع","fiil mudari","fiʿl muḍāriʿ","imperfect","gram|fiʿl_mudariʿ","gram|fiil_mudari","gram|fiil_mudariʿ","FIʿL_MUDARIʿ"]'
WHERE canonical_input='grammar|fiil_mudari';

UPDATE ar_u_grammar
SET lookup_keys_json='["فعل الأمر","fiil amr","imperative","gram|fiil_amr","FIIL_AMR"]'
WHERE canonical_input='grammar|fiil_amr';

UPDATE ar_u_grammar
SET lookup_keys_json='["مِن الزائدة","min zaida","extra min","gram|min_zaida","MIN_ZAIDA"]'
WHERE canonical_input='grammar|min_zaida';

UPDATE ar_u_grammar
SET lookup_keys_json='["ما الزائدة","بِما","ma zaida","bima","gram|ma_bima","MA_BIMA"]'
WHERE canonical_input='grammar|ma_bima';

UPDATE ar_u_grammar
SET lookup_keys_json='["واو الحال","waw hal","waw al-hal","gram|waw_hal","WAW_HAL"]'
WHERE canonical_input='grammar|waw_hal';

UPDATE ar_u_grammar
SET lookup_keys_json='["واو المعية","waw al-maiyya","wa maʿiyya","gram|wa_maʿiyya","WA_MAʿIYYA"]'
WHERE canonical_input='grammar|waw_maiyya';

UPDATE ar_u_grammar
SET lookup_keys_json='["إن المخففة من الثقيلة","inna mukhaffafa","lightened inna","gram|inna_mukhaffafa","INNA_MUKHAFFAFA"]'
WHERE canonical_input='grammar|inna_mukhaffafa';

UPDATE ar_u_grammar
SET lookup_keys_json='["لام الابتداء","lam ibtida","emphatic lam","gram|lam_ibtida","LAM_IBTIDA"]'
WHERE canonical_input='grammar|lam_ibtida';

UPDATE ar_u_grammar
SET lookup_keys_json='["لام التوكيد","lam tawkid","lam of emphasis","gram|lam_tawkid","LAM_TAWKID"]'
WHERE canonical_input='grammar|lam_tawkid';

UPDATE ar_u_grammar
SET lookup_keys_json='["العدد المركب","compound number","adad murakkab","gram|adad_murakkab","ADAD_MURAKKAB"]'
WHERE canonical_input='grammar|adad_murakkab';

UPDATE ar_u_grammar
SET lookup_keys_json='["الأفعال الخمسة","afal khamsa","five verbs","gram|afʿal_khamsa","AFʿAL_KHAMSA"]'
WHERE canonical_input='grammar|afal_khamsa';

UPDATE ar_u_grammar
SET lookup_keys_json='["ثبوت النون","thubut nun","retaining the nun","gram|thubut_nun","THUBUT_NUN"]'
WHERE canonical_input='grammar|thubut_nun';

UPDATE ar_u_grammar
SET lookup_keys_json='["حرف التشبيه","كاف التشبيه","harf tashbih","simile particle","gram|harf_tashbih","HARF_TASHBIH"]'
WHERE canonical_input='grammar|harf_tashbih';

UPDATE ar_u_grammar
SET lookup_keys_json='["حرف تحقيق","قد","harf tahqiq","particle of affirmation","gram|harf_tahqiq","HARF_TAHQIQ"]'
WHERE canonical_input='grammar|harf_tahqiq';

UPDATE ar_u_grammar
SET lookup_keys_json='["حروف الجر","huruf jarr","prepositions","gram|huruf_jarr","HURUF_JARR"]'
WHERE canonical_input='grammar|huruf_jarr';

-- (f) Numbers, five verbs, sababiyya fa, etc.
INSERT INTO ar_u_grammar (
  ar_u_grammar, canonical_input, grammar_id,
  category, sub_category, title, title_ar,
  definition, definition_ar,
  lookup_keys_json, canonical_norm,
  meta_json, created_at, updated_at
) VALUES
(
  '2f11a0ac240754d7b98b584ecaebbf58c985fae2c7cc6972357a5ad605b67673',
  'grammar|adad_murakkab',
  'ADAD_MURAKKAB',
  'nahw', 'adad',
  'Compound number (ʿadad murakkab)',
  'العدد المركب',
  'Numbers (typically 13–19) treated as a single unit in form; commonly built on فتح الجزأين in usage.',
  'أعدادٌ مركبة (غالبًا 13–19) تُعامل معاملةَ الكلمة الواحدة، وتكون مبنيةً على فتح الجزأين في الاستعمال الشائع.',
  '{"ar":["العدد المركب"],"en":["compound number","adad murakkab"],"aliases":["gram|adad_murakkab"],"id":["ADAD_MURAKKAB"]}',
  'adad_murakkab',
  '{"ilm":"nahw","group":"adad"}',
  datetime('now'),
  NULL
),
(
  'e77297b3c4d36a2c7d3d4eb52aad57f39984a2f0081f5acba34909894b0b33c7',
  'grammar|afal_khamsa',
  'AFʿAL_KHAMSA',
  'nahw', 'afal',
  'Five verb forms (al-afʿāl al-khamsa)',
  'الأفعال الخمسة',
  'Imperfect verb forms ending in nūn when attached to alif al-ithnayn, wāw al-jamāʿa, or yāʾ al-mukhāṭaba; their رفع is marked by thubūt al-nūn.',
  'صيغٌ من المضارع تتصل بألف الاثنين أو واو الجماعة أو ياء المخاطبة، وعلامة رفعها ثبوت النون.',
  '{"ar":["الأفعال الخمسة"],"en":["afal khamsa","five verbs"],"aliases":["gram|afʿal_khamsa"],"id":["AFʿAL_KHAMSA"]}',
  'afal_khamsa',
  '{"ilm":"nahw","group":"afal"}',
  datetime('now'),
  NULL
),
(
  '255c0aa6bf96c8474c2f6f5d695ac65a66ba580c5266a3c33a9a170b5de57ab4',
  'grammar|thubut_nun',
  'THUBUT_NUN',
  'nahw', 'irab',
  'Thubūt al-nūn',
  'ثبوت النون',
  'Retaining the final nūn as the marker of rafʿ in al-afʿāl al-khamsa.',
  'بقاء النون علامةً للرفع في الأفعال الخمسة.',
  '{"ar":["ثبوت النون"],"en":["thubut nun","retaining the nun"],"aliases":["gram|thubut_nun"],"id":["THUBUT_NUN"]}',
  'thubut_nun',
  '{"ilm":"nahw","group":"irab"}',
  datetime('now'),
  NULL
),
(
  '2c1309217e75ba6f66e1232885645c03eefed47f5a237ed64357e38ce9a0c68c',
  'grammar|harf_tashbih',
  'HARF_TASHBIH',
  'nahw', 'huruf',
  'Simile particle (ḥarf tashbīh)',
  'حرف التشبيه',
  'A particle used to express resemblance (e.g., the kāf of tashbīh “كَـ”).',
  'حرفٌ يُستعمل للدلالة على التشبيه، مثل كاف التشبيه (كَـ).',
  '{"ar":["حرف التشبيه","كاف التشبيه"],"en":["harf tashbih","simile particle"],"aliases":["gram|harf_tashbih"],"id":["HARF_TASHBIH"]}',
  'harf_tashbih',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
),
(
  'c0980a8329d2fa54055c421eb2f922025c6b72a19dfd41efbdc3f888ce023ff1',
  'grammar|harf_tahqiq',
  'HARF_TAHQIQ',
  'nahw', 'huruf',
  'Particle of affirmation (ḥarf taḥqīq)',
  'حرف تحقيق',
  'A particle like “qad” used for affirmation/assertion in certain contexts.',
  'حرفٌ يُستعمل للتحقيق والتوكيد في مواضعَ، مثل «قد».',
  '{"ar":["حرف تحقيق","قد"],"en":["harf tahqiq","particle of affirmation"],"aliases":["gram|harf_tahqiq"],"id":["HARF_TAHQIQ"]}',
  'harf_tahqiq',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
),
(
  'f9ed34a41d250b6810017b32a41250e2ae1b598bb3beaa54b6c9c69242fa344e',
  'grammar|huruf_jarr',
  'HURUF_JARR',
  'nahw', 'huruf',
  'Prepositions (ḥurūf al-jarr)',
  'حروف الجر',
  'Particles that enter on nouns and cause them to be majrūr, such as في، من، إلى، على…',
  'حروفٌ تدخل على الأسماء فتجرّها، مثل: في، من، إلى، على…',
  '{"ar":["حروف الجر"],"en":["huruf jarr","prepositions"],"aliases":["gram|huruf_jarr"],"id":["HURUF_JARR"]}',
  'huruf_jarr',
  '{"ilm":"nahw","group":"huruf"}',
  datetime('now'),
  NULL
);

-- Fill canonical_norm and generic lookup_keys_json for any rows still missing them
UPDATE ar_u_grammar
SET canonical_norm = lower(
  replace(
    replace(
      replace(canonical_input, 'grammar|', ''),
    'gram|', ''),
  '|', '_')
)
WHERE canonical_norm IS NULL;

UPDATE ar_u_grammar
SET lookup_keys_json = json_array(
  canonical_input,
  grammar_id,
  CASE WHEN title IS NULL THEN NULL ELSE lower(title) END,
  title_ar
)
WHERE lookup_keys_json IS NULL;

PRAGMA foreign_keys=ON;
