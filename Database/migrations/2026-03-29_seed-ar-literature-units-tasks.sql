-- 2026-03-29: Seed units + tasks for all Arabic Literature containers
-- Containers: malik-ajib (units exist), juha-hasaa, hasud-bakhil, ahmaq-sabi,
--             hikam-shiriya, misyadat-tumu7, hikmat-tabib, qisas-anbiya
-- Task types: reading, comprehension, vocabulary
-- Status: draft (ready for review)

-- ─── UNITS ─────────────────────────────────────────────────────────────────

-- الْحَسُودُ وَالْبَخِيلُ — one-scene story
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES (
  'U:C:LIT:hasud-bakhil:1', 'C:LIT:hasud-bakhil', 'chapter', 1,
  '{"title_ar":"الْحَسُودُ وَالْبَخِيلُ","title_en":"The Envious and the Miser","word_count":85}'
);

-- قِصَّةُ جُحَا وَالْحَسَاءِ الْحَارِّ — one-scene story
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES (
  'U:C:LIT:juha-hasaa:1', 'C:LIT:juha-hasaa', 'chapter', 1,
  '{"title_ar":"جُحَا وَالْحَسَاءُ الْحَارُّ","title_en":"Juha and the Hot Soup","word_count":130}'
);

-- الْأَحْمَقُ وَالصَّبِيُّ — one-scene story
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES (
  'U:C:LIT:ahmaq-sabi:1', 'C:LIT:ahmaq-sabi', 'chapter', 1,
  '{"title_ar":"الْأَحْمَقُ وَالصَّبِيُّ","title_en":"The Fool and the Boy","word_count":62}'
);

-- حِكَمٌ شِعْرِيَّةٌ — poetry unit
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES (
  'U:C:LIT:hikam-shiriya:1', 'C:LIT:hikam-shiriya', 'passage', 1,
  '{"title_ar":"حِكَمٌ شِعْرِيَّةٌ","title_en":"Poetic Wisdoms","word_count":20,"form":"poetry"}'
);

-- مِصْيَدَةُ الطُّمُوحِ — two scenes
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES
  ('U:C:LIT:misyadat-tumu7:1', 'C:LIT:misyadat-tumu7', 'chapter', 1,
   '{"title_ar":"الطُّمُوحُ وَالسَّقوطُ","title_en":"The Ambition and the Fall","word_count":120}'),
  ('U:C:LIT:misyadat-tumu7:2', 'C:LIT:misyadat-tumu7', 'chapter', 2,
   '{"title_ar":"الدَّرْسُ الْمُسْتَفَادُ","title_en":"The Lesson Learned","word_count":100}');

-- حِكْمَةُ الطَّبِيبِ — two scenes
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES
  ('U:C:LIT:hikmat-tabib:1', 'C:LIT:hikmat-tabib', 'chapter', 1,
   '{"title_ar":"الطَّبِيبُ وَالْمَرِيضُ","title_en":"The Physician and the Patient","word_count":100}'),
  ('U:C:LIT:hikmat-tabib:2', 'C:LIT:hikmat-tabib', 'chapter', 2,
   '{"title_ar":"الْحِكْمَةُ فَوْقَ الدَّوَاءِ","title_en":"Wisdom Above Medicine","word_count":80}');

-- قِصَصُ الْأَنْبِيَاءِ — three thematic chapters
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES
  ('U:C:LIT:qisas-anbiya:1', 'C:LIT:qisas-anbiya', 'chapter', 1,
   '{"title_ar":"قِصَّةُ آدَمَ عَلَيْهِ السَّلَامُ","title_en":"The Story of Adam","word_count":200}'),
  ('U:C:LIT:qisas-anbiya:2', 'C:LIT:qisas-anbiya', 'chapter', 2,
   '{"title_ar":"قِصَّةُ نُوحٍ عَلَيْهِ السَّلَامُ","title_en":"The Story of Noah","word_count":220}'),
  ('U:C:LIT:qisas-anbiya:3', 'C:LIT:qisas-anbiya', 'chapter', 3,
   '{"title_ar":"قِصَّةُ إِبْرَاهِيمَ عَلَيْهِ السَّلَامُ","title_en":"The Story of Ibrahim","word_count":250}');

-- ─── TASKS ─────────────────────────────────────────────────────────────────
-- Each unit gets: reading + comprehension + vocabulary (3 tasks)
-- malik-ajib units 1-4 (already have units, no tasks yet)

