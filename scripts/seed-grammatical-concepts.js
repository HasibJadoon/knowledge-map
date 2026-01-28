const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'database', 'data', 'Grammar.json');
const json = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const entryMeta = {
  UNIT_WORD: { title: 'Word', definition: 'Single word unit', category: 'syntax' },
  UNIT_COMPOUND: { title: 'Compound', definition: 'Multi-word compound unit', category: 'syntax' },
  UNIT_CLAUSE: { title: 'Clause / close phrase', definition: 'Clause or semi-sentence', category: 'syntax' },
  UNIT_SENTENCE: { title: 'Sentence', definition: 'Complete sentence (jumla)', category: 'syntax' },

  WORD_NOUN: { title: 'Noun', definition: 'Nominal word (ism)', category: 'morphology' },
  WORD_VERB: { title: 'Verb', definition: 'Action word (fiʿl)', category: 'morphology' },
  WORD_PARTICLE: { title: 'Particle', definition: 'Function word / particle', category: 'particle' },
  WORD_INTERJECTION: { title: 'Interjection / expression', definition: 'Emotion / expression particle', category: 'semantics' },

  COMP_IDAFI: { title: 'Idāfah (genitive) compound', definition: 'Possessive or genitive compound', category: 'morphology' },
  COMP_WASFI: { title: 'Wasfī compound', definition: 'Descriptive compound (noun + adjective)', category: 'morphology' },
  COMP_MAZJI: { title: 'Mazjī compound', definition: 'Mixed/compound phrase (mazjī)', category: 'morphology' },
  COMP_ISNADI: { title: 'Isnādī compound', definition: 'Predicate / clause compound', category: 'morphology' },
  COMP_ADADI: { title: 'ʿAdadī compound', definition: 'Numeric compound', category: 'morphology' },
  COMP_HARFI: { title: 'Harfī compound', definition: 'Prepositional or particle-based compound', category: 'morphology' },
  COMP_JAR_MAJRUR: { title: 'Jarr-Majrūr compound', definition: 'Preposition + genitive structure', category: 'morphology' },
  COMP_ZARF: { title: 'Ẓarf compound', definition: 'Adverbial compound', category: 'morphology' },
};

const grammarDefaults = {
  category: 'syntax',
};

