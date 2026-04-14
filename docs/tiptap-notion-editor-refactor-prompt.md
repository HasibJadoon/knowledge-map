# K-MAPS Doc Editor — Complete Visual Fix Prompt
## Deep Analysis of Screenshots + All Fixes

> **Target**: `apps/app-k-maps/src/app/features/docs/doc-editor/doc-editor.page.ts`
> **Framework**: Ionic 8 + Angular 20 + Tiptap 3.22
> **Status**: Working editor with visual bugs that need precise fixes

---

## PART A — Root Cause Analysis (What's Actually Wrong)

### Issue 0 — Divider `---` Not Working (Input Rule Bug)

**What you see**: Typing `---` in the editor does NOT produce a horizontal rule / divider.

**Root cause**: Tiptap 3's StarterKit includes `HorizontalRule` but its input rule fires on `---` followed by a **newline** (Enter key), not on typing `---` alone. On mobile, the soft keyboard behavior can prevent the rule from triggering. Also, `StarterKit.configure({ ... })` in the service doesn't explicitly configure HorizontalRule, so the default config is used — which in Tiptap 3 changed the input rule pattern.

**Fix — Explicit HorizontalRule with custom input rule** in `doc-editor.service.ts`:

```typescript
// Add this import at top
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { InputRule } from '@tiptap/core';

// Create a custom HorizontalRule with explicit input rule
const KmHorizontalRule = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|━━━)\s$/,  // matches: --- , —-, ━━━ followed by space
        handler: ({ state, range, chain }) => {
          chain()
            .deleteRange(range)
            .setHorizontalRule()
            .run();
        },
      }),
    ];
  },
});

// In initEditor extensions array — replace any implicit StarterKit HR:
StarterKit.configure({
  link: false,
  underline: false,
  horizontalRule: false,  // ← disable StarterKit's built-in HR
}),
KmHorizontalRule,         // ← use our custom version
```

**Mobile trigger**: On touch keyboards, users often don't press Enter immediately. Add the Divider button `—` to the bottom toolbar (already done in Part B Section 4) so it's always accessible with one tap.

**Slash command** `/divider` also works regardless of keyboard behavior.

---

### Issue 1 — H1 Color is Overriding User's Text Color

**What you see**: H1 heading appears with gradient/fixed color; when you apply a color via the toolbar (blue, purple, etc.) it shows on the text. The gradient CSS **blocks** the Color extension from displaying properly.

**Root cause**: The H1 style uses:
```css
background: linear-gradient(115deg, #ffffff 38%, rgba(201,168,76,0.9) 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;   /* ← THIS blocks Color extension */
```

`-webkit-text-fill-color: transparent` makes ALL text in H1 transparent (showing the background gradient). When Tiptap's Color extension adds `style="color: blue"` inline, it sets CSS `color` property — but `-webkit-text-fill-color` takes precedence over `color` in WebKit, so the user's chosen color is invisible.

**Fix**: Use `:not([style*="color"])` to only apply gradient when no user color is present:

```css
/* H1 gradient ONLY when user has not applied a custom color */
:global(.ProseMirror h1:not([style*="color"])),
:global(.ProseMirror h1 > span:not([style*="color"])) {
  background: linear-gradient(115deg, #ffffff 38%, rgba(201,168,76,0.9) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* When user applies color via toolbar: respect it */
:global(.ProseMirror h1[style*="color"]),
:global(.ProseMirror h1 span[style*="color"]) {
  -webkit-text-fill-color: unset !important;
  background: none !important;
  background-clip: unset !important;
}
```

But wait — Tiptap's Color extension applies color to `<span>` elements INSIDE the heading, not to the heading element itself. So we need to reset the gradient on the heading when any child span has a color:

**Better fix — remove gradient from H1 entirely (professional & clean)**:

```css
/* H1 — NO gradient, clean white. User can apply any color they want. */
:global(.ProseMirror h1) {
  font-size: 1.92rem;
  font-weight: 800;
  line-height: 1.18;
  margin: 1.6em 0 0.45em;
  letter-spacing: -0.03em;
  color: rgba(255, 255, 255, 0.96);  /* ← solid color, no gradient */
  /* NO background-clip, NO -webkit-text-fill-color */
}
```

The Notion aesthetic does NOT use gradient headings. Clean white on black is the correct approach.

---

### Issue 2 — Color Extension Must Work on ALL Text Including Headings

**What you see**: When you pick a color from the toolbar, it applies to paragraph text. For headings, either the color is hidden (gradient conflict) or doesn't apply.

**Root cause**: The H1 uses `-webkit-text-fill-color: transparent` which prevents any `color` CSS property from showing. Additionally, Tiptap's Color extension wraps selected text in `<span style="color: ...">`. For this to work on headings, the heading must NOT use `-webkit-text-fill-color`.

**Fix**: After removing gradient from H1 (Issue 1 fix), the Color extension will work automatically on all headings. No additional changes needed.

**Also ensure TextStyle + Color are in the extension list** (they already are in `doc-editor.service.ts`):
```typescript
TextStyle,
Color,
```

---

### Issue 3 — Blockquote Shows Wrong Font ("Qutie" in Monospace)