-- malik-ajib unit 1
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:malik-ajib:1:reading',     'U:C:LIT:malik-ajib:1', 'reading',      'Read: الْبِدَايَةُ وَالْإِبْحَارُ',           '{}', 'draft'),
  ('T:U:malik-ajib:1:vocab',       'U:C:LIT:malik-ajib:1', 'vocabulary',   'Vocab: الْبِدَايَةُ وَالْإِبْحَارُ',           '{}', 'draft'),
  ('T:U:malik-ajib:1:comprehension','U:C:LIT:malik-ajib:1', 'comprehension','Comprehension: الْبِدَايَةُ وَالْإِبْحَارُ', '{}', 'draft');

-- malik-ajib unit 2
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:malik-ajib:2:reading',     'U:C:LIT:malik-ajib:2', 'reading',      'Read: جَبَلُ الْمَغْنَاطِيسِ',           '{}', 'draft'),
  ('T:U:malik-ajib:2:vocab',       'U:C:LIT:malik-ajib:2', 'vocabulary',   'Vocab: جَبَلُ الْمَغْنَاطِيسِ',           '{}', 'draft'),
  ('T:U:malik-ajib:2:comprehension','U:C:LIT:malik-ajib:2', 'comprehension','Comprehension: جَبَلُ الْمَغْنَاطِيسِ', '{}', 'draft');

-- malik-ajib unit 3
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:malik-ajib:3:reading',     'U:C:LIT:malik-ajib:3', 'reading',      'Read: الزَّوْرَقُ الْمَسْحُورُ',           '{}', 'draft'),
  ('T:U:malik-ajib:3:vocab',       'U:C:LIT:malik-ajib:3', 'vocabulary',   'Vocab: الزَّوْرَقُ الْمَسْحُورُ',           '{}', 'draft'),
  ('T:U:malik-ajib:3:comprehension','U:C:LIT:malik-ajib:3', 'comprehension','Comprehension: الزَّوْرَقُ الْمَسْحُورُ', '{}', 'draft');

-- malik-ajib unit 4
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:malik-ajib:4:reading',     'U:C:LIT:malik-ajib:4', 'reading',      'Read: قَصْرُ الْعَجَائِبِ',           '{}', 'draft'),
  ('T:U:malik-ajib:4:vocab',       'U:C:LIT:malik-ajib:4', 'vocabulary',   'Vocab: قَصْرُ الْعَجَائِبِ',           '{}', 'draft'),
  ('T:U:malik-ajib:4:comprehension','U:C:LIT:malik-ajib:4', 'comprehension','Comprehension: قَصْرُ الْعَجَائِبِ', '{}', 'draft');

-- hasud-bakhil unit 1
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:hasud-bakhil:1:reading',     'U:C:LIT:hasud-bakhil:1', 'reading',      'Read: الْحَسُودُ وَالْبَخِيلُ',           '{}', 'draft'),
  ('T:U:hasud-bakhil:1:vocab',       'U:C:LIT:hasud-bakhil:1', 'vocabulary',   'Vocab: الْحَسُودُ وَالْبَخِيلُ',           '{}', 'draft'),
  ('T:U:hasud-bakhil:1:comprehension','U:C:LIT:hasud-bakhil:1', 'comprehension','Comprehension: الْحَسُودُ وَالْبَخِيلُ', '{}', 'draft');

-- juha-hasaa unit 1
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:juha-hasaa:1:reading',     'U:C:LIT:juha-hasaa:1', 'reading',      'Read: جُحَا وَالْحَسَاءُ الْحَارُّ',           '{}', 'draft'),
  ('T:U:juha-hasaa:1:vocab',       'U:C:LIT:juha-hasaa:1', 'vocabulary',   'Vocab: جُحَا وَالْحَسَاءُ الْحَارُّ',           '{}', 'draft'),
  ('T:U:juha-hasaa:1:comprehension','U:C:LIT:juha-hasaa:1', 'comprehension','Comprehension: جُحَا وَالْحَسَاءُ الْحَارُّ', '{}', 'draft');

