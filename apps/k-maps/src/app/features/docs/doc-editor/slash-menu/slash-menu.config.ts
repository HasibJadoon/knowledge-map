import { Editor, Range } from '@tiptap/core';

export interface SlashCommand {
  title: string;
  description: string;
  icon: string;
  group: string;
  shortcut?: string;
  command: (opts: { editor: Editor; range: Range }) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ── Text ────────────────────────────────────────────────
  {
    title: 'Text', description: 'Plain paragraph', icon: 'T', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Heading 1', description: 'Large section heading', icon: 'H1', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2', description: 'Medium section heading', icon: 'H2', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3', description: 'Small section heading', icon: 'H3', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List', description: 'Unordered list', icon: '•≡', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List', description: 'Ordered list', icon: '1≡', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'To-do List', description: 'Checklist items', icon: '☑≡', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Blockquote', description: 'Indented quote block', icon: '❝', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: 'Code Block', description: 'Monospace code block', icon: '</>', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: 'Callout', description: 'Highlighted callout with icon', icon: '💡', group: 'Style',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'callout', attrs: { emoji: '💡' }, content: [{ type: 'paragraph' }] });
    },
  },
  {
    title: 'Divider', description: 'Horizontal rule', icon: '—', group: 'Style',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },

  // ── Pages ───────────────────────────────────────────────
  {
    title: 'New Page', description: 'Create a linked sub-document', icon: '📄', group: 'Pages',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Dispatch a custom event — DocEditorService listens and creates the page
      editor.view.dom.dispatchEvent(
        new CustomEvent('km:create-page', { bubbles: true, detail: { pos: editor.state.selection.from } })
      );
    },
  },

  // ── Quran ───────────────────────────────────────────────
  {
    title: 'Ayah Embed', description: 'Insert a Quran verse block', icon: 'آ', group: 'Quran',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const ref = window.prompt('Surah:Ayah (e.g. 12:3)');
      if (!ref) return;
      const [s, a] = ref.split(':').map(Number);
      if (!s || !a) return;
      fetch(`/api/ar/quran/ayahs?surah=${s}&ayah=${a}`)
        .then(r => r.json())
        .then((data: { ayahs?: Array<{ text_uthmani_clean?: string; text_uthmani?: string; translation?: string }> }) => {
          const ayah = data.ayahs?.[0];
          editor.commands.insertContent({
            type: 'ayah_embed',
            attrs: {
              id: crypto.randomUUID(), surah: s, ayah: a,
              text_uthmani: ayah?.text_uthmani_clean ?? ayah?.text_uthmani ?? '',
              translation: ayah?.translation ?? '',
              show_translation: true, dir: 'rtl', lang: 'ar'
            }
          });
        });
    },
  },
  {
    title: 'Passage Embed', description: 'Insert a Quran passage block', icon: 'قر', group: 'Quran',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'passage_embed', attrs: { surah: null, ayah_from: null, ayah_to: null } });
    },
  },

  // ── Arabic ──────────────────────────────────────────────
  {
    title: 'Vocabulary', description: 'Insert a vocab card with root & meanings', icon: 'ع', group: 'Arabic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'vocab_block', attrs: { vocab_id: null, word: '', root: '', meanings: '[]' } });
    },
  },
  {
    title: 'Morphology', description: 'Word breakdown: root, pattern, POS', icon: 'م', group: 'Arabic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'morphology_block', attrs: { word: '', root: '', pattern: '', pos: '', tense: null, case_ending: null } });
    },
  },
  {
    title: 'Nahw Block', description: 'Sentence with إعراب labels per word', icon: 'ن', group: 'Arabic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'nahw_block', attrs: { sentence: '', analysis: '[]' } });
    },
  },
  {
    title: 'Root Analysis', description: 'All derivatives + Quran occurrences', icon: 'ج', group: 'Arabic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'root_analysis_block', attrs: { root: '', derivatives: '[]' } });
    },
  },

  // ── Worldview ───────────────────────────────────────────
  {
    title: 'Claim', description: 'State a scholarly claim or thesis', icon: '⚡', group: 'Worldview',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'claim_block', attrs: { claim: '', confidence: 'medium', tags: '[]' } });
    },
  },
  {
    title: 'Evidence', description: 'Link evidence to a source', icon: '📎', group: 'Worldview',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'evidence_block', attrs: { source_id: null, quote: '', page_ref: null } });
    },
  },
  {
    title: 'Reflection', description: 'Personal reflection block', icon: '💭', group: 'Worldview',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'reflection_block', attrs: { content: '' } });
    },
  },

  // ── Production ──────────────────────────────────────────
  {
    title: 'Task', description: 'Action item linked to planner', icon: '☑', group: 'Production',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'task_block', attrs: { title: '', due_date: null, priority: 2, status: 'pending', plan_item_id: null } });
    },
  },
  {
    title: 'Scene', description: 'Podcast/video scene block', icon: '🎬', group: 'Production',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'scene_block', attrs: { title: '', duration_mins: null, notes: '' } });
    },
  },
  {
    title: 'Timeline Entry', description: 'Add a timeline event', icon: '⏱', group: 'Production',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'timeline_block', attrs: { label: '', date: '', note: '' } });
    },
  },

  // ── Learning ────────────────────────────────────────────
  {
    title: 'Comprehension Q', description: 'Comprehension question with answer', icon: '?', group: 'Learning',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'comprehension_block', attrs: { question: '', answer: '', difficulty: 2 } });
    },
  },
  {
    title: 'Children Block', description: 'Simplified explanation for children', icon: '🧒', group: 'Learning',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent({ type: 'children_block', attrs: { content: '', age_range: '6-10' } });
    },
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    cmd => cmd.title.toLowerCase().includes(q) || cmd.group.toLowerCase().includes(q)
  );
}