const grammarMeta = {
  // Syntax basics
  GRAM_JUMLA_ISMIYYA: { title: 'Nominal sentence', definition: 'Statement that begins with a noun/pronoun', ...grammarDefaults },
  GRAM_JUMLA_FIILIYYA: { title: 'Verbal sentence', definition: 'Sentence that begins with a verb', ...grammarDefaults },
  GRAM_JUMLA_SHIBH: { title: 'Pseudo clause', definition: 'Semi-sentence / شبه جملة structure', ...grammarDefaults },
  GRAM_JUMLA_KHABARIYYA: { title: 'Declarative sentence', definition: 'Statement sentence (khabarīyyah)', ...grammarDefaults },
  GRAM_JUMLA_INSHAIYYA: { title: 'Constructive sentence', definition: 'Speech-act sentence (injāʾ / request)', ...grammarDefaults },

  GRAM_MUBTADA: { title: 'Subject (mubtadaʾ)', definition: 'Nominative term that starts a nominal sentence', ...grammarDefaults },
  GRAM_KHABAR: { title: 'Predicate (khabar)', definition: 'Completes a nominal sentence after the subject', ...grammarDefaults },
  GRAM_KHABAR_JUMLA: { title: 'Predicate sentence (khabar jumla)', definition: 'Predicate expressed as a verb clause', ...grammarDefaults },

  GRAM_FIIL: { title: 'Verb (fiʿl)', definition: 'Action word', ...grammarDefaults },
  GRAM_FAIL: { title: 'Subject/doer (fāʿil)', definition: 'Performer of the verb', ...grammarDefaults },
  GRAM_NAIB_FAIL: { title: 'Deputy subject (nāʾib fāʿil)', definition: 'Proxy doer in passive-like constructions', ...grammarDefaults },
  GRAM_MAFOOL_BIH: { title: 'Object (mafʿūl bihi)', definition: 'Receiver of the verbal action', ...grammarDefaults },
  GRAM_MAFOOL_MUTLAQ: { title: 'Literally object (mafʿūl mutlaq)', definition: 'Intensifier object that repeats the verb', ...grammarDefaults },
  GRAM_MAFOOL_FIH: { title: 'Adverbial object (mafʿūl fīh)', definition: 'Locative/circumstantial object', ...grammarDefaults },
  GRAM_MAFOOL_LIAJLIH: { title: 'Object of cause (mafʿūl li-ajlih)', definition: 'Purpose object', ...grammarDefaults },
  GRAM_MAFOOL_MAAH: { title: 'Accompaniment object (mafʿūl maʿah)', definition: 'Object representing accompaniment', ...grammarDefaults },

  GRAM_NAAT: { title: 'Adjective (naʿt)', definition: 'Descriptive adjective', ...grammarDefaults },
  GRAM_BADAL: { title: 'Substitute (badal)', definition: 'Replacement noun in apposition', ...grammarDefaults },
  GRAM_ATF: { title: 'Conjunction (ʿaṭf)', definition: 'Connective particles', ...grammarDefaults },
  GRAM_MAATOOF_ALAYH: { title: 'Conjoined term (maʿṭūf ʿalayh)', definition: 'Term that receives the conjunction', ...grammarDefaults },

  GRAM_MUDAF: { title: 'Annexed noun (muḍāf)', definition: 'First term in an idāfah', ...grammarDefaults },
  GRAM_MUDAF_ILAYH: { title: 'Annexed-to (muḍāf ilayh)', definition: 'Possessed noun in idāfah', ...grammarDefaults },
  GRAM_HARF_JARR: { title: 'Preposition (ḥarf jarr)', definition: 'Prepositions that govern genitive case', ...grammarDefaults },
  GRAM_MAJROOR: { title: 'Genitive noun (majrūr)', definition: 'Noun governed by a preposition', ...grammarDefaults },

  GRAM_KANA: { title: 'Kana and sisters', definition: 'Verbs that change case of subject/predicate', ...grammarDefaults },
  GRAM_ISM_KANA: { title: 'Subject of kana (ism)', definition: 'Noun following kana in nominative', ...grammarDefaults },
  GRAM_KHABAR_KANA: { title: 'Predicate of kana (khabar)', definition: 'Predicate that follows kana', ...grammarDefaults },

  GRAM_INNA: { title: 'Inna and sisters', definition: 'Particles that affect case', ...grammarDefaults },
  GRAM_IN_TAWKID: { title: 'Inna for emphasis', definition: 'Emphatic use of inna', ...grammarDefaults },
  GRAM_ISM_INNA: { title: 'Subject of inna (ism)', definition: 'Nominated term after inna', ...grammarDefaults },
  GRAM_KHABAR_INNA: { title: 'Predicate of inna', definition: 'Predicate following inna', ...grammarDefaults },

  GRAM_MUDARI_MARFOO: { title: 'Indicative present (marfūʿ)', definition: 'Present verb in nominative', ...grammarDefaults },
  GRAM_MUDARI_MANSOOB: { title: 'Subjunctive present (mansūb)', definition: 'Present verb in subjunctive', ...grammarDefaults },
  GRAM_MUDARI_MAJZOOM: { title: 'Jussive present (majzūm)', definition: 'Present verb in jussive', ...grammarDefaults },

  GRAM_FIIL_SHART: { title: 'Conditional verb', definition: 'Verb that introduces a condition', ...grammarDefaults },
  GRAM_JAWAB_SHART: { title: 'Conditional response', definition: 'Answer to a conditional clause', ...grammarDefaults },

  GRAM_TALAB: { title: 'Request', definition: 'Invocation or request expression', ...grammarDefaults },
  GRAM_JAWAB_TALAB: { title: 'Request response', definition: 'Answer or fulfillment of a request', ...grammarDefaults },

  GRAM_AMR: { title: 'Imperative', definition: 'Command verb', ...grammarDefaults },
  GRAM_NAHY: { title: 'Prohibition', definition: 'Negative command', ...grammarDefaults },
  GRAM_ISTIFHAM: { title: 'Interrogation', definition: 'Question word/function', ...grammarDefaults },
  GRAM_TAMANNI: { title: 'Wish', definition: 'Expression of hopeful desire', ...grammarDefaults },
  GRAM_TARJJI: { title: 'Plea / urging (tarjji)', definition: 'Pleading request', ...grammarDefaults },
  GRAM_NIDA: { title: 'Vocative / call', definition: 'Addressing someone', ...grammarDefaults },

  GRAM_MASDAR_MUAWAL: { title: 'Verbal noun phrase (masdar muʿawwal)', definition: 'Masdar that acts like a sentence', ...grammarDefaults },
  GRAM_HAAL: { title: 'Circumstance (ḥāl)', definition: 'Adverbial circumstantial noun', ...grammarDefaults },
  GRAM_TAMYIZ: { title: 'Specification (tamyīz)', definition: 'Clarifying noun after numbers or adjectives', ...grammarDefaults },

  GRAM_TAALIL: { title: 'Causation (taʿlīl)', definition: 'Clause that explains reason', ...grammarDefaults },
  GRAM_SABAB: { title: 'Because / reason', definition: 'Cause connector', ...grammarDefaults },
  GRAM_GHAYA: { title: 'Purpose / goal', definition: 'Expression of aim', ...grammarDefaults },
  GRAM_SABABIYYA: { title: 'Causality', definition: 'Causal relations', ...grammarDefaults },
  GRAM_LAM_TAALIL: { title: 'Lam al-taʿlīl', definition: 'Lam used to express cause', ...grammarDefaults },

  // Rhetoric / discourse
  GRAM_TAWKID: { title: 'Emphasis (tawkīd)', definition: 'Emphatic construction', category: 'rhetoric' },
  GRAM_QASR: { title: 'Limitation / exclusivity (qaṣr)', definition: 'Restricting expression', category: 'rhetoric' },
  GRAM_ISTIDRAK: { title: 'Correction / reclamation', definition: 'Reapplying statement after contrast', category: 'rhetoric' },
  GRAM_KAF_TASHBIH: { title: 'Kāf of similitude', definition: 'Simile marker kāf', category: 'rhetoric' },
  GRAM_TASHBIH: { title: 'Simile (tašbīh)', definition: 'Comparison using like/as', category: 'rhetoric' },
  GRAM_ISTIARA: { title: 'Metaphor (istiʿāra)', definition: 'Figurative expression', category: 'rhetoric' },
  GRAM_KINAYA: { title: 'Kenāyah (indirect expression)', definition: 'Metonymy and indirect speech', category: 'rhetoric' },
  GRAM_HAQIQA: { title: 'Literal meaning (ḥaqīqah)', definition: 'Literal vs figurative', category: 'rhetoric' },
  GRAM_MAJAZ: { title: 'Figurative meaning (majāz)', definition: 'Figurative usage', category: 'rhetoric' },
  GRAM_IJAZ: { title: 'Conciseness (ījāz)', definition: 'Brevity and compression', category: 'rhetoric' },
  GRAM_ITNAB: { title: 'Explication (iṭnāb)', definition: 'Detailed elaboration', category: 'rhetoric' },
  GRAM_TAQDIM_TAKHIR: { title: 'Fronting / deferment', definition: 'Word order variation', category: 'rhetoric' },
  GRAM_JINAS: { title: 'Paronomasia (jinas)', definition: 'Wordplay using homonyms', category: 'rhetoric' },
  GRAM_SAJ: { title: 'Rhymed prose (sajʿ)', definition: 'Rhymed prose style', category: 'rhetoric' },
  GRAM_TIBAQ: { title: 'Antithesis (ṭibāq)', definition: 'Opposing pair', category: 'rhetoric' },
  GRAM_MUQABALA: { title: 'Contrast / comparison (muqābalah)', definition: 'Parallel contrast', category: 'rhetoric' },
  GRAM_USLOOB_HAKIM: { title: 'Wise style (uslūb al-ḥakīm)', definition: 'Stylistic wisdom expression', category: 'rhetoric' },
  GRAM_TAHKUM: { title: 'Sarcasm (taḥkūm)', definition: 'Mocking tone', category: 'rhetoric' },
  GRAM_QAWL: { title: 'Statement (qawl)', definition: 'Saying or quoted speech', category: 'rhetoric' },
  GRAM_MAQOOL_QAWL: { title: 'Quoted saying (maqūl qawl)', definition: 'Reported speech', category: 'rhetoric' },
  GRAM_ISTINAF: { title: 'Resumption (istināf)', definition: 'Returning to a topic', category: 'rhetoric' },
  GRAM_QASAM: { title: 'Oath (qasam)', definition: 'Swearing or oath', category: 'rhetoric' },
};

