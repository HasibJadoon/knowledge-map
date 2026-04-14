import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild,
  inject, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { DocEditorService } from '../services/doc-editor.service';
import { DocSaveService }   from '../services/doc-save.service';
import { DocRightPanelComponent } from '../doc-right-panel/doc-right-panel.component';
import { HighlightToolbarComponent } from './highlight-toolbar/highlight-toolbar.component';
import { environment } from '../../../../environments/environment';

// ── Block types the bottom toolbar can set ───────────────────────────────────
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock';

@Component({
  selector: 'app-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, HighlightToolbarComponent, DocRightPanelComponent],
  template: `
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/docs" text="Docs"></ion-back-button>
        </ion-buttons>

        <ion-title>
          <input class="km-doc-title-input"
                 [(ngModel)]="titleModel"
                 (ngModelChange)="onTitleChange($event)"
                 placeholder="Untitled" />
        </ion-title>

        <ion-buttons slot="end">
          <span class="km-save-label">
            {{ editorSvc.isSaving() ? 'Saving…' : editorSvc.isDirty() ? '●' : '' }}
          </span>
          <ion-button fill="clear" (click)="openPanel()">
            <ion-icon slot="icon-only" name="information-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- ── Editor canvas ──────────────────────────────────────────────────── -->
    <ion-content class="km-doc-content">
      <div #editorEl class="km-doc-editor-el"></div>
    </ion-content>

    @if (panelOpen()) {
      <div class="km-doc-panel-backdrop" (click)="closePanel()"></div>
      <aside class="km-doc-panel" (click)="$event.stopPropagation()">
        <km-doc-right-panel (closeRequested)="closePanel()"></km-doc-right-panel>
      </aside>
    }

    <!-- ── Floating selection bubble (always mounted, positions itself) ─── -->
    <km-highlight-toolbar></km-highlight-toolbar>

    <!-- ── Bottom formatting toolbar ─────────────────────────────────────── -->
    <ion-footer class="km-doc-footer" [class.km-doc-footer--visible]="toolbarVisible()">
      <ion-toolbar class="km-fmt-bar">
        <div class="km-fmt-scroll">

          <!-- Block type -->
          <button class="km-fmt-btn" title="Text" (click)="setBlock('paragraph')">¶</button>
          <button class="km-fmt-btn" title="H1" (click)="setBlock('heading1')">H₁</button>
          <button class="km-fmt-btn" title="H2" (click)="setBlock('heading2')">H₂</button>
          <button class="km-fmt-btn" title="H3" (click)="setBlock('heading3')">H₃</button>

          <div class="km-fmt-sep"></div>

          <!-- Inline marks -->
          <button class="km-fmt-btn km-fmt-btn--bold"
                  [class.km-fmt-btn--active]="isBold()" (click)="cmd('bold')"><b>B</b></button>
          <button class="km-fmt-btn km-fmt-btn--italic"
                  [class.km-fmt-btn--active]="isItalic()" (click)="cmd('italic')"><i>I</i></button>
          <button class="km-fmt-btn"
                  [class.km-fmt-btn--active]="isUnderline()" (click)="cmd('underline')"><u>U</u></button>
          <button class="km-fmt-btn"
                  [class.km-fmt-btn--active]="isStrike()" (click)="cmd('strike')"><s>S</s></button>
          <button class="km-fmt-btn"
                  [class.km-fmt-btn--active]="isCode()" (click)="cmd('code')">&lt;/&gt;</button>

          <div class="km-fmt-sep"></div>

          <!-- Lists -->
          <button class="km-fmt-btn" title="Bullet list" (click)="setBlock('bulletList')">•≡</button>
          <button class="km-fmt-btn" title="Numbered list" (click)="setBlock('orderedList')">1≡</button>

          <div class="km-fmt-sep"></div>

          <!-- Blockquote -->
          <button class="km-fmt-btn" title="Blockquote" (click)="setBlock('blockquote')">❝</button>

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
          <button class="km-fmt-btn" title="Indent" (click)="indent()">⇥</button>

        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    /* ── Header ──────────────────────────────────────────────────────── */
    .km-doc-title-input {
      background: transparent;
      border: none;
      outline: none;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-text-color, #fff);
      width: 100%;
      font-family: var(--km-font-body, 'Poppins', sans-serif);
      &::placeholder { color: rgba(255,255,255,0.3); }
    }

    .km-save-label {
      font-size: 0.72rem;
      color: rgba(201,168,76,0.7);
      padding-right: 4px;
    }

    /* ── Editor canvas ───────────────────────────────────────────────── */
    .km-doc-content {
      --background: var(--app-page-background, #080808);
    }

    .km-doc-editor-el {
      position: relative;

      /* 56px left = 20px outer + 36px for the + ⠿ handle to sit in */
      padding: 24px 20px 120px 54px;

      /* ── Kill Ionic's primary-color focus ring on contenteditable ─── */
      --highlight-color-focused: transparent;
      --highlight-color-invalid: transparent;

      /* ── ProseMirror core ─────────────────────────────────────────── */
      :global(.ProseMirror) {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
        min-height: 60vh;
        font-size: 1.02rem;
        line-height: 1.82;
        color: rgba(255,255,255,0.88);
        font-family: var(--km-font-body, 'Poppins', sans-serif);
        caret-color: #c9a84c;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        /* iOS: required for text selection & keyboard to work in contenteditable */
        -webkit-user-select: text;
        user-select: text;
      }

      /* Gold selection tint throughout the editor */
      :global(.ProseMirror *::selection) {
        background: rgba(201,168,76,0.25);
      }

      /* ── Per-block active highlight (set by MobileBlockHandle) ─── */
      :global(.ProseMirror > .km-block-active),
      :global(.ProseMirror li.km-block-active) {
        background: rgba(255,255,255,0.028);
        border-radius: 6px;
        outline: 1px solid rgba(255,255,255,0.07);
        outline-offset: 1px;
      }

      :global(.ProseMirror p.is-editor-empty:first-child::before) {
        content: attr(data-placeholder);
        color: rgba(255,255,255,0.25);
        pointer-events: none;
        float: left;
        height: 0;
        font-style: italic;
      }

      :global(.ProseMirror p) { margin: 0.15em 0 0.72em; }

      /* ── H1 — Page title, max visual weight ─────────────────────── */
      :global(.ProseMirror h1) {
        font-size: 1.92rem;
        font-weight: 800;
        line-height: 1.18;
        margin: 1.6em 0 0.45em;
        letter-spacing: -0.03em;
        /* solid fallback first — if gradient-clip unsupported, shows white */
        color: rgba(255,255,255,0.96);
        background: linear-gradient(115deg, #ffffff 38%, rgba(201,168,76,0.9) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* ── H2 — Section header, clear separator ────────────────────── */
      :global(.ProseMirror h2) {
        font-size: 1.38rem;
        font-weight: 700;
        line-height: 1.28;
        margin: 1.55em 0 0.45em;
        letter-spacing: -0.018em;
        color: rgba(255,255,255,0.9);
        padding-bottom: 0.38em;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      /* ── H3 — Sub-section, lighter weight ───────────────────────── */
      :global(.ProseMirror h3) {
        font-size: 1.14rem;
        font-weight: 600;
        line-height: 1.38;
        margin: 1.3em 0 0.3em;
        letter-spacing: -0.01em;
        color: rgba(255,255,255,0.76);
      }

      /* ── H4 — Label / caption, all-caps gold ────────────────────── */
      :global(.ProseMirror h4) {
        font-size: 0.76rem;
        font-weight: 700;
        margin: 1.1em 0 0.25em;
        color: rgba(201,168,76,0.8);
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      :global(.ProseMirror blockquote) {
        border-left: 4px solid rgba(201,168,76,0.82);
        padding: 0.7em 1.1em 0.7em 1.25em; margin: 1em 0;
        color: rgba(255,255,255,0.85);
        background: rgba(201,168,76,0.05);
        border-radius: 0 8px 8px 0;
      }
      :global(.ProseMirror blockquote p) { margin: 0; }

      :global(.ProseMirror pre) {
        background: rgba(0,0,0,0.38);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px; padding: 1em 1.15em; margin: 0.75em 0;
        font-size: 0.84rem; line-height: 1.7; overflow-x: auto;
        position: relative;
      }
      :global(.ProseMirror pre::before) {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(201,168,76,0.22), transparent);
        border-radius: 10px 10px 0 0;
      }
      :global(.ProseMirror code) {
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.09);
        border-radius: 4px; padding: 0.12em 0.4em; font-size: 0.86em;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }
      :global(.ProseMirror pre code) { background: none; border: none; padding: 0; font-size: inherit; }

      :global(.ProseMirror ul), :global(.ProseMirror ol) {
        padding-left: 1.55em;
        margin: 0.4em 0 0.6em;
      }
      :global(.ProseMirror ul) { list-style-type: disc !important; }
      :global(.ProseMirror ol) { list-style-type: decimal !important; }
      :global(.ProseMirror li) { margin: 0.28em 0; line-height: 1.78; }
      :global(.ProseMirror li > p),
      :global(.ProseMirror li p) { margin: 0; }
      :global(.ProseMirror li > ul),
      :global(.ProseMirror li > ol) { margin: 0.2em 0 0.1em; }
      :global(.ProseMirror ul li::marker) { color: rgba(201,168,76,0.7); font-size: 0.82em; }
      :global(.ProseMirror ol li::marker) { color: rgba(201,168,76,0.65); font-weight: 700; }
      :global(.ProseMirror ul ul) { list-style-type: circle !important; }
      :global(.ProseMirror ul ul ul) { list-style-type: square !important; }
      :global(.ProseMirror ul ul li::marker) { color: rgba(201,168,76,0.45); }
      :global(.ProseMirror ul ul ul li::marker) { color: rgba(201,168,76,0.28); }

      :global(.ProseMirror hr) {
        display: block;
        width: 100%;
        border: none;
        margin: 2em 0;
        height: 20px;
        position: relative;
        overflow: visible;
        /*
         * Two-segment gradient with a ~14px gap at center — the gap is where
         * the diamond sits, so the diamond needs no background fill and works
         * on any background color.
         */
        background:
          linear-gradient(
            90deg,
            transparent 0%,
            rgba(201,168,76,0.12) 8%,
            rgba(201,168,76,0.62) 42%,
            transparent 48%
          ) center left / 50% 1px no-repeat,
          linear-gradient(
            90deg,
            transparent 52%,
            rgba(201,168,76,0.62) 58%,
            rgba(201,168,76,0.12) 92%,
            transparent 100%
          ) center right / 50% 1px no-repeat;
        &::after {
          content: '';
          display: block;
          position: absolute;
          left: 50%; top: 50%;
          width: 8px; height: 8px;
          transform: translate(-50%, -50%) rotate(45deg);
          border: 1.5px solid rgba(201,168,76,0.72);
          background: transparent;
        }
      }

      :global(.ProseMirror a) {
        color: rgba(201,168,76,0.92);
        text-decoration: underline;
        text-decoration-color: rgba(201,168,76,0.32);
        text-underline-offset: 3px;
        text-decoration-thickness: 1px;
        transition: color 0.12s, text-decoration-color 0.12s;
      }

      :global(.ProseMirror mark) {
        border-radius: 3px;
        padding: 0.06em 0.22em;
        /* color set inline by TipTap highlight extension */
      }
      :global(.ProseMirror strong) {
        font-weight: 700;
        color: rgba(255,255,255,0.96);
      }
      :global(.ProseMirror em) {
        font-style: italic;
        color: rgba(255,255,255,0.84);
      }
      :global(.ProseMirror u) {
        text-decoration-color: rgba(255,255,255,0.4);
        text-underline-offset: 3px;
      }
      :global(.ProseMirror s) {
        text-decoration-color: rgba(255,255,255,0.3);
      }

      /* ── Arabic auto-direction (paragraphs/headings only, not embed blocks) ── */
      :global(.ProseMirror p[dir="rtl"]),
      :global(.ProseMirror h1[dir="rtl"]),
      :global(.ProseMirror h2[dir="rtl"]),
      :global(.ProseMirror h3[dir="rtl"]),
      :global(.ProseMirror li[dir="rtl"]),
      :global(.ProseMirror blockquote[dir="rtl"]) {
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif) !important;
        font-size: 1.25rem;
        line-height: 2.1;
        letter-spacing: 0;
        word-spacing: 0.04em;
        text-align: right;
      }

      /* ── Ayah embed — tighter on mobile ─────────────────────────────── */
      :global(.ProseMirror .km-block--ayah .ayah-text) {
        font-family: var(--km-font-arabic, 'Uthmanic Hafs', serif) !important;
        font-size: 1.25rem !important;
        line-height: 1.95 !important;
        text-align: right;
      }

      /* ── Block selected ─────────────────────────────────────────────── */
      :global(.ProseMirror-selectednode) {
        outline: 2px solid rgba(201,168,76,0.4) !important;
        border-radius: 4px;
      }

      /* ── Ayah embed ──────────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--ayah) {
        position: relative;
        direction: rtl;
        background: rgba(201,168,76,0.04);
        border-right: 3px solid rgba(201,168,76,0.72);
        border-radius: 10px;
        padding: 14px 18px 12px;
        margin: 10px 0;
        user-select: text;
        -webkit-user-select: text;
      }
      :global(.ProseMirror .km-block--ayah .ayah-text) {
        font-family: var(--km-font-arabic, 'Uthmanic Hafs', serif) !important;
        font-size: 1.3rem !important;
        line-height: 2.1 !important;
        color: rgba(255,255,255,0.92);
        text-align: right;
        direction: rtl;
      }
      :global(.ProseMirror .km-block--ayah .ayah-translation) {
        direction: ltr;
        font-size: 0.84rem;
        color: rgba(255,255,255,0.5);
        margin-top: 8px;
        font-style: italic;
        line-height: 1.6;
        text-align: left;
      }
      :global(.ProseMirror .km-block--ayah .ayah-ref) {
        direction: ltr;
        font-size: 0.7rem;
        color: rgba(201,168,76,0.72);
        margin-top: 5px;
        font-weight: 600;
        text-align: left;
      }
      :global(.ProseMirror .km-ayah-copy) {
        position: absolute;
        top: 10px; left: 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        padding: 5px 7px;
        cursor: pointer;
        color: rgba(255,255,255,0.38);
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      :global(.ProseMirror .km-ayah-copy:active),
      :global(.ProseMirror .km-ayah-copy--done) {
        color: rgba(201,168,76,0.9);
        border-color: rgba(201,168,76,0.35);
        background: rgba(201,168,76,0.08);
      }

      /* ── Shared block base ───────────────────────────────────────────── */
      :global(.ProseMirror .km-block) {
        margin: 6px 0;
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        font-size: 0.92rem;
        line-height: 1.65;
        color: rgba(255,255,255,0.82);
      }

      /* ── Claim block ─────────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--claim) {
        background: rgba(255,183,77,0.06);
        border: 1px solid rgba(255,183,77,0.18);
        padding: 12px 14px;
      }
      :global(.ProseMirror .kb-claim-header) {
        margin-bottom: 6px;
      }
      :global(.ProseMirror .kb-claim-badge) {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 4px;
      }
      :global(.ProseMirror .kb-claim-text) {
        font-size: 0.92rem;
        line-height: 1.65;
        color: rgba(255,255,255,0.85);
      }

      /* ── Evidence block ──────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--evidence) {
        background: rgba(255,255,255,0.03);
        border-left: 3px solid rgba(201,168,76,0.5);
        padding: 10px 14px 10px 16px;
      }
      :global(.ProseMirror .kb-evidence-quote) {
        font-size: 0.92rem;
        font-style: italic;
        color: rgba(255,255,255,0.8);
        line-height: 1.65;
        margin-bottom: 5px;
      }
      :global(.ProseMirror .kb-evidence-meta) {
        font-size: 0.72rem;
        color: rgba(201,168,76,0.6);
        letter-spacing: 0.03em;
      }

      /* ── Reflection block ────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--reflection) {
        background: rgba(100,120,255,0.05);
        border: 1px solid rgba(100,120,255,0.18);
        padding: 12px 14px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }
      :global(.ProseMirror .kb-reflection-icon) {
        font-size: 1.1rem;
        flex-shrink: 0;
        margin-top: 1px;
      }
      :global(.ProseMirror .kb-reflection-content) {
        flex: 1;
        font-size: 0.92rem;
        line-height: 1.65;
        color: rgba(255,255,255,0.82);
      }

      /* ── Task block ──────────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--task) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      :global(.ProseMirror .kb-task-check) {
        font-size: 1.1rem;
        flex-shrink: 0;
        color: rgba(201,168,76,0.7);
      }
      :global(.ProseMirror .kb-task-title) {
        flex: 1;
        font-size: 0.92rem;
        color: rgba(255,255,255,0.85);
      }
      :global(.ProseMirror .kb-task-meta) {
        font-size: 0.72rem;
        color: rgba(255,255,255,0.38);
        flex-shrink: 0;
      }

      /* ── Scene block ─────────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--scene) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 11px 14px;
      }
      :global(.ProseMirror .kb-scene-header) {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      :global(.ProseMirror .kb-scene-icon) { font-size: 1rem; }
      :global(.ProseMirror .kb-scene-title) {
        flex: 1;
        font-size: 0.92rem;
        font-weight: 600;
        color: rgba(255,255,255,0.88);
      }
      :global(.ProseMirror .kb-scene-dur) {
        font-size: 0.72rem;
        color: rgba(201,168,76,0.6);
        background: rgba(201,168,76,0.08);
        padding: 2px 6px;
        border-radius: 4px;
      }
      :global(.ProseMirror .kb-scene-notes) {
        font-size: 0.82rem;
        color: rgba(255,255,255,0.48);
        line-height: 1.5;
        padding-left: 24px;
      }

      /* ── Timeline block ──────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--timeline) {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 8px 14px;
        background: transparent;
      }
      :global(.ProseMirror .kb-timeline-dot) {
        width: 9px; height: 9px;
        border-radius: 50%;
        background: rgba(201,168,76,0.72);
        flex-shrink: 0;
        margin-top: 5px;
        box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
      }
      :global(.ProseMirror .kb-timeline-body) {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      :global(.ProseMirror .kb-timeline-label) {
        font-size: 0.92rem;
        font-weight: 600;
        color: rgba(255,255,255,0.85);
      }
      :global(.ProseMirror .kb-timeline-date) {
        font-size: 0.72rem;
        color: rgba(201,168,76,0.6);
      }
      :global(.ProseMirror .kb-timeline-note) {
        font-size: 0.82rem;
        color: rgba(255,255,255,0.48);
        line-height: 1.5;
      }

      /* ── Comprehension block ─────────────────────────────────────────── */
      :global(.ProseMirror .km-block--comprehension) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 12px 14px;
      }
      :global(.ProseMirror .kb-comp-q) {
        font-size: 0.92rem;
        color: rgba(255,255,255,0.85);
        margin-bottom: 6px;
      }
      :global(.ProseMirror .kb-comp-a) {
        font-size: 0.88rem;
        color: rgba(255,255,255,0.65);
        line-height: 1.6;
        transition: filter 0.25s;
      }

      /* ── Children / simplified block ─────────────────────────────────── */
      :global(.ProseMirror .km-block--children) {
        background: rgba(129,199,132,0.05);
        border: 1px solid rgba(129,199,132,0.2);
        padding: 11px 14px;
      }
      :global(.ProseMirror .kb-children-header) {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: rgba(129,199,132,0.75);
        margin-bottom: 6px;
      }
      :global(.ProseMirror .kb-children-content) {
        font-size: 0.92rem;
        line-height: 1.65;
        color: rgba(255,255,255,0.8);
      }

      /* ── Passage embed ───────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--passage) {
        background: rgba(201,168,76,0.04);
        border: 1px solid rgba(201,168,76,0.16);
        padding: 10px 14px;
      }
      :global(.ProseMirror .kb-passage-ref) {
        font-size: 0.85rem;
        color: rgba(201,168,76,0.78);
        font-weight: 600;
        letter-spacing: 0.04em;
      }

      /* ── Vocab block ─────────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--vocab) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 12px 14px;
      }
      :global(.ProseMirror .kb-vocab-word) {
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif);
        font-size: 1.5rem;
        line-height: 1.8;
        color: rgba(255,255,255,0.92);
        text-align: right;
        margin-bottom: 4px;
      }
      :global(.ProseMirror .kb-vocab-root) {
        font-size: 0.72rem;
        color: rgba(201,168,76,0.65);
        letter-spacing: 0.04em;
        margin-bottom: 3px;
      }
      :global(.ProseMirror .kb-vocab-meanings) {
        font-size: 0.85rem;
        color: rgba(255,255,255,0.65);
      }

      /* ── Morphology block ────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--morphology) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 12px 14px;
      }
      :global(.ProseMirror .kb-morph-word) {
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif);
        font-size: 1.4rem;
        line-height: 1.8;
        color: rgba(255,255,255,0.9);
        text-align: right;
        margin-bottom: 8px;
      }
      :global(.ProseMirror .kb-morph-grid) {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      :global(.ProseMirror .kb-morph-cell) {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 0.78rem;
        color: rgba(255,255,255,0.75);
      }
      :global(.ProseMirror .kb-morph-cell label) {
        font-size: 0.62rem;
        color: rgba(201,168,76,0.55);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 700;
      }

      /* ── Nahw block ──────────────────────────────────────────────────── */
      :global(.ProseMirror .km-block--nahw) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 12px 14px;
      }
      :global(.ProseMirror .kb-nahw-sentence) {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
        direction: rtl;
      }
      :global(.ProseMirror .kb-nahw-word) {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 4px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.03);
      }
      :global(.ProseMirror .kb-nahw-term) {
        font-size: 0.6rem;
        color: rgba(201,168,76,0.62);
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif);
        line-height: 1;
      }

      /* ── Root analysis block ─────────────────────────────────────────── */
      :global(.ProseMirror .km-block--root-analysis) {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        padding: 12px 14px;
      }
      :global(.ProseMirror .kb-root-title) {
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif);
        font-size: 1.3rem;
        color: rgba(201,168,76,0.82);
        text-align: right;
        margin-bottom: 8px;
        line-height: 1.6;
      }
      :global(.ProseMirror .kb-root-grid) {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      :global(.ProseMirror .kb-root-item) {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-size: 0.82rem;
      }
      :global(.ProseMirror .kb-root-word) {
        font-family: var(--km-font-arabic-amiri, 'AmiriQuran', serif);
        font-size: 1rem;
        color: rgba(255,255,255,0.85);
        direction: rtl;
      }
      :global(.ProseMirror .kb-root-meaning) {
        flex: 1;
        color: rgba(255,255,255,0.55);
      }
      :global(.ProseMirror .kb-root-occ) {
        font-size: 0.68rem;
        color: rgba(201,168,76,0.5);
        background: rgba(201,168,76,0.07);
        padding: 1px 5px;
        border-radius: 4px;
      }
    }

    /* ── Bottom formatting bar ────────────────────────────────────────── */
    .km-doc-footer {
      transform: translateY(100%);
      transition: transform 0.24s cubic-bezier(0.32,0.72,0,1);
      &--visible { transform: translateY(0); }
    }

    .km-doc-panel-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10010;
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }

    .km-doc-panel {
      position: fixed;
      inset: auto 0 0;
      height: min(82vh, 720px);
      border-radius: 20px 20px 0 0;
      overflow: hidden;
      background: var(--app-page-background, #080808);
      box-shadow: 0 -16px 48px rgba(0,0,0,0.55);
      border-top: 1px solid rgba(255,255,255,0.08);
      z-index: 10011;
    }

    .km-fmt-bar {
      --background: #141414;
      --border-color: rgba(255,255,255,0.08);
      --border-width: 1px 0 0 0;
    }

    .km-fmt-scroll {
      display: flex;
      align-items: center;
      gap: 1px;
      overflow-x: auto;
      padding: 6px 10px;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .km-fmt-btn {
      flex-shrink: 0;
      min-width: 38px;
      height: 38px;
      padding: 0 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.6);
      border-radius: 8px;
      font-size: 0.9rem;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background 0.12s, color 0.12s;

      &:active, &--active {
        background: rgba(201,168,76,0.14);
        color: #c9a84c;
      }

      &--bold  b  { font-weight: 700; }
      &--italic i { font-style: italic; }

      svg { display: block; }
    }

    .km-fmt-sep {
      width: 1px; height: 20px; flex-shrink: 0;
      background: rgba(255,255,255,0.09); margin: 0 4px;
    }
  `]
})
export class DocEditorPage implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  readonly editorSvc = inject(DocEditorService);
  private saveSvc    = inject(DocSaveService);
  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);
  private ngZone     = inject(NgZone);

  titleModel = '';
  toolbarVisible = signal(false);
  panelOpen = signal(false);

  private mutationObserver: MutationObserver | null = null;
  private readonly API = `${environment.apiBase}/docs`;

  // ── Computed editor state ───────────────────────────────────────────────
  isBold()      { return this.editorSvc.editor?.isActive('bold')      ?? false; }
  isItalic()    { return this.editorSvc.editor?.isActive('italic')    ?? false; }
  isUnderline() { return this.editorSvc.editor?.isActive('underline') ?? false; }
  isStrike()    { return this.editorSvc.editor?.isActive('strike')    ?? false; }
  isCode()      { return this.editorSvc.editor?.isActive('code')      ?? false; }

  ngOnInit(): void {
    this.editorSvc.saveFn = () => this.saveSvc.scheduleSave();

    // Handle slash command "New Page"
    this.editorEl.nativeElement.addEventListener('km:create-page', ((e: CustomEvent) => {
      this.editorSvc.createPageBlock(e.detail.pos);
    }) as EventListener);

    // Show toolbar when editor is focused
    this.editorEl.nativeElement.addEventListener('focusin', () => {
      this.toolbarVisible.set(true);
      this.cdr.markForCheck();
    });
    this.editorEl.nativeElement.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!this.editorEl.nativeElement.contains(document.activeElement)) {
          this.toolbarVisible.set(false);
          this.cdr.markForCheck();
        }
      }, 150);
    });

    this.route.paramMap.subscribe(params => {
      const docId = params.get('docId');

      this.mutationObserver?.disconnect();
      this.mutationObserver = null;
      this.editorSvc.destroyEditor();

      if (docId) {
        this.editorSvc.docId.set(docId);
        this.http.get<Record<string, unknown>>(`${this.API}/${docId}`).subscribe(doc => {
          const title = (doc['title'] as string) ?? 'Untitled';
          this.editorSvc.title.set(title);
          this.titleModel = title;

          /*
           * Run editor init + setContent OUTSIDE Angular zone.
           * HttpClient subscribes inside zone by default — every TipTap
           * transaction fired by setContent would otherwise trigger a full
           * Angular change-detection cycle, locking the main thread for
           * hundreds of ms per node (15+ nodes = seconds of freeze).
           */
          this.ngZone.runOutsideAngular(() => {
            this.editorSvc.initEditor(this.editorEl.nativeElement);

            // Suppress onUpdate dirty/save during initial content load
            this.editorSvc.isLoadingContent = true;
            try {
              const json = typeof doc['document_json'] === 'string'
                ? JSON.parse(doc['document_json'] as string)
                : doc['document_json'];
              this.editorSvc.editor?.commands.setContent(json as never);
            } catch { /* empty doc */ }
            this.editorSvc.isLoadingContent = false;

            // Sync word count once after load (don't need zone for signal)
            const words = this.editorSvc.editor?.storage['characterCount']?.words() ?? 0;
            this.editorSvc.wordCount.set(words);
          });

          // Re-enter zone for UI update + animations
          this.cdr.markForCheck();
          requestAnimationFrame(() => {
            this.animateContentIn();
            this.watchForNewBlocks();
          });
        });
      } else {
        this.ngZone.runOutsideAngular(() => {
          this.editorSvc.initEditor(this.editorEl.nativeElement);
        });
        requestAnimationFrame(() => this.animateContentIn());
      }
    });
  }

  ngOnDestroy(): void {
    this.editorSvc.saveFn = null;
    this.mutationObserver?.disconnect();
    this.saveSvc.flush();
    this.editorSvc.destroyEditor();
  }

  onTitleChange(val: string): void {
    this.editorSvc.title.set(val);
    this.editorSvc.isDirty.set(true);
    this.saveSvc.scheduleSave();
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  cmd(name: string): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (name) {
      case 'bold':      e.chain().focus().toggleBold().run();      break;
      case 'italic':    e.chain().focus().toggleItalic().run();    break;
      case 'underline': e.chain().focus().toggleUnderline().run(); break;
      case 'strike':    e.chain().focus().toggleStrike().run();    break;
      case 'code':      e.chain().focus().toggleCode().run();      break;
    }
    this.cdr.markForCheck();
  }

  setBlock(type: BlockType): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (type) {
      case 'paragraph':    e.chain().focus().setParagraph().run(); break;
      case 'heading1':     e.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'heading2':     e.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'heading3':     e.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bulletList':   e.chain().focus().toggleBulletList().run(); break;
      case 'orderedList':  e.chain().focus().toggleOrderedList().run(); break;
      case 'blockquote':   e.chain().focus().toggleBlockquote().run(); break;
      case 'codeBlock':    e.chain().focus().toggleCodeBlock().run(); break;
    }
    this.cdr.markForCheck();
  }

  setLink(): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    if (e.isActive('link')) { e.chain().focus().unsetLink().run(); return; }
    const url = prompt('URL:');
    if (url) e.chain().focus().setLink({ href: url }).run();
  }

  indent():  void { this.editorSvc.editor?.chain().focus().sinkListItem('listItem').run(); }
  outdent(): void { this.editorSvc.editor?.chain().focus().liftListItem('listItem').run(); }

  // ── Right panel ────────────────────────────────────────────────────────────
  openPanel(): void {
    this.panelOpen.set(true);
    this.cdr.markForCheck();
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.cdr.markForCheck();
  }

  // ── Animations ────────────────────────────────────────────────────────────
  /**
   * Fade-in blocks using CSS transitions, not GSAP.
   * GSAP's global ticker runs outside Angular zone but still consumes rAF
   * budget for ~0.8 s on a 20-block document.  CSS transitions are handled
   * by the compositor thread and have no JS rAF cost.
   */
  private animateContentIn(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm) return;
    const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 24) as HTMLElement[];
    if (blocks.length <= 1) return;

    // Prime: hide all blocks (synchronous — happens before paint)
    for (const el of blocks) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'none';
    }

    // On next paint: start CSS transitions with staggered delay
    requestAnimationFrame(() => {
      for (let i = 0; i < blocks.length; i++) {
        const delay = i * 20; // 20 ms stagger
        blocks[i].style.transition = `opacity 0.26s ease ${delay}ms, transform 0.26s ease ${delay}ms`;
        blocks[i].style.opacity    = '1';
        blocks[i].style.transform  = 'translateY(0)';
      }
      // Strip inline styles once animation is done so they don't interfere
      const cleanup = blocks.length * 20 + 300;
      setTimeout(() => {
        for (const el of blocks) {
          el.style.opacity    = '';
          el.style.transform  = '';
          el.style.transition = '';
        }
      }, cleanup);
    });
  }

  private watchForNewBlocks(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm || this.mutationObserver) return;

    const animated = new WeakSet<Element>();
    // Pending nodes accumulated across a burst of mutations — animated in one rAF
    const pending: HTMLElement[] = [];
    let rafId: number | null = null;

    const flush = () => {
      rafId = null;
      const batch = pending.splice(0); // drain
      for (const node of batch) {
        if (node.tagName === 'HR') {
          node.style.transform  = 'scaleX(0)';
          node.style.opacity    = '0';
          node.style.transition = 'none';
          requestAnimationFrame(() => {
            node.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease';
            node.style.transform  = 'scaleX(1)';
            node.style.opacity    = '1';
            setTimeout(() => { node.style.transform = ''; node.style.opacity = ''; node.style.transition = ''; }, 450);
          });
        } else {
          node.style.opacity    = '0';
          node.style.transform  = 'translateY(8px)';
          node.style.transition = 'none';
          requestAnimationFrame(() => {
            node.style.transition = 'opacity 0.24s ease, transform 0.24s ease';
            node.style.opacity    = '1';
            node.style.transform  = 'translateY(0)';
            setTimeout(() => { node.style.opacity = ''; node.style.transform = ''; node.style.transition = ''; }, 280);
          });
        }
      }
    };

    this.mutationObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (animated.has(node)) return;
          animated.add(node);
          pending.push(node);
        });
      }
      // Batch all mutations arriving in the same frame into a single rAF
      if (pending.length > 0 && rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    });
    this.mutationObserver.observe(pm, { childList: true });
  }
}