-- ahmaq-sabi unit 1
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:ahmaq-sabi:1:reading',     'U:C:LIT:ahmaq-sabi:1', 'reading',      'Read: الْأَحْمَقُ وَالصَّبِيُّ',           '{}', 'draft'),
  ('T:U:ahmaq-sabi:1:vocab',       'U:C:LIT:ahmaq-sabi:1', 'vocabulary',   'Vocab: الْأَحْمَقُ وَالصَّبِيُّ',           '{}', 'draft'),
  ('T:U:ahmaq-sabi:1:comprehension','U:C:LIT:ahmaq-sabi:1', 'comprehension','Comprehension: الْأَحْمَقُ وَالصَّبِيُّ', '{}', 'draft');

-- hikam-shiriya unit 1 (poetry gets reading + vocabulary + reaction for analysis)
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:hikam-shiriya:1:reading',  'U:C:LIT:hikam-shiriya:1', 'reading',      'Read: حِكَمٌ شِعْرِيَّةٌ', '{}', 'draft'),
  ('T:U:hikam-shiriya:1:vocab',    'U:C:LIT:hikam-shiriya:1', 'vocabulary',   'Vocab: حِكَمٌ شِعْرِيَّةٌ', '{}', 'draft'),
  ('T:U:hikam-shiriya:1:reaction', 'U:C:LIT:hikam-shiriya:1', 'reaction',     'Poetry Analysis: حِكَمٌ شِعْرِيَّةٌ', '{"script_type":"obs_react","notes":"Analyse rhetorical devices, honour metaphor, conditional structure"}', 'draft');

-- misyadat-tumu7 units
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:misyadat:1:reading',     'U:C:LIT:misyadat-tumu7:1', 'reading',      'Read: الطُّمُوحُ وَالسَّقُوطُ',           '{}', 'draft'),
  ('T:U:misyadat:1:vocab',       'U:C:LIT:misyadat-tumu7:1', 'vocabulary',   'Vocab: الطُّمُوحُ وَالسَّقُوطُ',           '{}', 'draft'),
  ('T:U:misyadat:1:comprehension','U:C:LIT:misyadat-tumu7:1', 'comprehension','Comprehension: الطُّمُوحُ وَالسَّقُوطُ', '{}', 'draft'),
  ('T:U:misyadat:2:reading',     'U:C:LIT:misyadat-tumu7:2', 'reading',      'Read: الدَّرْسُ الْمُسْتَفَادُ',           '{}', 'draft'),
  ('T:U:misyadat:2:vocab',       'U:C:LIT:misyadat-tumu7:2', 'vocabulary',   'Vocab: الدَّرْسُ الْمُسْتَفَادُ',           '{}', 'draft'),
  ('T:U:misyadat:2:comprehension','U:C:LIT:misyadat-tumu7:2', 'comprehension','Comprehension: الدَّرْسُ الْمُسْتَفَادُ', '{}', 'draft');

-- hikmat-tabib units
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:hikmat-tabib:1:reading',     'U:C:LIT:hikmat-tabib:1', 'reading',      'Read: الطَّبِيبُ وَالْمَرِيضُ',           '{}', 'draft'),
  ('T:U:hikmat-tabib:1:vocab',       'U:C:LIT:hikmat-tabib:1', 'vocabulary',   'Vocab: الطَّبِيبُ وَالْمَرِيضُ',           '{}', 'draft'),
  ('T:U:hikmat-tabib:1:comprehension','U:C:LIT:hikmat-tabib:1', 'comprehension','Comprehension: الطَّبِيبُ وَالْمَرِيضُ', '{}', 'draft'),
  ('T:U:hikmat-tabib:2:reading',     'U:C:LIT:hikmat-tabib:2', 'reading',      'Read: الْحِكْمَةُ فَوْقَ الدَّوَاءِ',           '{}', 'draft'),
  ('T:U:hikmat-tabib:2:vocab',       'U:C:LIT:hikmat-tabib:2', 'vocabulary',   'Vocab: الْحِكْمَةُ فَوْقَ الدَّوَاءِ',           '{}', 'draft'),
  ('T:U:hikmat-tabib:2:comprehension','U:C:LIT:hikmat-tabib:2', 'comprehension','Comprehension: الْحِكْمَةُ فَوْقَ الدَّوَاءِ', '{}', 'draft');

