import { Component, OnInit, OnDestroy, ElementRef, ViewChild,
         inject, ChangeDetectionStrategy } from '@angular/core';
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

  titleModel = '';
  private mutationObserver: MutationObserver | null = null;

  ngOnInit(): void {
    this.editorSvc.saveFn = () => this.saveSvc.scheduleSave();

    const docId = this.route.snapshot.paramMap.get('docId');
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
        // Animate blocks in after content settles, then watch for new ones
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

    // Handle "New Page" from slash menu via custom event
    this.editorEl.nativeElement.addEventListener('km:create-page', ((e: CustomEvent) => {
      this.editorSvc.createPageBlock(e.detail.pos);
    }) as EventListener);
  }

  private watchForNewBlocks(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm || this.mutationObserver) return;

    const animatedSet = new WeakSet<Element>();

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (animatedSet.has(node)) return;
          animatedSet.add(node);

          const isHr = node.tagName === 'HR';
          if (isHr) {
            gsap.fromTo(node,
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }
            );
          } else {
            gsap.fromTo(node,
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' }
            );
          }
        });
      }
    });

    this.mutationObserver.observe(pm, { childList: true });
  }

  private animateContentIn(): void {
    const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
    if (!pm) return;
    const blocks = Array.from(pm.children) as HTMLElement[];
    if (!blocks.length) return;

    gsap.fromTo(blocks,
      { opacity: 0, y: 14 },
      {
        opacity: 1, y: 0,
        duration: 0.45,
        stagger: 0.045,
        ease: 'power3.out',
        clearProps: 'transform',
      }
    );

    // Dividers get a special width-expand treatment
    const hrs = pm.querySelectorAll('hr');
    if (hrs.length) {
      gsap.fromTo(hrs,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' }
      );
    }
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
