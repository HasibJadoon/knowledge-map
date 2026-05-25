import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  QR_SIDE_BLOCK_LABELS,
  type QrIraabGroupDisplayPayload,
  type QrTafsirGroupDisplayPayload,
} from '../../services/quran-research-api.service';

type AnyPayload = QrIraabGroupDisplayPayload | QrTafsirGroupDisplayPayload;
type Tab = 'quran' | 'scholars' | 'links' | 'others';

interface QuranRefRow { key: string; surah: number; ayah: number; label: string | null; count: number; }
interface ScholarRefRow { label: string; role: string; count: number; }
interface LinkRow { kindLabel: string; label: string; count: number; }
interface OtherRow { id: string; kindLabel: string; preview: string; }

/** Block types surfaced in the "Others" tab — chips / markers, but not the
 *  quran_ref_chip (already aggregated into the قرآن tab). */
const OTHERS_BLOCK_TYPES: ReadonlySet<string> = new Set(
  Object.keys(QR_SIDE_BLOCK_LABELS).filter(t => t !== 'quran_ref_chip'),
);

/** Arabic labels for scholar-ref roles. */
const ROLE_LABELS: Record<string, string> = {
  cited: 'مذكور', responded_to: 'رُدّ عليه', agreed_with: 'موافَق',
  disagreed_with: 'مخالَف', quoted: 'مقتبَس', transmitted: 'مَروي عنه',
};
/** Arabic labels for block-link kinds. */
const KIND_LABELS: Record<string, string> = {
  backlink: 'ورود سابق', related_note: 'ملاحظة ذات صلة', same_ayah_link: 'نفس الآية',
  same_word_link: 'نفس الكلمة', same_grammar_link: 'نفس الإعراب',
  ayah_link: 'إحالة آية', word_link: 'إحالة كلمة',
};

/**
 * References & backlinks modal for the mobile iʿrāb / tafsir readers.
 *
 * A single bottom-sheet modal with an `ion-segment` tab strip, one tab per
 * reference type: قرآن (Quran citations), علماء (scholar refs — tafsir only),
 * روابط (backlinks + related links). All rows are aggregated + de-duplicated
 * from the display payload's blocks. Mirrors the lexicon reader's modal feel.
 */
