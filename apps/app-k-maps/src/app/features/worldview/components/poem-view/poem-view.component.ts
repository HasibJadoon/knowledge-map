import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface PoemVocab { word: string; root?: string; gloss?: string; form?: string; }

export interface PoemCoupletLayer {
  lang: string;
  label?: string;
  dir?: string;
  script?: string;
  lines?: string[];
  text?: string;
}

export interface PoemCouplet {
  n?: number;
  lang?: string;
  dir?: string;
  hemistichs?: string[];
  translations?: PoemCoupletLayer[];
  vocab?: PoemVocab[];
}

export interface PoemViewMeta {
  title?: string;
  subtitle?: string;
  meter?: string;
  poet?: string;
  work?: string;
  book?: string;
  section?: string;
  reciter?: string;
  recitationUrl?: string;
  layers?: { lang: string; label?: string }[];
}

/** A dedicated, manuscript-styled reader for poems (masnavi / ghazal). */
@Component({
  selector: 'app-poem-view',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './poem-view.component.html',
  styleUrl: './poem-view.component.scss',
})
export class PoemViewComponent {
  @Input() poem: PoemViewMeta | null = null;
  @Input() couplets: PoemCouplet[] = [];

  /** Layers the reader has hidden (each is individually toggleable). */
  private readonly hidden = signal<Set<string>>(new Set());

  private static readonly ORDER = ['en', 'ur', 'vocab'];

  readonly layers = computed(() => {
    const base = this.poem?.layers?.length ? [...this.poem.layers] : this.deriveLayers();
    return base.sort(
      (a, b) => (PoemViewComponent.ORDER.indexOf(a.lang) + 100) % 100 - (PoemViewComponent.ORDER.indexOf(b.lang) + 100) % 100,
    );
  });

  private deriveLayers(): { lang: string; label?: string }[] {
    const seen = new Map<string, { lang: string; label?: string }>();
    for (const c of this.couplets) {
      for (const t of c.translations ?? []) if (!seen.has(t.lang)) seen.set(t.lang, { lang: t.lang, label: t.label });
      if (c.vocab?.length && !seen.has('vocab')) seen.set('vocab', { lang: 'vocab', label: 'مفردات' });
    }
    return [...seen.values()];
  }

  isOn(lang: string): boolean { return !this.hidden().has(lang); }

  toggle(lang: string): void {
    this.hidden.update((set) => {
      const next = new Set(set);
      if (next.has(lang)) next.delete(lang); else next.add(lang);
      return next;
    });
  }

  visibleTranslations(c: PoemCouplet): PoemCoupletLayer[] {
    return (c.translations ?? []).filter((t) => this.isOn(t.lang));
  }

  showVocab(c: PoemCouplet): boolean {
    return this.isOn('vocab') && !!c.vocab?.length;
  }

  faNum(n?: number): string {
    return n == null ? '' : String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  }

  openRecitation(): void {
    const url = this.poem?.recitationUrl;
    if (url && typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
  }
}