**What you see**: The blockquote block displays text in what appears to be a code/monospace font instead of Poppins.

**Root cause**: The `:global(.ProseMirror blockquote)` styles in the component's inline `styles: []` may not apply correctly in all build environments. The `:global()` pseudo-class is a CSS Modules concept — Angular's build system may or may not strip it. When it fails, the blockquote falls back to browser defaults which on some platforms use a monospace or serif font.

**Fix — move ALL ProseMirror styles out of the component and into `global.scss`**:

Create a new file `apps/app-k-maps/src/app/features/docs/doc-editor/_editor.scss` and import it in `global.scss`. This guarantees 100% reliable CSS application without any Angular encapsulation interference.

See Part B Section 1 for the complete `_editor.scss` file.

---

### Issue 4 — Empty Callout Has Large Blank Space

**What you see**: A callout block with just the 💡 emoji and a large empty gray area below it with no text.

**Root cause**: The `contentDOM` (`.km-callout__content`) has `min-height: 2em` but when empty, ProseMirror inserts a trailing break. The Placeholder extension only shows a placeholder on the first paragraph of the document, not inside block nodes.

**Fix**: Add a callout-specific placeholder via CSS:

```css
/* Callout placeholder — shown when empty */
.km-callout__content > p.is-empty::before,
.km-callout__content > p:first-child:only-child:empty::before {
  content: 'Write something…';
  color: rgba(255, 255, 255, 0.22);
  pointer-events: none;
  float: left;
  height: 0;
  font-style: italic;
}
```

---

### Issue 5 — Callout Content Text Color (Green Text in Callout)

**What you see**: The callout "Thats is great / Test thats" shows in GREEN color.

**Root cause**: The user manually applied green color using the Color extension. This is CORRECT behavior — the Color extension working inside a callout. This is NOT a bug.

**However**, there's a related styling issue: the callout content uses hardcoded `color: rgba(255,255,255,0.88)` which is then overridden by Tiptap's inline `color` spans. This chain works correctly.

**If the user wants to reset colors**: Add a "Reset color" option to the highlight toolbar. This calls `editor.chain().focus().unsetColor().run()`.

---

### Issue 6 — `styles: [...]` with `:global()` — Unreliable in Angular

**Root cause**: Using `:global()` in Angular component's inline `styles: [...]` array is not guaranteed to work across all builds, Ionic versions, and Capacitor bundling. Some styles apply, some don't, depending on how the Angular/esbuild pipeline handles the pseudo-class.

**Fix**: Move ALL `.ProseMirror` styles to a file imported in `global.scss`. This bypasses Angular's encapsulation entirely and guarantees all styles apply.

---

## PART B — Complete File Replacements

### B1 — Create `_editor.scss` (Global Editor Styles)

Create this new file:
**`apps/app-k-maps/src/app/features/docs/doc-editor/_editor.scss`**