@Component({
  selector: 'km-refs-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-modal
      class="refs-modal"
      [isOpen]="open()"
      [breakpoints]="[0, 0.6, 0.95]"
      [initialBreakpoint]="0.6"
      [handle]="true"
      [backdropDismiss]="true"
      (ionModalDidDismiss)="close()"
    >
      <ng-template>
        <ion-content class="refs-modal__content">
          <div class="refs-sheet" dir="rtl">
            <header class="refs-sheet__head">
              <h3 class="refs-sheet__title">المراجع والروابط</h3>
              <button class="refs-sheet__close" type="button" (click)="close()" aria-label="إغلاق">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </header>

            <ion-segment class="refs-seg" mode="md"
                         [value]="tab()"
                         (ionChange)="setTab($any($event.detail.value))">
              <ion-segment-button value="quran">
                <ion-label>قرآن <span class="refs-seg__n">{{ quranRefs().length }}</span></ion-label>
              </ion-segment-button>
              @if (hasScholars()) {
                <ion-segment-button value="scholars">
                  <ion-label>علماء <span class="refs-seg__n">{{ scholarRefs().length }}</span></ion-label>
                </ion-segment-button>
              }
              <ion-segment-button value="links">
                <ion-label>روابط <span class="refs-seg__n">{{ links().length }}</span></ion-label>
              </ion-segment-button>
              @if (hasOthers()) {
                <ion-segment-button value="others">
                  <ion-label>أخرى <span class="refs-seg__n">{{ others().length }}</span></ion-label>
                </ion-segment-button>
              }
            </ion-segment>

            <div class="refs-body">
              @switch (tab()) {
                @case ('quran') {
                  @if (quranRefs().length) {
                    <ul class="refs-list">
                      @for (r of quranRefs(); track r.key) {
                        <li>
                          <button class="refs-row refs-row--tap" type="button" (click)="pickAyah(r)">
                            <span class="refs-row__ref">﴿{{ r.surah }}:{{ r.ayah }}﴾</span>
                            @if (r.label) { <span class="refs-row__label">{{ r.label }}</span> }
                            @if (r.count > 1) { <span class="refs-row__count">×{{ r.count }}</span> }
                            <ion-icon class="refs-row__chev" name="chevron-back-outline" />
                          </button>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="refs-empty">لا توجد استشهادات قرآنية</p>
                  }
                }
                @case ('scholars') {
                  @if (scholarRefs().length) {
                    <ul class="refs-list">
                      @for (s of scholarRefs(); track s.label) {
                        <li>
                          <div class="refs-row">
                            <span class="refs-row__label">{{ s.label }}</span>
                            <span class="refs-row__role">{{ s.role }}</span>
                            @if (s.count > 1) { <span class="refs-row__count">×{{ s.count }}</span> }
                          </div>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="refs-empty">لا توجد إحالات لعلماء</p>
                  }
                }
                @case ('links') {
                  @if (links().length) {
                    <ul class="refs-list">
                      @for (l of links(); track l.kindLabel + l.label) {
                        <li>
                          <div class="refs-row">
                            <span class="refs-row__kind">{{ l.kindLabel }}</span>
                            <span class="refs-row__label">{{ l.label }}</span>
                            @if (l.count > 1) { <span class="refs-row__count">×{{ l.count }}</span> }
                          </div>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="refs-empty">لا توجد روابط أو إحالات خلفية</p>
                  }
                }
                @case ('others') {
                  @if (others().length) {
                    <ul class="refs-list">
                      @for (o of others(); track o.id) {
                        <li>
                          <div class="refs-row refs-row--stack">
                            <span class="refs-row__kind">{{ o.kindLabel }}</span>
                            <span class="refs-row__preview">{{ o.preview || '—' }}</span>
                          </div>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="refs-empty">لا توجد عناصر إضافية</p>
                  }
                }
              }
            </div>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    :host { display: contents; }
    .refs-modal {
      --background: #0d0c0a;
      --border-radius: 18px 18px 0 0;
    }
    .refs-modal__content { --background: #0d0c0a; }
    .refs-sheet { padding: 0.4rem 0 1.4rem; color: #f5f1e7; }
    .refs-sheet__head {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.4rem 1rem 0.7rem;
    }
    .refs-sheet__title {
      flex: 1; margin: 0;
      font-family: var(--km-font-arabic-ui, serif);
      font-size: 1.05rem; font-weight: 600; color: #f3d77a;
    }
    .refs-sheet__close {
      appearance: none; flex: 0 0 auto;
      width: 2rem; height: 2rem; display: grid; place-items: center;
      border: 1px solid rgba(232,201,106,.22); border-radius: 50%;
      background: rgba(232,201,106,.06); color: rgba(245,241,231,.7);
      cursor: pointer;
      ion-icon { font-size: 1.1rem; }
    }
    .refs-seg {
      --background: rgba(255,255,255,.03);
      margin: 0 1rem 0.7rem;
      border: 1px solid rgba(201,168,76,.14);
      border-radius: 12px;
    }
    .refs-seg ion-segment-button {
      --color: rgba(245,241,231,.55);
      --color-checked: #14110d;
      --background-checked: #e8c96a;
      --indicator-color: transparent;
      --border-radius: 9px;
      min-height: 38px;
      font-family: var(--km-font-arabic-ui, serif);
    }
    .refs-seg__n {
      font-size: 0.7rem; font-weight: 700; opacity: 0.7;
      margin-inline-start: 3px;
    }
    .refs-body { padding: 0 1rem; }
    .refs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .refs-row {
      display: flex; align-items: center; gap: 0.55rem; width: 100%;
      padding: 0.6rem 0.75rem;
      background: rgba(255,255,255,.025);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px;
      color: #f5f1e7;
      font-family: var(--km-font-arabic-ui, serif);
      text-align: start;
    }
    .refs-row--tap {
      appearance: none; cursor: pointer;
      &:active { border-color: rgba(232,201,106,.4); background: rgba(232,201,106,.07); }
    }
    .refs-row__ref {
      flex: 0 0 auto; color: #a9d28a; font-weight: 700; font-size: 0.95rem;
      font-variant-numeric: tabular-nums;
    }
    .refs-row__label { flex: 1; min-width: 0; font-size: 0.9rem; color: rgba(245,241,231,.82);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .refs-row__role,
    .refs-row__kind {
      flex: 0 0 auto; font-size: 0.7rem; font-weight: 600;
      padding: 2px 8px; border-radius: 8px;
      background: rgba(232,201,106,.10); color: #e8c96a;
      font-family: system-ui, sans-serif;
    }
    .refs-row__count {
      flex: 0 0 auto; font-size: 0.7rem; font-weight: 700;
      color: rgba(245,241,231,.45); font-family: system-ui, sans-serif;
    }
    .refs-row__chev { flex: 0 0 auto; font-size: 0.95rem; color: rgba(232,201,106,.5); }
    .refs-row--stack {
      flex-direction: column; align-items: stretch; gap: 0.4rem;
    }
    .refs-row--stack .refs-row__kind { align-self: flex-start; }
    .refs-row__preview {
      font-size: 0.86rem; line-height: 1.55; color: rgba(245,241,231,.78);
      white-space: normal;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .refs-empty {
      text-align: center; color: rgba(245,241,231,.4);
      font-size: 0.88rem; padding: 1.6rem 1rem; font-style: italic;
    }
  `],
})
export class RefsModalComponent {
  readonly payload = input<AnyPayload | null>(null);
  readonly open    = input<boolean>(false);

  readonly dismiss  = output<void>();
  readonly openAyah = output<{ surah: number; ayah: number }>();

  readonly tab = signal<Tab>('quran');

  /** Quran citations aggregated + de-duplicated across all blocks. */
  readonly quranRefs = computed<QuranRefRow[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const map = new Map<string, QuranRefRow>();
    for (const b of p.blocks) {
      for (const r of (b.quran_refs ?? [])) {
        if (r.surah == null) continue;
        const ayah = r.ayah ?? 0;
        const key = `${r.surah}:${ayah}`;
        const cur = map.get(key);
        if (cur) { cur.count++; }
        else map.set(key, { key, surah: r.surah, ayah, label: r.label ?? null, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) =>
      a.surah - b.surah || a.ayah - b.ayah);
  });

  /** Scholar refs (tafsir blocks only — iʿrāb blocks omit scholar_refs). */
  readonly scholarRefs = computed<ScholarRefRow[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const map = new Map<string, ScholarRefRow>();
    for (const b of p.blocks) {
      const refs = (b as { scholar_refs?: Array<{ scholar_id: string; role: string; label?: string | null }> }).scholar_refs;
      for (const r of (refs ?? [])) {
        const label = r.label ?? r.scholar_id;
        const role = ROLE_LABELS[r.role] ?? r.role;
        const key = `${label}|${role}`;
        const cur = map.get(key);
        if (cur) { cur.count++; }
        else map.set(key, { label, role, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  });

  /** Backlinks + related links aggregated by (kind, label). */
  readonly links = computed<LinkRow[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const map = new Map<string, LinkRow>();
    for (const b of p.blocks) {
      const all = [...(b.backlinks ?? []), ...(b.related_links ?? [])];
      for (const l of all) {
        const kindLabel = KIND_LABELS[l.kind] ?? l.kind;
        const label = l.label ?? l.typed_ref ?? l.block_id ?? '—';
        const key = `${kindLabel}|${label}`;
        const cur = map.get(key);
        if (cur) { cur.count++; }
        else map.set(key, { kindLabel, label, count: 1 });
      }
    }
    return [...map.values()];
  });

  readonly hasScholars = computed(() => this.scholarRefs().length > 0);

  /** Side blocks (isnad, voice_marker, poetry_quote, …) for the "أخرى" tab. */
  readonly others = computed<OtherRow[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const out: OtherRow[] = [];
    for (const b of p.blocks) {
      if (!OTHERS_BLOCK_TYPES.has(b.block_type)) continue;
      const raw = (b.text_ar ?? b.raw_text ?? '').trim();
      const preview = raw.length > 220 ? raw.slice(0, 220) + '…' : raw;
      out.push({
        id: b.id,
        kindLabel: QR_SIDE_BLOCK_LABELS[b.block_type] ?? b.block_type,
        preview,
      });
    }
    return out;
  });

  readonly hasOthers = computed(() => this.others().length > 0);

  setTab(t: Tab): void { this.tab.set(t); }
  close(): void { this.dismiss.emit(); }
  pickAyah(r: QuranRefRow): void {
    this.dismiss.emit();
    this.openAyah.emit({ surah: r.surah, ayah: r.ayah });
  }
}
