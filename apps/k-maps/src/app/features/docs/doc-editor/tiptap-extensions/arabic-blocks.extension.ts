import { Node, mergeAttributes } from '@tiptap/core';

// ── vocab_block ─────────────────────────────────────────────────────────────
export const VocabBlock = Node.create({
  name: 'vocab_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      vocab_id:  { default: null },
      word:      { default: '' },
      root:      { default: '' },
      meanings:  { default: '[]' },
    };
  },

  parseHTML() { return [{ tag: 'km-vocab-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-vocab-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--vocab';
      dom.contentEditable = 'false';
      const update = () => {
        const { word, root, meanings } = node.attrs;
        let parsedMeanings: string[] = [];
        try { parsedMeanings = JSON.parse(meanings); } catch { /* ignore */ }
        dom.innerHTML = `
          <div class="kb-vocab-word" dir="rtl">${word}</div>
          <div class="kb-vocab-root">Root: ${root}</div>
          <div class="kb-vocab-meanings">${parsedMeanings.join(' · ')}</div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── morphology_block ────────────────────────────────────────────────────────
export const MorphologyBlock = Node.create({
  name: 'morphology_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      word:         { default: '' },
      root:         { default: '' },
      pattern:      { default: '' },
      pos:          { default: '' },
      tense:        { default: null },
      case_ending:  { default: null },
    };
  },

  parseHTML() { return [{ tag: 'km-morphology-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-morphology-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--morphology';
      dom.contentEditable = 'false';
      const update = () => {
        const { word, root, pattern, pos, tense, case_ending } = node.attrs;
        dom.innerHTML = `
          <div class="kb-morph-word" dir="rtl">${word}</div>
          <div class="kb-morph-grid">
            <span class="kb-morph-cell"><label>Root</label>${root}</span>
            <span class="kb-morph-cell"><label>Pattern</label>${pattern}</span>
            <span class="kb-morph-cell"><label>POS</label>${pos}</span>
            ${tense ? `<span class="kb-morph-cell"><label>Tense</label>${tense}</span>` : ''}
            ${case_ending ? `<span class="kb-morph-cell"><label>Case</label>${case_ending}</span>` : ''}
          </div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── nahw_block ───────────────────────────────────────────────────────────────
export const NahwBlock = Node.create({
  name: 'nahw_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      sentence:  { default: '' },
      analysis:  { default: '[]' }, // JSON: [{word, term_ar, term_en}]
    };
  },

  parseHTML() { return [{ tag: 'km-nahw-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-nahw-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--nahw';
      dom.contentEditable = 'false';
      const update = () => {
        const { sentence, analysis } = node.attrs;
        let parsed: Array<{ word: string; term_ar: string; term_en: string }> = [];
        try { parsed = JSON.parse(analysis); } catch { /* ignore */ }
        const words = parsed.length
          ? parsed.map(w => `<span class="kb-nahw-word"><span class="kb-nahw-term">${w.term_ar}</span><span dir="rtl">${w.word}</span></span>`).join('')
          : `<span dir="rtl">${sentence}</span>`;
        dom.innerHTML = `<div class="kb-nahw-sentence" dir="rtl">${words}</div>`;
      };
      update();
      return { dom };
    };
  },
});

// ── root_analysis_block ──────────────────────────────────────────────────────
export const RootAnalysisBlock = Node.create({
  name: 'root_analysis_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      root:        { default: '' },
      derivatives: { default: '[]' }, // JSON: [{word, meaning, occurrences}]
    };
  },

  parseHTML() { return [{ tag: 'km-root-analysis-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-root-analysis-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--root-analysis';
      dom.contentEditable = 'false';
      const update = () => {
        const { root, derivatives } = node.attrs;
        let parsed: Array<{ word: string; meaning: string; occurrences?: number }> = [];
        try { parsed = JSON.parse(derivatives); } catch { /* ignore */ }
        dom.innerHTML = `
          <div class="kb-root-title" dir="rtl">ج: ${root}</div>
          <div class="kb-root-grid">
            ${parsed.map(d => `
              <div class="kb-root-item">
                <span class="kb-root-word" dir="rtl">${d.word}</span>
                <span class="kb-root-meaning">${d.meaning}</span>
                ${d.occurrences ? `<span class="kb-root-occ">${d.occurrences}×</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      };
      update();
      return { dom };
    };
  },
});
