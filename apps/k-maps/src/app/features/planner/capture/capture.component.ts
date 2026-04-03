import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import type { CaptureDomain, CaptureItem } from '../models/planner.models';

interface CaptureDocumentSection {
  id: string;
  label: string;
  title: string;
  body: string;
}

interface CaptureFootnote {
  id: string;
  label: string;
  value: string;
  href: string | null;
}

type BottomPanelState = 'visible' | 'contracted' | 'hidden';

@Component({
  selector: 'km-capture',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture.component.html',
  styleUrl: './capture.component.scss',
})
export class CaptureComponent implements OnChanges {
  @Input({ required: true }) items: CaptureItem[] = [];
  @Input() selectedItem: CaptureItem | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';

  @Output() selectedItemChange = new EventEmitter<string>();
  @Output() createRequested = new EventEmitter<void>();

  @ViewChild('detailEl') detailEl?: ElementRef<HTMLElement>;
  @ViewChild('bottomEl') bottomEl?: ElementRef<HTMLElement>;
  @ViewChildren('inboxItem') inboxItems?: QueryList<ElementRef<HTMLElement>>;

  readonly bottomState = signal<BottomPanelState>('visible');
  readonly bottomExpanded = signal(false);

  readonly domainLabels: Record<CaptureDomain, string> = {
    arabic_media: 'Arabic Media',
    arabic_linguistics: 'Arabic Linguistics',
    quranic_concepts: 'Quranic Concepts',
    worldview: 'Worldview',
    english_expression: 'English Expression',
  };

  readonly domainGlyph: Record<CaptureDomain, string> = {
    arabic_media: '◈',
    arabic_linguistics: 'ع',
    quranic_concepts: '◇',
    worldview: '◆',
    english_expression: '✦',
  };

  ngOnChanges(): void {
    if (this.detailEl) {
      gsap.fromTo(
        this.detailEl.nativeElement,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }

  selectItem(id: string): void {
    this.selectedItemChange.emit(id);
    if (this.detailEl) {
      gsap.fromTo(
        this.detailEl.nativeElement,
        { opacity: 0, x: 16 },
        { opacity: 1, x: 0, duration: 0.28, ease: 'power2.out' }
      );
    }
  }

  setBottomState(state: BottomPanelState): void {
    const el = this.bottomEl?.nativeElement;
    if (!el) { this.bottomState.set(state); return; }

    if (state === 'hidden') {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => this.bottomState.set('hidden') });
    } else if (state === 'contracted') {
      this.bottomState.set('contracted');
      gsap.to(el, { height: '3rem', opacity: 1, duration: 0.22, ease: 'power2.out' });
    } else {
      this.bottomState.set('visible');
      const h = this.bottomExpanded() ? '18rem' : '10rem';
      gsap.to(el, { height: h, opacity: 1, duration: 0.28, ease: 'power2.out' });
    }
  }

  remountBottom(): void {
    this.bottomState.set('contracted');
    const el = this.bottomEl?.nativeElement;
    if (el) {
      gsap.fromTo(el, { height: 0, opacity: 0 },
        { height: '3rem', opacity: 1, duration: 0.28, ease: 'back.out(1.4)' });
    }
  }

  toggleBottomExpand(): void {
    this.bottomExpanded.update(v => !v);
    const el = this.bottomEl?.nativeElement;
    if (!el) return;
    gsap.to(el, {
      height: this.bottomExpanded() ? '18rem' : '10rem',
      duration: 0.3, ease: 'power2.inOut',
    });
  }

  summary(item: CaptureItem | null): string {
    if (!item) return 'Select a capture from the inbox to view its content.';
    return item.payload.plan_state?.summary || item.compact_context || item.note || item.quote || 'No summary yet.';
  }

  documentSections(item: CaptureItem | null): CaptureDocumentSection[] {
    if (!item) return [];
    if (item.payload.plan_state?.sections?.length) {
      return item.payload.plan_state.sections.map(s => ({ id: s.id, label: s.title, title: s.title, body: s.body }));
    }
    const raw = this.tryParseJson(item.note || item.quote || '');
    if (!raw) return [];
    const arr = raw['sections'] || raw['content'] || raw['entries'] || [];
    if (Array.isArray(arr)) {
      return arr.map((e: Record<string, string>, i: number) => ({
        id: String(i),
        label: e['label'] || e['title'] || `Section ${i + 1}`,
        title: e['title'] || e['label'] || `Section ${i + 1}`,
        body: e['body'] || e['content'] || e['text'] || JSON.stringify(e),
      }));
    }
    return Object.entries(raw).slice(0, 8).map(([k, v], i) => ({
      id: String(i),
      label: k,
      title: k.replace(/_/g, ' '),
      body: typeof v === 'string' ? v : JSON.stringify(v),
    }));
  }

  footnotes(item: CaptureItem | null): CaptureFootnote[] {
    if (!item) return [];
    return (item.resources || []).map((r, i) => ({
      id: String(i),
      label: `[${i + 1}]`,
      value: r,
      href: r.startsWith('http') ? r : null,
    }));
  }

  formatTime(val: string): string {
    try {
      return new Date(val).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return val; }
  }

  isSelected(id: string): boolean {
    return this.selectedItem?.id === id;
  }

  private tryParseJson(text: string): Record<string, unknown> | null {
    try { return JSON.parse(text); } catch { return null; }
  }
}
