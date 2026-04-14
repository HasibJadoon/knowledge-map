import { Node, mergeAttributes } from '@tiptap/core';

// ── claim_block ──────────────────────────────────────────────────────────────
export const ClaimBlock = Node.create({
  name: 'claim_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      claim:      { default: '' },
      confidence: { default: 'medium' }, // 'low'|'medium'|'high'
      tags:       { default: '[]' },
    };
  },

  parseHTML() { return [{ tag: 'km-claim-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-claim-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--claim';
      dom.contentEditable = 'false';
      const update = () => {
        const { claim, confidence } = node.attrs;
        const colorMap: Record<string, string> = { low: '#e57373', medium: '#ffb74d', high: '#81c784' };
        const color = colorMap[confidence] ?? 'var(--km-gold)';
        dom.innerHTML = `
          <div class="kb-claim-header">
            <span class="kb-claim-badge" style="background:${color}20;color:${color}">⚡ ${confidence}</span>
          </div>
          <div class="kb-claim-text">${claim || '<em style="opacity:0.4">Enter claim…</em>'}</div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── evidence_block ───────────────────────────────────────────────────────────
export const EvidenceBlock = Node.create({
  name: 'evidence_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      source_id: { default: null },
      quote:     { default: '' },
      page_ref:  { default: null },
    };
  },

  parseHTML() { return [{ tag: 'km-evidence-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-evidence-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--evidence';
      dom.contentEditable = 'false';
      const update = () => {
        const { quote, page_ref, source_id } = node.attrs;
        dom.innerHTML = `
          <div class="kb-evidence-quote">"${quote || '…'}"</div>
          <div class="kb-evidence-meta">
            ${source_id ? `Source #${source_id}` : '<em>No source linked</em>'}
            ${page_ref ? ` · p. ${page_ref}` : ''}
          </div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── reflection_block ─────────────────────────────────────────────────────────
export const ReflectionBlock = Node.create({
  name: 'reflection_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { content: { default: '' } };
  },

  parseHTML() { return [{ tag: 'km-reflection-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-reflection-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--reflection';
      dom.contentEditable = 'false';
      const update = () => {
        dom.innerHTML = `
          <div class="kb-reflection-icon">💭</div>
          <div class="kb-reflection-content">${node.attrs['content'] || '<em style="opacity:0.4">Reflection…</em>'}</div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── task_block ───────────────────────────────────────────────────────────────
export const TaskBlock = Node.create({
  name: 'task_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title:        { default: '' },
      due_date:     { default: null },
      priority:     { default: 2 },
      status:       { default: 'pending' },
      plan_item_id: { default: null },
    };
  },

  parseHTML() { return [{ tag: 'km-task-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-task-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--task';
      dom.contentEditable = 'false';
      const update = () => {
        const { title, due_date, priority, status } = node.attrs;
        const done = status === 'done';
        const pMap: Record<number, string> = { 1: '🔴', 2: '🟡', 3: '🟢' };
        dom.innerHTML = `
          <span class="kb-task-check" style="opacity:${done ? 1 : 0.3}">☑</span>
          <span class="kb-task-title" style="${done ? 'text-decoration:line-through;opacity:0.5' : ''}">${title || 'New task'}</span>
          <span class="kb-task-meta">${pMap[priority] ?? '🟡'} ${due_date ? due_date : ''}</span>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── scene_block ──────────────────────────────────────────────────────────────
export const SceneBlock = Node.create({
  name: 'scene_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title:         { default: '' },
      duration_mins: { default: null },
      notes:         { default: '' },
    };
  },

  parseHTML() { return [{ tag: 'km-scene-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-scene-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--scene';
      dom.contentEditable = 'false';
      const update = () => {
        const { title, duration_mins, notes } = node.attrs;
        dom.innerHTML = `
          <div class="kb-scene-header">
            <span class="kb-scene-icon">🎬</span>
            <span class="kb-scene-title">${title || 'Scene'}</span>
            ${duration_mins ? `<span class="kb-scene-dur">${duration_mins}m</span>` : ''}
          </div>
          ${notes ? `<div class="kb-scene-notes">${notes}</div>` : ''}
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── timeline_block ───────────────────────────────────────────────────────────
export const TimelineBlock = Node.create({
  name: 'timeline_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: '' },
      date:  { default: '' },
      note:  { default: '' },
    };
  },

  parseHTML() { return [{ tag: 'km-timeline-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-timeline-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--timeline';
      dom.contentEditable = 'false';
      const update = () => {
        const { label, date, note } = node.attrs;
        dom.innerHTML = `
          <div class="kb-timeline-dot"></div>
          <div class="kb-timeline-body">
            <span class="kb-timeline-label">${label || 'Event'}</span>
            ${date ? `<span class="kb-timeline-date">${date}</span>` : ''}
            ${note ? `<div class="kb-timeline-note">${note}</div>` : ''}
          </div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── comprehension_block ──────────────────────────────────────────────────────
export const ComprehensionBlock = Node.create({
  name: 'comprehension_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      question:   { default: '' },
      answer:     { default: '' },
      difficulty: { default: 2 },
    };
  },

  parseHTML() { return [{ tag: 'km-comprehension-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-comprehension-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--comprehension';
      dom.contentEditable = 'false';
      let revealed = false;
      const update = () => {
        const { question, answer } = node.attrs;
        dom.innerHTML = `
          <div class="kb-comp-q"><strong>Q:</strong> ${question || 'Question…'}</div>
          <div class="kb-comp-a" style="${revealed ? '' : 'filter:blur(4px);user-select:none'}">
            <strong>A:</strong> ${answer || 'Answer…'}
          </div>
          <button class="kb-comp-reveal" style="margin-top:6px;font-size:0.75rem;
            background:var(--km-surface-2);border:1px solid var(--km-border);
            border-radius:5px;padding:3px 8px;cursor:pointer;color:var(--km-text-2)">
            ${revealed ? 'Hide' : 'Reveal'}
          </button>
        `;
        dom.querySelector('.kb-comp-reveal')?.addEventListener('mousedown', e => {
          e.preventDefault();
          revealed = !revealed;
          update();
        });
      };
      update();
      return { dom };
    };
  },
});

// ── children_block ───────────────────────────────────────────────────────────
export const ChildrenBlock = Node.create({
  name: 'children_block',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      content:   { default: '' },
      age_range: { default: '6-10' },
    };
  },

  parseHTML() { return [{ tag: 'km-children-block' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-children-block', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--children';
      dom.contentEditable = 'false';
      const update = () => {
        const { content, age_range } = node.attrs;
        dom.innerHTML = `
          <div class="kb-children-header">🧒 Ages ${age_range}</div>
          <div class="kb-children-content">${content || '<em style="opacity:0.4">Simple explanation…</em>'}</div>
        `;
      };
      update();
      return { dom };
    };
  },
});

// ── passage_embed ────────────────────────────────────────────────────────────
export const PassageEmbed = Node.create({
  name: 'passage_embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      surah:     { default: null },
      ayah_from: { default: null },
      ayah_to:   { default: null },
    };
  },

  parseHTML() { return [{ tag: 'km-passage-embed' }]; },
  renderHTML({ HTMLAttributes }) { return ['km-passage-embed', mergeAttributes(HTMLAttributes)]; },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--passage';
      dom.contentEditable = 'false';
      const update = () => {
        const { surah, ayah_from, ayah_to } = node.attrs;
        if (surah && ayah_from) {
          dom.innerHTML = `<div class="kb-passage-ref">Surah ${surah}: ${ayah_from}${ayah_to && ayah_to !== ayah_from ? '–' + ayah_to : ''}</div>`;
        } else {
          dom.innerHTML = `<div class="kb-passage-ref" style="opacity:0.4">Passage — enter Surah:Ayah range</div>`;
        }
      };
      update();
      return { dom };
    };
  },
});