```scss
// ═══════════════════════════════════════════════════════════════════════════
// K-MAPS TIPTAP EDITOR — Global Styles
// Imported in global.scss — NOT in a component (avoids Angular encapsulation)
// ═══════════════════════════════════════════════════════════════════════════

// ── Editor mount wrapper ──────────────────────────────────────────────────
.km-doc-editor-el {
  position: relative;
  padding: 24px 20px 120px 54px;

  // Kill Ionic's primary-color focus ring on contenteditable
  --highlight-color-focused: transparent;
  --highlight-color-invalid: transparent;
}

// ── ProseMirror root ──────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  min-height: 60vh;
  font-size: 1.02rem;
  line-height: 1.82;
  color: rgba(255, 255, 255, 0.88);
  font-family: var(--ion-font-family, 'Poppins', sans-serif);
  caret-color: #c9a84c;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-user-select: text;
  user-select: text;
}

// ── Selection highlight ───────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror *::selection {
  background: rgba(201, 168, 76, 0.25);
}

// ── Placeholder ───────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: rgba(255, 255, 255, 0.22);
  pointer-events: none;
  float: left;
  height: 0;
  font-style: italic;
}

// ── Paragraphs ────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror p {
  margin: 0.1em 0 0.65em;
  line-height: 1.82;
}

// ────────────────────────────────────────────────────────────────────────
// HEADINGS
// No gradient — clean white. Color extension works fully on all headings.
// ────────────────────────────────────────────────────────────────────────

.km-doc-editor-el .ProseMirror h1 {
  font-size: 1.92rem;
  font-weight: 800;
  line-height: 1.18;
  margin: 1.5em 0 0.4em;
  letter-spacing: -0.03em;
  color: rgba(255, 255, 255, 0.97);
  // ── NO gradient, NO -webkit-text-fill-color ──
  // This lets the Color extension apply user-chosen colors freely
}

.km-doc-editor-el .ProseMirror h1:first-child {
  margin-top: 0.4em;
}

.km-doc-editor-el .ProseMirror h2 {
  font-size: 1.38rem;
  font-weight: 700;
  line-height: 1.28;
  margin: 1.4em 0 0.4em;
  letter-spacing: -0.018em;
  color: rgba(255, 255, 255, 0.92);
  padding-bottom: 0.32em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.km-doc-editor-el .ProseMirror h3 {
  font-size: 1.14rem;
  font-weight: 600;
  line-height: 1.38;
  margin: 1.2em 0 0.3em;
  letter-spacing: -0.01em;
  color: rgba(255, 255, 255, 0.76);
}

.km-doc-editor-el .ProseMirror h4 {
  font-size: 0.76rem;
  font-weight: 700;
  margin: 1em 0 0.25em;
  color: rgba(201, 168, 76, 0.82);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

// ── Block active state (MobileBlockHandle) ────────────────────────────────
.km-doc-editor-el .ProseMirror > .km-block-active,
.km-doc-editor-el .ProseMirror li.km-block-active {
  background: rgba(255, 255, 255, 0.028);
  border-radius: 6px;
  outline: 1px solid rgba(255, 255, 255, 0.07);
  outline-offset: 1px;
}

// ────────────────────────────────────────────────────────────────────────
// BLOCKQUOTE
// Clean gold-border Notion-style. Poppins font (inherits parent).
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror blockquote {
  border-left: 3.5px solid rgba(201, 168, 76, 0.8);
  padding: 10px 16px 10px 18px;
  margin: 12px 0;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(201, 168, 76, 0.055);
  border-radius: 0 10px 10px 0;
  font-family: var(--ion-font-family, 'Poppins', sans-serif) !important; // ← force Poppins
  font-style: normal; // Not italic — cleaner
  position: relative;
}

.km-doc-editor-el .ProseMirror blockquote p {
  margin: 0;
  font-family: inherit !important;
}

// Optional: faint opening quote ornament
.km-doc-editor-el .ProseMirror blockquote::before {
  content: '"';
  position: absolute;
  top: 2px;
  left: 6px;
  font-size: 1.8rem;
  color: rgba(201, 168, 76, 0.22);
  font-family: Georgia, serif;
  line-height: 1;
  pointer-events: none;
}

// ────────────────────────────────────────────────────────────────────────
// CODE
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror code {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 0.1em 0.4em;
  font-size: 0.86em;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  color: #e8a87c; // warm orange — readable on dark bg
}

.km-doc-editor-el .ProseMirror pre {
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 14px 16px;
  margin: 10px 0;
  font-size: 0.84rem;
  line-height: 1.7;
  overflow-x: auto;
  position: relative;
}

// Gold shimmer top edge on code blocks
.km-doc-editor-el .ProseMirror pre::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.2), transparent);
  border-radius: 10px 10px 0 0;
}

.km-doc-editor-el .ProseMirror pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: rgba(255, 255, 255, 0.88);
}

// ────────────────────────────────────────────────────────────────────────
// DIVIDER / HORIZONTAL RULE
// Diamond ornament divider — keep original design
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror hr {
  display: block;
  width: 100%;
  border: none;
  margin: 2.2em 0;
  height: 20px;
  position: relative;
  overflow: visible;
  background:
    linear-gradient(
      90deg,
      transparent 0%,
      rgba(201, 168, 76, 0.12) 8%,
      rgba(201, 168, 76, 0.62) 42%,
      transparent 48%
    ) center left / 50% 1px no-repeat,
    linear-gradient(
      90deg,
      transparent 52%,
      rgba(201, 168, 76, 0.62) 58%,
      rgba(201, 168, 76, 0.12) 92%,
      transparent 100%
    ) center right / 50% 1px no-repeat;
  cursor: default;
}

.km-doc-editor-el .ProseMirror hr::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%; top: 50%;
  width: 8px; height: 8px;
  transform: translate(-50%, -50%) rotate(45deg);
  border: 1.5px solid rgba(201, 168, 76, 0.72);
  background: var(--ion-background-color, #080808); // same as page bg
}

// ────────────────────────────────────────────────────────────────────────
// LISTS
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror ul,
.km-doc-editor-el .ProseMirror ol {
  padding-left: 1.55em;
  margin: 0.4em 0 0.6em;
}

.km-doc-editor-el .ProseMirror ul { list-style-type: disc !important; }
.km-doc-editor-el .ProseMirror ol { list-style-type: decimal !important; }
.km-doc-editor-el .ProseMirror li { margin: 0.28em 0; line-height: 1.78; }

.km-doc-editor-el .ProseMirror li > p,
.km-doc-editor-el .ProseMirror li p { margin: 0; }

.km-doc-editor-el .ProseMirror li > ul,
.km-doc-editor-el .ProseMirror li > ol { margin: 0.2em 0 0.1em; }

// Bullet markers — gold accent with levels
.km-doc-editor-el .ProseMirror ul li::marker         { color: rgba(201, 168, 76, 0.75); font-size: 0.82em; }
.km-doc-editor-el .ProseMirror ol li::marker         { color: rgba(201, 168, 76, 0.65); font-weight: 700; }
.km-doc-editor-el .ProseMirror ul ul                 { list-style-type: circle !important; }
.km-doc-editor-el .ProseMirror ul ul ul              { list-style-type: square !important; }
.km-doc-editor-el .ProseMirror ul ul li::marker      { color: rgba(201, 168, 76, 0.45); }
.km-doc-editor-el .ProseMirror ul ul ul li::marker   { color: rgba(201, 168, 76, 0.28); }

// ────────────────────────────────────────────────────────────────────────
// TASK LIST (checkboxes)
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror ul[data-type="taskList"] {
  list-style: none !important;
  padding-left: 4px;
}

.km-doc-editor-el .ProseMirror ul[data-type="taskList"] li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 3px 0;
  margin: 2px 0;
}

.km-doc-editor-el .ProseMirror ul[data-type="taskList"] li > label {
  flex-shrink: 0;
  margin-top: 3px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.km-doc-editor-el .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #c9a84c;
  border-radius: 4px;
  cursor: pointer;
}

.km-doc-editor-el .ProseMirror ul[data-type="taskList"] li > div {
  flex: 1;
  min-width: 0;
}

.km-doc-editor-el .ProseMirror ul[data-type="taskList"] li > div p {
  margin: 0;
}

.km-doc-editor-el .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
  opacity: 0.45;
  text-decoration: line-through;
  text-decoration-color: rgba(255, 255, 255, 0.3);
}

// ────────────────────────────────────────────────────────────────────────
// INLINE MARKS
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror strong {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.97);
}

.km-doc-editor-el .ProseMirror em {
  font-style: italic;
  color: rgba(255, 255, 255, 0.84);
}

.km-doc-editor-el .ProseMirror u {
  text-decoration-color: rgba(255, 255, 255, 0.38);
  text-underline-offset: 3px;
}

.km-doc-editor-el .ProseMirror s {
  text-decoration-color: rgba(255, 255, 255, 0.28);
}

.km-doc-editor-el .ProseMirror mark {
  border-radius: 3px;
  padding: 0.06em 0.22em;
  // color set inline by Tiptap highlight extension
}

.km-doc-editor-el .ProseMirror a {
  color: rgba(201, 168, 76, 0.92);
  text-decoration: underline;
  text-decoration-color: rgba(201, 168, 76, 0.3);
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  transition: color 0.12s, text-decoration-color 0.12s;
}

// ── IMPORTANT: span[style*="color"] must always show through ─────────────
// This ensures the Color extension always works on all elements
.km-doc-editor-el .ProseMirror span[style*="color"] {
  -webkit-text-fill-color: currentColor !important; // override any gradient clip
}

// ────────────────────────────────────────────────────────────────────────
// CALLOUT BLOCK
// Styles defined here supplement the JS-injected styles in callout.extension.ts
// ────────────────────────────────────────────────────────────────────────
.km-callout {
  display: flex;
  gap: 12px;
  padding: 13px 16px 13px 14px;
  margin: 8px 0;
  border-left: none;
  border-radius: 10px;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.km-callout::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  border-radius: 10px 0 0 10px;
}

// Variants
.km-callout--tip     { background: rgba(201, 168, 76, 0.10); }
.km-callout--tip::before     { background: #c9a84c; }
.km-callout--info    { background: rgba(59, 130, 246, 0.09); }
.km-callout--info::before    { background: #3b82f6; }
.km-callout--warning { background: rgba(245, 158, 11, 0.09); }
.km-callout--warning::before { background: #f59e0b; }
.km-callout--danger  { background: rgba(239, 68, 68, 0.09); }
.km-callout--danger::before  { background: #ef4444; }
.km-callout--success { background: rgba(34, 197, 94, 0.09); }
.km-callout--success::before { background: #22c55e; }
.km-callout--quote   { background: rgba(255, 255, 255, 0.04); font-style: italic; }
.km-callout--quote::before   { background: rgba(255, 255, 255, 0.18); }

// Emoji
.km-callout__emoji {
  font-size: 1.3rem;
  line-height: 1.5;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  min-width: 1.75rem;
  text-align: center;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-top: 0;
  -webkit-tap-highlight-color: transparent;
}

.km-callout__emoji:active {
  transform: scale(1.25) rotate(-8deg);
}

// Content area
.km-callout__content {
  flex: 1;
  min-width: 0;
  min-height: 1.75em;
  color: rgba(255, 255, 255, 0.88);
  cursor: text;
  font-size: 0.975rem;
  line-height: 1.75;
  -webkit-user-select: text !important;
  user-select: text !important;
  font-family: var(--ion-font-family, 'Poppins', sans-serif) !important;
}

.km-callout__content p {
  margin: 0 0 2px;
  font-family: inherit !important;
}

// Placeholder for empty callout
.km-callout__content > p.is-empty::before,
.km-callout__content > p:first-child:last-child:empty::before {
  content: 'Write a note…';
  color: rgba(255, 255, 255, 0.2);
  pointer-events: none;
  float: left;
  height: 0;
  font-style: italic;
}

// Color extension works inside callout — span[style*="color"] override
.km-callout__content span[style*="color"] {
  -webkit-text-fill-color: currentColor !important;
}

// ────────────────────────────────────────────────────────────────────────
// ARABIC AUTO-DIRECTION
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror p[dir="rtl"],
.km-doc-editor-el .ProseMirror h1[dir="rtl"],
.km-doc-editor-el .ProseMirror h2[dir="rtl"],
.km-doc-editor-el .ProseMirror h3[dir="rtl"],
.km-doc-editor-el .ProseMirror li[dir="rtl"],
.km-doc-editor-el .ProseMirror blockquote[dir="rtl"] {
  font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif) !important;
  font-size: 1.25rem;
  line-height: 2.1;
  letter-spacing: 0;
  word-spacing: 0.04em;
  text-align: right;
}

// ────────────────────────────────────────────────────────────────────────
// SELECTED NODE OUTLINE
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror-selectednode {
  outline: 2px solid rgba(201, 168, 76, 0.4) !important;
  border-radius: 4px;
}

// ────────────────────────────────────────────────────────────────────────
// AYAH EMBED BLOCK
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror .km-block--ayah {
  position: relative;
  direction: rtl;
  background: rgba(201, 168, 76, 0.04);
  border-right: 3px solid rgba(201, 168, 76, 0.72);
  border-radius: 10px;
  padding: 14px 18px 12px;
  margin: 10px 0;
  user-select: text;
  -webkit-user-select: text;
}

.km-doc-editor-el .ProseMirror .km-block--ayah .ayah-text {
  font-family: var(--km-font-arabic, 'Uthmanic Hafs', serif) !important;
  font-size: 1.3rem !important;
  line-height: 2.1 !important;
  color: rgba(255, 255, 255, 0.92);
  text-align: right;
  direction: rtl;
}

.km-doc-editor-el .ProseMirror .km-block--ayah .ayah-translation {
  direction: ltr;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
  font-style: italic;
  line-height: 1.6;
  text-align: left;
  font-family: var(--ion-font-family, 'Poppins', sans-serif) !important;
}

.km-doc-editor-el .ProseMirror .km-block--ayah .ayah-ref {
  direction: ltr;
  font-size: 0.7rem;
  color: rgba(201, 168, 76, 0.72);
  margin-top: 5px;
  font-weight: 600;
  text-align: left;
  font-family: var(--ion-font-family, 'Poppins', sans-serif) !important;
}

.km-doc-editor-el .ProseMirror .km-ayah-copy {
  position: absolute;
  top: 10px;
  left: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 5px 7px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.km-doc-editor-el .ProseMirror .km-ayah-copy:active,
.km-doc-editor-el .ProseMirror .km-ayah-copy--done {
  color: rgba(201, 168, 76, 0.9);
  border-color: rgba(201, 168, 76, 0.35);
  background: rgba(201, 168, 76, 0.08);
}

// ────────────────────────────────────────────────────────────────────────
// SHARED DOMAIN BLOCK BASE
// ────────────────────────────────────────────────────────────────────────
.km-doc-editor-el .ProseMirror .km-block {
  margin: 6px 0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  font-size: 0.92rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
  font-family: var(--ion-font-family, 'Poppins', sans-serif) !important;
}

// ────────────────────────────────────────────────────────────────────────
// HIGHLIGHT TOOLBAR (floating bubble on selection)
// ────────────────────────────────────────────────────────────────────────
.km-hl-toolbar {
  position: fixed;
  z-index: 9000;
  background: #1a1a1a;
  border: 1px solid rgba(201, 168, 76, 0.18);
  border-radius: 12px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.km-hl-btn {
  min-width: 32px;
  min-height: 32px;
  border: none;
  background: none;
  border-radius: 7px;
  font-size: 0.88rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  display: grid;
  place-items: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, color 0.12s;
}

.km-hl-btn:hover,
.km-hl-btn:active { background: rgba(255, 255, 255, 0.08); }

.km-hl-btn.active {
  background: rgba(201, 168, 76, 0.18);
  color: #c9a84c;
}

.km-hl-sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 2px;
  flex-shrink: 0;
}

// Color swatches in toolbar
.km-hl-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  transition: transform 0.12s, border-color 0.12s;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.km-hl-color-dot:active { transform: scale(0.9); }
.km-hl-color-dot.selected { border-color: rgba(255, 255, 255, 0.7); }

// ────────────────────────────────────────────────────────────────────────
// BOTTOM FORMAT BAR (ion-footer)
// ────────────────────────────────────────────────────────────────────────
.km-doc-footer {
  --background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}

.km-doc-footer--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.km-fmt-bar {
  --background: rgba(10, 10, 10, 0.95);
  --border-color: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.km-fmt-scroll {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  padding: 6px 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.km-fmt-btn {
  flex-shrink: 0;
  min-width: 36px;
  min-height: 36px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.62);
  display: grid;
  place-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, color 0.12s;
  padding: 0 4px;
}

.km-fmt-btn:active      { background: rgba(255, 255, 255, 0.06); }
.km-fmt-btn--active     { color: #c9a84c !important; background: rgba(201, 168, 76, 0.1) !important; border-radius: 8px; }

.km-fmt-sep {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.09);
  margin: 0 6px;
  flex-shrink: 0;
}

// ────────────────────────────────────────────────────────────────────────
// SLASH MENU
// ────────────────────────────────────────────────────────────────────────
.km-slash-menu {
  position: fixed;
  z-index: 10000;
  background: #111111;
  border: 1px solid rgba(201, 168, 76, 0.14);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.65), 0 4px 16px rgba(0, 0, 0, 0.4);
  min-width: 260px;
  max-width: min(320px, calc(100vw - 32px));
  max-height: 50vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.km-slash-group-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
  padding: 8px 10px 4px;
}

.km-slash-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 9px;
  cursor: pointer;
  min-height: 50px; // 44px+ touch target
  -webkit-tap-highlight-color: transparent;
}

.km-slash-item:active,
.km-slash-item--selected { background: rgba(201, 168, 76, 0.1); }

.km-slash-item__icon {
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 1rem;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.km-slash-item--selected .km-slash-item__icon,
.km-slash-item:active .km-slash-item__icon {
  background: rgba(201, 168, 76, 0.15);
  border-color: rgba(201, 168, 76, 0.3);
}

.km-slash-item__title {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
  display: block;
}

.km-slash-item__desc {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.35);
  display: block;
  margin-top: 1px;
}
```

