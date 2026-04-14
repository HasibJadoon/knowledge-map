import { Component, OnInit, OnDestroy, ElementRef, ViewChild,
         inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DocEditorService } from '../services/doc-editor.service';
import { DocSaveService } from '../services/doc-save.service';
import { DocRightPanelComponent } from '../doc-right-panel/doc-right-panel.component';
import { HighlightToolbarComponent } from './highlight-toolbar/highlight-toolbar.component';
import gsap from 'gsap';

@Component({
  selector: 'km-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DocRightPanelComponent, HighlightToolbarComponent],
  templateUrl: './doc-editor.component.html',
  styleUrl: './doc-editor.component.scss'
})
export class DocEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  readonly editorSvc = inject(DocEditorService);
  private saveSvc    = inject(DocSaveService);
  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);
  private cdr        = inject(ChangeDetectorRef);

  titleModel = '';
  private mutationObserver: MutationObserver | null = null;

  ngOnInit(): void {
    this.editorSvc.saveFn = () => this.saveSvc.scheduleSave();

    // Handle "New Page" from slash menu via custom event
    this.editorEl.nativeElement.addEventListener('km:create-page', ((e: CustomEvent) => {
      this.editorSvc.createPageBlock(e.detail.pos);
    }) as EventListener);

    // Subscribe to paramMap so switching docs reloads everything
    this.route.paramMap.subscribe(params => {
      const docId = params.get('docId');

      // Tear down previous editor instance
      this.mutationObserver?.disconnect();
      this.mutationObserver = null;
      this.editorSvc.destroyEditor();

      if (docId) {
        this.editorSvc.docId.set(docId);
        this.http.get<Record<string, unknown>>(`/api/docs/${docId}`).subscribe(doc => {
          const title = doc['title'] as string ?? 'Untitled';
          this.editorSvc.title.set(title);
          this.titleModel = title;
          this.editorSvc.initEditor(this.editorEl.nativeElement);
          try {
            const json = typeof doc['document_json'] === 'string'
              ? JSON.parse(doc['document_json'] as string)
              : doc['document_json'];
            this.editorSvc.editor?.commands.setContent(json);
          } catch { /* empty doc */ }
          this.cdr.markForCheck();
          requestAnimationFrame(() => {
            this.animateContentIn();
            this.watchForNewBlocks();
          });
        });
      } else {
        this.editorSvc.initEditor(this.editorEl.nativeElement);
        requestAnimationFrame(() => {
          this.animateContentIn();
          this.watchForNewBlocks();
        });
      }
    });
  }

  private watchForNewBlocks(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm || this.mutationObserver) return;

    const animatedSet = new WeakSet<Element>();

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          // Only animate explicitly inserted blocks (HR = divider slash command)
          // Skip paragraph/text re-renders from typing
          if (node.tagName === 'HR') {
            if (animatedSet.has(node)) return;
            animatedSet.add(node);
            gsap.fromTo(node,
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' }
            );
          }
          // Skip all other nodes to avoid per-keystroke GSAP overhead
        });
      }
    });

    this.mutationObserver.observe(pm, { childList: true });
  }

  private animateContentIn(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm) return;
    // Only animate first 20 blocks — beyond that the page is below the fold
    const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 20);
    if (blocks.length <= 1) return; // skip if empty/single placeholder

    requestAnimationFrame(() => {
      gsap.fromTo(blocks,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    });
  }

  ngOnDestroy(): void {
    this.editorSvc.saveFn = null;
    this.mutationObserver?.disconnect();
    this.editorSvc.destroyEditor();
  }

  onTitleChange(val: string): void {
    this.editorSvc.title.set(val);
    this.editorSvc.isDirty.set(true);
    this.saveSvc.scheduleSave();
  }
}