function ensureEntry(id) {
  if (!entryMeta[id] && !grammarMeta[id]) {
    throw new Error(`Missing metadata for ${id}`);
  }
}

const records = [];

for (const cat of ['unit_catalog', 'word_type_catalog', 'compound_catalog']) {
  for (const entry of json[cat]) {
    const meta = entryMeta[entry.id];
    if (!meta) {
      throw new Error(`Missing entryMeta for ${entry.id}`);
    }
    records.push({ ...entry, ...meta });
  }
}

for (const entry of json.grammar_catalog) {
  const meta = grammarMeta[entry.id];
  if (!meta) {
    throw new Error(`Missing grammarMeta for ${entry.id}`);
  }
  records.push({ ...entry, ...meta });
}

function escape(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

const statements = ['BEGIN TRANSACTION;'];
for (const record of records) {
  const category = record.category || 'syntax';
  const title = record.title || record.id;
  const definition = record.definition || title;
  const row = [
    escape(record.id),
    'NULL',
    escape(category),
    escape(title),
    escape(record.ar),
    'NULL',
    `'active'`,
    escape(definition),
    escape(record.ar),
    'NULL',
    'NULL',
    'NULL',
    'NULL',
    'NULL',
    `datetime('now')`,
    'NULL',
  ];
  statements.push(`INSERT OR REPLACE INTO grammatical_concepts
    (id, user_id, category, title, title_ar, difficulty, status, definition, definition_ar, signals_json, mistakes_json, examples_json, capture_refs_json, cards_json, created_at, updated_at)
    VALUES (${row.join(', ')});`);
}
statements.push('COMMIT;');
console.log(statements.join('\n'));