---

### B2 — Add Import to `global.scss`

Add this line at the END of `apps/app-k-maps/src/global.scss`:

```scss
// ── Doc editor — ProseMirror styles (global, no Angular encapsulation) ──
@use './app/features/docs/doc-editor/editor' as *;
```

Or using `@import` (if `@use` causes issues with your SCSS setup):
```scss
@import './app/features/docs/doc-editor/editor';
```

---

### B3 — Remove All `:global()` Styles from `doc-editor.page.ts`

In `doc-editor.page.ts`, the `styles: [...]` array currently contains ~600 lines of `:global(.ProseMirror ...)` rules. **Delete all of them** and replace the entire `styles` array with only the component-scoped rules:

```typescript
styles: [`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ── Header title input ─────────────────────────────── */
  .km-doc-title-input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 1rem;
    font-weight: 600;
    color: var(--ion-text-color, rgba(255,255,255,0.92));
    width: 100%;
    font-family: var(--ion-font-family, 'Poppins', sans-serif);
  }
  .km-doc-title-input::placeholder {
    color: rgba(255,255,255,0.28);
  }

  /* ── Save indicator ─────────────────────────────────── */
  .km-save-label {
    font-size: 0.72rem;
    color: rgba(201,168,76,0.7);
    padding-right: 4px;
    min-width: 16px;
    display: inline-block;
  }

  /* ── Ion content background ─────────────────────────── */
  .km-doc-content {
    --background: var(--ion-background-color, #080808);
  }

  /* ── Panel backdrop ─────────────────────────────────── */
  .km-doc-panel-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 200;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .km-doc-panel {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: min(340px, 92vw);
    z-index: 201;
    background: #0e0e0e;
    border-left: 1px solid rgba(201,168,76,0.12);
    overflow-y: auto;
    box-shadow: -8px 0 40px rgba(0,0,0,0.5);
  }
`]
```

All ProseMirror styles now live in `_editor.scss` (globally applied, no encapsulation issues).

---

### B4 — Update Bottom Toolbar — Add Divider + Callout Buttons

In `doc-editor.page.ts` template, update the `km-fmt-scroll` div to add Divider and Callout:

```html
<div class="km-fmt-scroll">
  <!-- Block types -->
  <button class="km-fmt-btn" title="Text" (click)="setBlock('paragraph')">¶</button>
  <button class="km-fmt-btn" title="Heading 1" (click)="setBlock('heading1')">H₁</button>
  <button class="km-fmt-btn" title="Heading 2" (click)="setBlock('heading2')">H₂</button>
  <button class="km-fmt-btn" title="Heading 3" (click)="setBlock('heading3')">H₃</button>

  <div class="km-fmt-sep"></div>

  <!-- Inline marks -->
  <button class="km-fmt-btn" [class.km-fmt-btn--active]="isBold()"      (click)="cmd('bold')"><b>B</b></button>
  <button class="km-fmt-btn" [class.km-fmt-btn--active]="isItalic()"    (click)="cmd('italic')"><i>I</i></button>
  <button class="km-fmt-btn" [class.km-fmt-btn--active]="isUnderline()" (click)="cmd('underline')"><u>U</u></button>
  <button class="km-fmt-btn" [class.km-fmt-btn--active]="isStrike()"    (click)="cmd('strike')"><s>S</s></button>
  <button class="km-fmt-btn" [class.km-fmt-btn--active]="isCode()"      (click)="cmd('code')">&lt;/&gt;</button>

  <div class="km-fmt-sep"></div>

  <!-- Lists -->
  <button class="km-fmt-btn" title="Bullet"   (click)="setBlock('bulletList')">•≡</button>
  <button class="km-fmt-btn" title="Numbered" (click)="setBlock('orderedList')">1≡</button>
  <button class="km-fmt-btn" title="Tasks"    (click)="setBlock('taskList')">☑</button>

  <div class="km-fmt-sep"></div>

  <!-- Block elements -->
  <button class="km-fmt-btn" title="Quote"    (click)="setBlock('blockquote')">❝</button>
  <button class="km-fmt-btn" title="Callout"  (click)="insertCallout()">💡</button>
  <button class="km-fmt-btn" title="Divider"  (click)="insertDivider()">—</button>
  <button class="km-fmt-btn" title="Code block" (click)="setBlock('codeBlock')">{ }</button>

  <div class="km-fmt-sep"></div>

  <!-- Link -->
  <button class="km-fmt-btn" title="Link" (click)="setLink()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  </button>

  <div class="km-fmt-sep"></div>

  <!-- Indent / Outdent -->
  <button class="km-fmt-btn" title="Outdent" (click)="outdent()">⇤</button>
  <button class="km-fmt-btn" title="Indent"  (click)="indent()">⇥</button>
</div>
```

Add these two methods to the `DocEditorPage` class:

```typescript
insertCallout(): void {
  this.editorSvc.editor?.chain().focus().insertContent({
    type: 'callout',
    attrs: { type: 'tip', emoji: '💡' },
    content: [{ type: 'paragraph' }],
  }).run();
}

insertDivider(): void {
  this.editorSvc.editor?.chain().focus().setHorizontalRule().run();
}
```

Also add `taskList` handling to the existing `setBlock()` method:

```typescript
setBlock(type: BlockType | 'taskList' | 'codeBlock'): void {
  const e = this.editorSvc.editor;
  if (!e) return;
  switch (type) {
    case 'paragraph':   e.chain().focus().setParagraph().run();              break;
    case 'heading1':    e.chain().focus().toggleHeading({ level: 1 }).run(); break;
    case 'heading2':    e.chain().focus().toggleHeading({ level: 2 }).run(); break;
    case 'heading3':    e.chain().focus().toggleHeading({ level: 3 }).run(); break;
    case 'bulletList':  e.chain().focus().toggleBulletList().run();          break;
    case 'orderedList': e.chain().focus().toggleOrderedList().run();         break;
    case 'taskList':    e.chain().focus().toggleTaskList().run();            break;
    case 'blockquote':  e.chain().focus().toggleBlockquote().run();          break;
    case 'codeBlock':   e.chain().focus().toggleCodeBlock().run();           break;
  }
  this.cdr.markForCheck();
}
```

---

### B5 — Color Extension in Highlight Toolbar

In `highlight-toolbar.component.ts`, ensure the color palette includes a **"Reset color"** button and a professional set of colors:

```typescript
// Color palette — professional, readable on dark background
readonly colorPalette = [
  { hex: null,       label: 'Default',  swatch: 'rgba(255,255,255,0.88)' },  // reset
  { hex: '#ffffff',  label: 'White',    swatch: '#ffffff' },
  { hex: '#c9a84c',  label: 'Gold',     swatch: '#c9a84c' },
  { hex: '#e8c96a',  label: 'Amber',    swatch: '#e8c96a' },
  { hex: '#5aad88',  label: 'Green',    swatch: '#5aad88' },
  { hex: '#60a5fa',  label: 'Blue',     swatch: '#60a5fa' },
  { hex: '#a78bfa',  label: 'Purple',   swatch: '#a78bfa' },
  { hex: '#f87171',  label: 'Red',      swatch: '#f87171' },
  { hex: '#fb923c',  label: 'Orange',   swatch: '#fb923c' },
  { hex: '#94a3b8',  label: 'Muted',    swatch: '#94a3b8' },
];

// Apply or reset color
applyColor(hex: string | null): void {
  const e = this.editorService.editor;
  if (!e) return;
  if (hex === null) {
    e.chain().focus().unsetColor().run();  // reset to default
  } else {
    e.chain().focus().setColor(hex).run();
  }
}
```

```html
<!-- Color row in highlight toolbar template -->
<div class="km-hl-colors">
  @for (c of colorPalette; track c.label) {
    <button class="km-hl-color-dot"
            [style.background]="c.swatch"
            [title]="c.label"
            [class.selected]="currentColor() === c.hex"
            (click)="applyColor(c.hex)">
      @if (c.hex === null) {
        <!-- Reset icon -->
        <svg viewBox="0 0 10 10" width="10" height="10">
          <line x1="2" y1="2" x2="8" y2="8" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
          <line x1="8" y1="2" x2="2" y2="8" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
        </svg>
      }
    </button>
  }
</div>
```

---

## PART C — Issue-by-Issue Fix Checklist

```
══════════════════════════════════════════════════════
PRIORITY 1 — Move styles to global (fixes all :global() unreliability)
══════════════════════════════════════════════════════
[ ] Create apps/app-k-maps/src/app/features/docs/doc-editor/_editor.scss
    → Full content from Part B Section 1
[ ] Add @use import at end of global.scss
[ ] Delete all :global(.ProseMirror ...) rules from doc-editor.page.ts styles
[ ] Keep only component-scoped rules in styles (title input, save label, panel)

══════════════════════════════════════════════════════
PRIORITY 2 — Fix H1 gradient + Color extension on headings
══════════════════════════════════════════════════════
[ ] Remove -webkit-text-fill-color: transparent from H1
[ ] Remove background-clip: text from H1
[ ] Set H1 color: rgba(255,255,255,0.97) — solid white, no gradient
[ ] Add universal fix: span[style*="color"] { -webkit-text-fill-color: currentColor !important }
    → This makes Color extension work on ALL elements including headings

══════════════════════════════════════════════════════
PRIORITY 3 — Fix blockquote font (was showing monospace)
══════════════════════════════════════════════════════
[ ] Add font-family: var(--ion-font-family) !important to blockquote
[ ] Add font-family: inherit !important to blockquote p
[ ] Once styles move to _editor.scss this will apply reliably

══════════════════════════════════════════════════════
PRIORITY 4 — Callout improvements
══════════════════════════════════════════════════════
[ ] Add callout placeholder CSS (empty state shows "Write a note…")
[ ] Add font-family: var(--ion-font-family) !important to .km-callout__content
[ ] Add font-family: inherit !important to .km-callout__content p
[ ] Ensure Color extension works inside callout (span[style*="color"] override)

══════════════════════════════════════════════════════
PRIORITY 5 — Bottom toolbar additions
══════════════════════════════════════════════════════
[ ] Add Divider button (—) → calls insertDivider()
[ ] Add Callout button (💡) → calls insertCallout()
[ ] Add Task list button (☑) → calls setBlock('taskList')
[ ] Add Code Block button ({ }) → calls setBlock('codeBlock')
[ ] Add insertCallout() method to DocEditorPage
[ ] Add insertDivider() method to DocEditorPage
[ ] Update setBlock() to handle 'taskList' and 'codeBlock'

══════════════════════════════════════════════════════
PRIORITY 6 — Color picker in highlight toolbar
══════════════════════════════════════════════════════
[ ] Replace any ad-hoc color swatches with the professional palette
[ ] Add "Default / Reset" swatch (null → unsetColor())
[ ] Palette: Default, White, Gold, Amber, Green, Blue, Purple, Red, Orange, Muted
[ ] Show current active color with border highlight on selected swatch

══════════════════════════════════════════════════════
PRIORITY 7 — Divider visual polish
══════════════════════════════════════════════════════
[ ] Ensure .km-doc-editor-el .ProseMirror hr ::after has same background
    color as page background (rgba fill won't work — must match bg exactly)
[ ] Add cursor: default to hr so clicking doesn't show text cursor
[ ] Verify diamond ornament appears at 50% width on mobile screen widths

══════════════════════════════════════════════════════
VERIFY AFTER ALL CHANGES
══════════════════════════════════════════════════════
[ ] H1 appears white (not blue gradient)
[ ] Apply blue color via toolbar → H1 text turns blue ✓
[ ] Apply purple color via toolbar → H2 text turns purple ✓
[ ] Clear/reset color → heading returns to white ✓
[ ] Blockquote shows: gold left border + Poppins font (not monospace) ✓
[ ] Callout empty → shows "Write a note…" placeholder ✓
[ ] Callout with text → text shows in Poppins, correct color ✓
[ ] Color applied inside callout → shows correctly ✓
[ ] Divider button in footer → inserts diamond HR ✓
[ ] Callout button in footer → inserts tip callout ✓
[ ] Task list button → inserts checkbox list ✓
[ ] Arabic text in paragraph → auto-detects RTL, shows AmiriQuran font ✓
[ ] Quran embed → renders beautifully (already works, keep it) ✓
[ ] No requestAnimationFrame violations in Safari/Chrome perf tab ✓
```

---

## PART D — Typography Reference (Final Numbers)

| Element | Size | Weight | Color | Notes |
|---|---|---|---|---|
| H1 | `1.92rem` | 800 | `rgba(255,255,255,0.97)` | No gradient. Color ext works. |
| H2 | `1.38rem` | 700 | `rgba(255,255,255,0.92)` | Subtle bottom border |
| H3 | `1.14rem` | 600 | `rgba(255,255,255,0.76)` | Slightly muted |
| H4 | `0.76rem` | 700 | `rgba(201,168,76,0.82)` | Gold, all-caps label |
| Body | `1.02rem` | 400 | `rgba(255,255,255,0.88)` | 1.82 line-height |
| Blockquote | `1.02rem` | 400 | `rgba(255,255,255,0.82)` | Gold left border, Poppins |
| Code inline | `0.86em` | 400 | `#e8a87c` | Warm orange on dark |
| Code block | `0.84rem` | 400 | `rgba(255,255,255,0.88)` | Dark bg, gold shimmer top |
| Callout body | `0.975rem` | 400 | `rgba(255,255,255,0.88)` | User color overrides apply |

---

## PART E — What Is Already Working (Don't Touch)

- ✅ Quran verse embed (beautiful — exactly right)
- ✅ Ayah copy button  
- ✅ Auto-direction RTL detection for Arabic paragraphs
- ✅ Block handle (⠿ drag handle on long press)
- ✅ Slash command menu (/ commands)
- ✅ Callout picker (tap emoji → change type/emoji)
- ✅ Nested bullet/ordered lists
- ✅ Diamond divider ornament design
- ✅ Word count (via queueMicrotask fix)
- ✅ Tab/Shift-Tab indent for lists
- ✅ All domain blocks (Claim, Evidence, Vocab, Morphology, etc.)
