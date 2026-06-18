-- Global sentence-structure term dictionary (qr_ss_term).
-- Keyed by the Arabic grammatical role exactly as it appears in
-- qr_irab_book_entries.grammar_role_ar and qr_ss_occ_clause, so the
-- sentence-structure step can colour every grounded node by its real iʿrāb role.
-- Colours are a stable, distinct palette tuned for the dark gold-on-black UI.
INSERT OR REPLACE INTO qr_ss_term (term_key, label_ar, label_en, color, category, sort_order) VALUES
 ('مبتدأ',          'مبتدأ',          'subject (mubtadaʾ)',                 '#4285F4', 'constituent', 1),
 ('خبر',            'خبر',            'predicate (khabar)',                 '#34A853', 'constituent', 2),
 ('فاعل',           'فاعل',           'verbal subject (fāʿil)',             '#AB47BC', 'constituent', 3),
 ('نائب فاعل',      'نائب فاعل',      'deputy subject (nāʾib fāʿil)',       '#BA68C8', 'constituent', 4),
 ('مفعول به',       'مفعول به',       'direct object (mafʿūl bihi)',        '#FFB74D', 'constituent', 5),
 ('مفعول مطلق',     'مفعول مطلق',     'cognate accusative (mafʿūl muṭlaq)', '#F06292', 'constituent', 6),
 ('مضاف إليه',      'مضاف إليه',      'genitive annexed (muḍāf ilayhi)',    '#FB8C00', 'constituent', 7),
 ('نعت',            'نعت',            'adjective (naʿt)',                   '#E53935', 'constituent', 8),
 ('بدل',            'بدل',            'appositive (badal)',                 '#8D6E63', 'constituent', 9),
 ('توكيد',          'توكيد',          'emphasis (tawkīd)',                  '#7986CB', 'constituent', 10),
 ('عطف',            'عطف',            'conjunction (ʿaṭf)',                 '#C0CA33', 'particle',    11),
 ('حال',            'حال',            'circumstantial (ḥāl)',               '#4DD0E1', 'constituent', 12),
 ('تمييز',          'تمييز',          'specification (tamyīz)',             '#9CCC65', 'constituent', 13),
 ('ظرف',            'ظرف',            'adverbial (ẓarf)',                   '#A1887F', 'constituent', 14),
 ('متعلق',          'متعلق',          'governed attachment (mutaʿalliq)',   '#90A4AE', 'constituent', 15),
 ('جار ومجرور',     'جار ومجرور',     'prep. + genitive (jārr wa-majrūr)',  '#00ACC1', 'particle',    16),
 ('منادى',          'منادى',          'vocative (munādā)',                  '#FF7043', 'constituent', 17),
 ('صلة الموصول',    'صلة الموصول',    'relative clause (ṣilat al-mawṣūl)',  '#80CBC4', 'clause',      18),
 ('جواب الشرط',     'جواب الشرط',     'apodosis (jawāb al-sharṭ)',          '#EF6C92', 'clause',      19),
 ('جواب النداء',    'جواب النداء',    'response to vocative',               '#26A69A', 'clause',      20),
 ('لا محل لها',     'لا محل لها',     'no syntactic position',              '#757575', 'clause',      21),
 ('في محل رفع',     'في محل رفع',     'in nominative position',             '#5C6BC0', 'clause',      22),
 ('في محل نصب',     'في محل نصب',     'in accusative position',             '#5C6BC0', 'clause',      23),
 ('في محل جر',      'في محل جر',      'in genitive position',               '#5C6BC0', 'clause',      24),
 ('في محل جزم',     'في محل جزم',     'in jussive position',                '#5C6BC0', 'clause',      25);
