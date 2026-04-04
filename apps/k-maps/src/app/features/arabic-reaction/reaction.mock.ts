import {
  IdiomItem,
  ReactionLessonData,
  SceneContent,
  SentenceItem,
  VocabItem,
} from './reaction.models';

// ─── Vocab pools per scene ────────────────────────────────────────────────────

const vocabScene1: VocabItem[] = [
  { id: 'v1', word: 'اللغة', meaning: 'language', root: 'ل-غ-و', example: 'اللغة العربية لغة القرآن' },
  { id: 'v2', word: 'التعلّم', meaning: 'learning / acquisition', root: 'ع-ل-م', example: 'التعلّم يحتاج إلى صبر' },
  { id: 'v3', word: 'الفهم', meaning: 'understanding', root: 'ف-ه-م', example: 'الفهم أهمّ من الحفظ' },
  { id: 'v4', word: 'الأساس', meaning: 'foundation / basis', root: 'أ-س-س', example: 'الأساس في اللغة هو المفردات' },
];

const vocabScene2: VocabItem[] = [
  { id: 'v5', word: 'المفردات', meaning: 'vocabulary', root: 'ف-ر-د', example: 'يجب أن تتعلّم المفردات يوميًا' },
  { id: 'v6', word: 'النحو', meaning: 'grammar (syntax)', root: 'ن-ح-و', example: 'النحو يُنظّم الكلام' },
  { id: 'v7', word: 'الاستيعاب', meaning: 'comprehension', root: 'و-ع-ب', example: 'الاستيعاب يأتي مع الممارسة' },
  { id: 'v8', word: 'المران', meaning: 'practice / drilling', root: 'م-ر-ن', example: 'كثرة المران تُتقن الإنسان' },
];

const vocabScene3: VocabItem[] = [
  { id: 'v9',  word: 'الغوص', meaning: 'diving / deep immersion', root: 'غ-و-ص', example: 'الغوص في النصوص يُقوّي اللغة' },
  { id: 'v10', word: 'الانغماس', meaning: 'immersion', root: 'غ-م-س', example: 'الانغماس اللغوي أسرع طريقة للتعلّم' },
  { id: 'v11', word: 'الطلاقة', meaning: 'fluency', root: 'ط-ل-ق', example: 'الطلاقة تحتاج إلى وقت' },
  { id: 'v12', word: 'التدبّر', meaning: 'reflection / pondering', root: 'د-ب-ر', example: 'تدبّر القرآن يُعمّق الفهم' },
];

// ─── Idioms per scene ─────────────────────────────────────────────────────────

const idiomsScene1: IdiomItem[] = [
  { id: 'i1', phrase: 'من طلب العلى سهر الليالي', meaning: 'He who seeks greatness must endure sleepless nights', context: 'classical proverb' },
  { id: 'i2', phrase: 'لا تؤجّل عمل اليوم إلى الغد', meaning: "Don't put off today's work until tomorrow", context: 'common saying' },
];

const idiomsScene2: IdiomItem[] = [
  { id: 'i3', phrase: 'خير جليس في الزمان كتاب', meaning: 'The best companion in time is a book', context: 'classical poetry' },
  { id: 'i4', phrase: 'العلم في الصغر كالنقش في الحجر', meaning: 'Knowledge in youth is like an engraving on stone', context: 'proverb' },
];

const idiomsScene3: IdiomItem[] = [
  { id: 'i5', phrase: 'من جدّ وجد', meaning: 'Who works hard will find (success)', context: 'proverb' },
  { id: 'i6', phrase: 'الصبر مفتاح الفرج', meaning: 'Patience is the key to relief', context: 'classical saying' },
];

// ─── Key sentences per scene ──────────────────────────────────────────────────

const sentencesScene1: SentenceItem[] = [
  {
    id: 's1',
    text: 'اللغة العربية ليست مجرّد لغة، بل هي مفتاح الحضارة.',
    translation: 'Arabic is not merely a language — it is the key to civilisation.',
    note: 'Opening thesis of the video',
  },
  {
    id: 's2',
    text: 'الأساس الصحيح يُسرّع المسيرة كثيرًا.',
    translation: 'The right foundation accelerates the journey greatly.',
    note: 'Key pedagogical principle',
  },
];

const sentencesScene2: SentenceItem[] = [
  {
    id: 's3',
    text: 'المفردات هي لبنات البناء الأولى في اكتساب اللغة.',
    translation: 'Vocabulary is the first building block in language acquisition.',
  },
  {
    id: 's4',
    text: 'النحو بدون مفردات كالخريطة بدون طريق.',
    translation: 'Grammar without vocabulary is like a map without a road.',
    note: 'Memorable analogy used by the speaker',
  },
];

const sentencesScene3: SentenceItem[] = [
  {
    id: 's5',
    text: 'الانغماس الكامل في النصوص هو أسرع طريق إلى الطلاقة.',
    translation: 'Total immersion in texts is the fastest path to fluency.',
  },
  {
    id: 's6',
    text: 'تدبّر كلمة واحدة قد يفتح لك أبوابًا لم تتوقّعها.',
    translation: 'Pondering a single word may open doors you never expected.',
    note: 'Closing reflection',
  },
];