-- qisas-anbiya units
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:U:qisas-anbiya:1:reading',     'U:C:LIT:qisas-anbiya:1', 'reading',      'Read: قِصَّةُ آدَمَ',           '{}', 'draft'),
  ('T:U:qisas-anbiya:1:vocab',       'U:C:LIT:qisas-anbiya:1', 'vocabulary',   'Vocab: قِصَّةُ آدَمَ',           '{}', 'draft'),
  ('T:U:qisas-anbiya:1:comprehension','U:C:LIT:qisas-anbiya:1', 'comprehension','Comprehension: قِصَّةُ آدَمَ', '{}', 'draft'),
  ('T:U:qisas-anbiya:2:reading',     'U:C:LIT:qisas-anbiya:2', 'reading',      'Read: قِصَّةُ نُوحٍ',           '{}', 'draft'),
  ('T:U:qisas-anbiya:2:vocab',       'U:C:LIT:qisas-anbiya:2', 'vocabulary',   'Vocab: قِصَّةُ نُوحٍ',           '{}', 'draft'),
  ('T:U:qisas-anbiya:2:comprehension','U:C:LIT:qisas-anbiya:2', 'comprehension','Comprehension: قِصَّةُ نُوحٍ', '{}', 'draft'),
  ('T:U:qisas-anbiya:3:reading',     'U:C:LIT:qisas-anbiya:3', 'reading',      'Read: قِصَّةُ إِبْرَاهِيمَ',           '{}', 'draft'),
  ('T:U:qisas-anbiya:3:vocab',       'U:C:LIT:qisas-anbiya:3', 'vocabulary',   'Vocab: قِصَّةُ إِبْرَاهِيمَ',           '{}', 'draft'),
  ('T:U:qisas-anbiya:3:comprehension','U:C:LIT:qisas-anbiya:3', 'comprehension','Comprehension: قِصَّةُ إِبْرَاهِيمَ', '{}', 'draft');

-- ─── VIDEO / PODCAST CONTAINERS ────────────────────────────────────────────
-- Placeholder containers for future video + podcast content
-- (fill content via Hub → Arabic → Containers)

INSERT OR IGNORE INTO ar_containers (id, container_type, container_key, title, meta_json)
VALUES
  ('C:VID:arabic-vocab-common', 'video', 'arabic-vocab-common',
   'Most Common Arabic Words',
   '{"title_ar":"أَكْثَرُ الْكَلِمَاتِ شُيُوعاً","level":"beginner","author":"Arabic Learning Channel","type":"video_lesson","description":"Video: most common words in Arabic language. Vocabulary building for beginners."}'),
  ('C:POD:arabic-reaction-series', 'podcast_episode', 'arabic-reaction-series',
   'Arabic Content Reactions',
   '{"title_ar":"تَعْلِيقَاتٌ عَلَى الْمُحْتَوَى","level":"intermediate","type":"reaction_series","description":"Personal reaction series — OBS React script. Analyse Arabic content, note reactions, track vocabulary."}');

-- Units for video
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES
  ('U:C:VID:arabic-vocab:ep1', 'C:VID:arabic-vocab-common', 'episode', 1,
   '{"title_ar":"الدَّرْسُ الْأَوَّلُ","title_en":"Episode 1: Core 100 Words","word_count":100}');

-- Tasks for video unit
INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:VID:vocab:ep1:vocab',    'U:C:VID:arabic-vocab:ep1', 'vocabulary',   'Vocab: Core 100 Words',  '{}', 'draft'),
  ('T:VID:vocab:ep1:reaction', 'U:C:VID:arabic-vocab:ep1', 'reaction',     'Reaction: Core 100 Words', '{"script_type":"obs_react","notes":"Watch video, log new words, reaction notes"}', 'draft');

-- Units for podcast reaction
INSERT OR IGNORE INTO ar_container_units (id, container_id, unit_type, order_index, meta_json)
VALUES
  ('U:C:POD:reaction:ep1', 'C:POD:arabic-reaction-series', 'episode', 1,
   '{"title_ar":"الْحَلَقَةُ الْأُولَى","title_en":"Episode 1","word_count":0}');

INSERT OR IGNORE INTO ar_container_unit_task (task_id, unit_id, task_type, task_name, task_json, status)
VALUES
  ('T:POD:reaction:ep1:reading',  'U:C:POD:reaction:ep1', 'reading',  'Read Script: Episode 1', '{}', 'draft'),
  ('T:POD:reaction:ep1:reaction', 'U:C:POD:reaction:ep1', 'reaction', 'Record Reaction: Episode 1', '{"script_type":"obs_react","notes":"Script in OBS React — record reaction, note vocab, log insights"}', 'draft');
