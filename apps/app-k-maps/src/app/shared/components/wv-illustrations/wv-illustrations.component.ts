import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import {
  WorldviewLibraryApiService,
  WvIllustrationSummary,
} from '../../services/worldview/worldview-library-api.service';

interface IllustrationView {
  id: string;
  title: string;
  caption: string;
  doc: SafeHtml;     // full standalone HTML document, sandboxed in an iframe
  height: number;    // px — auto-measured on load
}

// ─── Worldview source-unit illustrations (mobile) ─────────────────────────────
// Renders the 1..N visual HTML pages attached to a source unit. Each illustration
// is a complete standalone document, so it is isolated in a sandboxed <iframe>
// (no app CSS bleed). Because srcdoc inherits the embedder origin we can measure
// the rendered height on load and size the frame to fit — no inner scrollbars.
@Component({
  selector: 'app-wv-illustrations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (items().length) {
      <section class="wv-illus" aria-label="Visual illustrations">
        <div class="wv-illus__head">Visuals</div>
        @for (it of items(); track it.id) {
          <figure class="wv-illus__card">
            <iframe
              class="wv-illus__frame"
              [srcdoc]="$any(it.doc)"
              sandbox="allow-same-origin"
              loading="lazy"
              referrerpolicy="no-referrer"
              [title]="it.title || 'Illustration'"
              [style.height.px]="it.height"
              (load)="onLoad($event, it.id)"
            ></iframe>
            @if (it.caption) {
              <figcaption class="wv-illus__cap">{{ it.caption }}</figcaption>
            }
          </figure>
        }
      </section>
    }
  `,
  styles: [`
    .wv-illus { margin: 1.5rem 0 0; }
    .wv-illus__head {
      font-size: 11px; letter-spacing: .24em; text-transform: uppercase;
      color: #c9a84c; font-weight: 700; margin-bottom: .6rem;
    }
    .wv-illus__card {
      margin: 0 0 1rem; padding: 0;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 14px; overflow: hidden; background: #0d0d0d;
    }
    .wv-illus__frame { display: block; width: 100%; border: 0; background: transparent; }
    .wv-illus__cap {
      font-size: 12px; font-style: italic; color: rgba(255,255,255,.55);
      padding: .55rem .85rem; border-top: 1px solid rgba(255,255,255,.08);
    }
  `],
})
export class WvIllustrationsComponent {
  private readonly api = inject(WorldviewLibraryApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly items = signal<IllustrationView[]>([]);
  private token = 0;

  /** The source unit whose illustrations to show. */
  @Input() set unitId(value: string | null | undefined) {
    void this.load(value ?? null);
  }

  private async load(id: string | null): Promise<void> {
    const mine = ++this.token;
    if (!id) { this.items.set([]); return; }

    let summaries: WvIllustrationSummary[] = [];
    try {
      summaries = await firstValueFrom(this.api.listUnitIllustrations(id));
    } catch { summaries = []; }
    if (mine !== this.token) return;
    if (!summaries.length) { this.items.set([]); return; }

    // The list endpoint omits html_content; fetch each document for the iframe.
    const details = await Promise.all(
      summaries.map((s) => firstValueFrom(this.api.getIllustration(s.id)).catch(() => null)),
    );
    if (mine !== this.token) return;

    const views: IllustrationView[] = [];
    details.forEach((detail, i) => {
      if (!detail?.html_content) return;
      const s = summaries[i];
      views.push({
        id: s.id,
        title: s.title ?? '',
        caption: s.caption ?? '',
        doc: this.sanitizer.bypassSecurityTrustHtml(detail.html_content),
        height: 480,
      });
    });
    this.items.set(views);
  }

  /** Size the frame to its content once the document has rendered. */
  onLoad(event: Event, id: string): void {
    const frame = event.target as HTMLIFrameElement | null;
    try {
      const doc = frame?.contentDocument;
      const h = doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight || 0;
      if (h > 0) this.setHeight(id, Math.min(h + 8, 4000));
    } catch {
      // Cross-origin (should not happen with srcdoc) — keep the default height.
    }
  }

  private setHeight(id: string, height: number): void {
    this.items.update((list) => list.map((it) => (it.id === id ? { ...it, height } : it)));
  }
}