// ─── Scene content bundles ────────────────────────────────────────────────────

const sceneContents: SceneContent[] = [
  {
    sceneId: 'scene-1',
    vocab: vocabScene1,
    idioms: idiomsScene1,
    sentences: sentencesScene1,
    notes: "Focus on the speaker's opening framing — he is establishing WHY Arabic before HOW.",
  },
  {
    sceneId: 'scene-2',
    vocab: vocabScene2,
    idioms: idiomsScene2,
    sentences: sentencesScene2,
    notes: 'Notice how the speaker contrasts grammar-first vs vocabulary-first approaches.',
  },
  {
    sceneId: 'scene-3',
    vocab: vocabScene3,
    idioms: idiomsScene3,
    sentences: sentencesScene3,
    notes: 'The immersion argument — compare with your own experience.',
  },
];

// ─── Full lesson ──────────────────────────────────────────────────────────────

export const MOCK_REACTION_LESSON: ReactionLessonData = {
  unitId: 'mock-unit-001',
  title: 'كيف تتعلّم العربية — محاضرة تعليمية',
  // Public domain educational video used as a placeholder
  youtubeId: 'dQw4w9WgXcQ',
  scenes: [
    { id: 'scene-1', title: 'المقدّمة — لماذا العربية؟', start: 0,   end: 60  },
    { id: 'scene-2', title: 'المفردات والنحو',             start: 60,  end: 130 },
    { id: 'scene-3', title: 'الانغماس والطلاقة',           start: 130, end: 210 },
  ],
  transcript: [
    { id: 't1',  start: 0,   end: 8,   text: 'بسم الله الرحمن الرحيم. أهلًا وسهلًا بالجميع.', sceneId: 'scene-1' },
    { id: 't2',  start: 8,   end: 16,  text: 'اللغة العربية ليست مجرّد لغة، بل هي مفتاح الحضارة.', sceneId: 'scene-1' },
    { id: 't3',  start: 16,  end: 26,  text: 'من أراد أن يفهم القرآن الكريم حقًّا، لا بدّ له أن يتعلّم العربية.', sceneId: 'scene-1' },
    { id: 't4',  start: 26,  end: 36,  text: 'الأساس الصحيح يُسرّع المسيرة كثيرًا، ويُجنّبك الأخطاء الكبيرة.', sceneId: 'scene-1' },
    { id: 't5',  start: 36,  end: 48,  text: 'لذلك، سنبدأ اليوم من الصفر — من الأساس المتين.', sceneId: 'scene-1' },
    { id: 't6',  start: 48,  end: 60,  text: 'استعدّوا، لأنّ الرحلة ستكون ممتعة ومثمرة بإذن الله.', sceneId: 'scene-1' },

    { id: 't7',  start: 60,  end: 72,  text: 'السؤال الذي يطرحه كثيرون: من أين أبدأ؟ بالمفردات أم بالنحو؟', sceneId: 'scene-2' },
    { id: 't8',  start: 72,  end: 84,  text: 'المفردات هي لبنات البناء الأولى في اكتساب اللغة.', sceneId: 'scene-2' },
    { id: 't9',  start: 84,  end: 96,  text: 'النحو بدون مفردات كالخريطة بدون طريق — لا تصل إلى أيّ مكان.', sceneId: 'scene-2' },
    { id: 't10', start: 96,  end: 110, text: 'ابدأ بألف كلمة أساسية، وستجد أنّك تفهم معظم ما تسمعه.', sceneId: 'scene-2' },
    { id: 't11', start: 110, end: 120, text: 'النحو يأتي تدريجيًا من خلال القراءة والاستماع المتواصلَين.', sceneId: 'scene-2' },
    { id: 't12', start: 120, end: 130, text: 'المران اليومي — ولو لعشرين دقيقة — يصنع الفرق الحقيقي.', sceneId: 'scene-2' },

    { id: 't13', start: 130, end: 142, text: 'الانغماس الكامل في النصوص هو أسرع طريق إلى الطلاقة.', sceneId: 'scene-3' },
    { id: 't14', start: 142, end: 155, text: 'اقرأ نصوصًا فوق مستواك قليلًا — هذا يدفعك إلى الأمام.', sceneId: 'scene-3' },
    { id: 't15', start: 155, end: 168, text: 'استمع يوميًا، حتّى لو لم تفهم كلّ كلمة. الأذن تتعلّم أيضًا.', sceneId: 'scene-3' },
    { id: 't16', start: 168, end: 182, text: 'تدبّر كلمة واحدة قد يفتح لك أبوابًا لم تتوقّعها.', sceneId: 'scene-3' },
    { id: 't17', start: 182, end: 196, text: 'ومن جدّ وجد — من صبر على الطريق، بلغ الغاية.', sceneId: 'scene-3' },
    { id: 't18', start: 196, end: 210, text: 'نلتقي في الدرس القادم بإذن الله. جزاكم الله خيرًا.', sceneId: 'scene-3' },
  ],
  content: sceneContents,
};
