import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

import {
  FiveLensLexiconService,
  FiveLensEntry,
  QuranWord,
} from '../../../../../shared/services/ar-linguistics/five-lens-lexicon.service';

interface OccFamily {
  label: string;
  refs: string[];
}

/**
 * Five-Lens modal. Opened from the word context menu (word-popover) for a
 * tapped Quran word; fetches the curated entry for the word's root
 * (qr_word_occurrences.root) and renders it in the illuminated-manuscript
 * aesthetic (Amiri / Cinzel / EB Garamond / Gentium Plus, dark + gold).
 * Display-only — it reads the lexicon and writes nothing.
 */
@Component({
  selector: 'app-lens-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
  <ion-header class="km-lens-header">
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button (click)="dismiss()" aria-label="Close"><ion-icon name="close-outline"></ion-icon></ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="km-lens-content">
    <div *ngIf="loading" class="km-center"><ion-spinner name="crescent"></ion-spinner></div>

    <div *ngIf="!loading && entry && !entry.found" class="km-center km-empty">
      No five-lens entry yet for <span class="ar" dir="rtl" lang="ar">{{ word?.text }}</span>.
    </div>

    <article *ngIf="!loading && entry?.found" class="leaf">
      <p class="eyebrow">Key Term · Five-Lens</p>
      <h1 class="lemma" dir="rtl" lang="ar">{{ word?.text }}</h1>
      <p class="translit" *ngIf="entry?.entry?.lemma">{{ entry?.entry?.lemma }}</p>
      <div class="meta">
        <span>root <span class="ar-inline" dir="rtl" lang="ar">{{ entry?.entry?.rootSpaced }}</span></span>
        <span class="dot">·</span>
        <span>{{ word?.surah }}:{{ word?.ayah }}</span>
      </div>

      <!-- root-image ornament -->
      <figure class="approach">
        <svg viewBox="0 0 320 230" role="img" aria-label="Stations of approach">
          <defs>
            <radialGradient id="kmCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#f4dd9e"/><stop offset="45%" stop-color="#e8c878"/>
              <stop offset="100%" stop-color="#8f6d2f" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <g fill="none" stroke="#8f6d2f">
            <path d="M70,55 A60,60 0 0 1 70,175" stroke-opacity="0.30"/>
            <path d="M70,32 A83,83 0 0 1 70,198" stroke-opacity="0.20"/>
            <path d="M70,12 A105,105 0 0 1 70,218" stroke-opacity="0.13"/>
            <path d="M70,78 A38,38 0 0 1 70,152" stroke-opacity="0.45"/>
          </g>
          <path d="M300,115 C235,110 215,118 190,115 C165,112 150,120 128,115"
                fill="none" stroke="#c9a24b" stroke-width="1.4" stroke-dasharray="2 6" stroke-linecap="round"/>
          <circle cx="300" cy="115" r="3.2" fill="#5f5641"/>
          <circle cx="235" cy="113" r="3.8" fill="#8f6d2f"/>
          <circle cx="190" cy="115" r="4.6" fill="#a9863c"/>
          <circle cx="150" cy="115" r="5.6" fill="#c9a24b"/>
          <circle cx="70" cy="115" r="42" fill="url(#kmCore)"/>
          <circle cx="70" cy="115" r="12" fill="#e8c878"/>
          <text x="70" y="120" text-anchor="middle" font-family="Amiri,serif" font-size="14" fill="#1b1510" direction="rtl">قُرب</text>
          <path d="M135,115 l9,-4 l0,8 z" fill="#c9a24b"/>
        </svg>
      </figure>

      <!-- ayah -->
      <div class="ayah-wrap" *ngIf="entry?.ayah?.line">
        <p class="ayah-ref">{{ entry?.ayah?.titleAr }}</p>
        <p class="ayah-line">{{ entry?.ayah?.line }}</p>
      </div>

      <hr class="rule">

      <!-- lenses -->
      <section class="lens" *ngFor="let l of entry?.lenses">
        <div class="lens-head">
          <span class="lens-num" dir="rtl" lang="ar">{{ arabicNum(l.seq) }}</span>
          <span class="lens-ar" dir="rtl" lang="ar">{{ l.headingAr }}</span>
          <span class="lens-en">{{ l.labelEn }}</span>
        </div>
        <p class="lens-body">{{ l.body }}</p>
      </section>

      <!-- occurrences -->
      <div *ngIf="families.length" class="occ">
        <p class="section-label">Cross-Corpus Occurrences</p>
        <div class="occ-fam" *ngFor="let f of families">
          <span class="occ-label">{{ f.label }}</span>
          <div class="occ-row">
            <span class="chip" *ngFor="let r of f.refs" [class.here]="r === currentRef">{{ r }}</span>
          </div>
        </div>
      </div>

      <!-- sources -->
      <div *ngIf="sourceGroups.length" class="sources">
        <p class="section-label">Rooted In</p>
        <div class="src-group" *ngFor="let g of sourceGroups">
          <h5>{{ g.kind }}</h5>
          <span class="src-item" *ngFor="let s of g.items">{{ humanize(s) }}</span>
        </div>
      </div>

      <div class="footer-mark" dir="rtl" lang="ar">۞</div>
    </article>
  </ion-content>
  `,
  styles: [`
    :host {
      --ink:#0d0a06; --panel:#1b1510; --gold:#c9a24b; --gold-bright:#e8c878; --gold-deep:#8f6d2f;
      --parch:#e7dcc4; --parch-mute:#b3a585; --muted:#8a7c61; --hair:rgba(201,162,75,.22);
      --ar:'Amiri',serif; --tl:'Gentium Plus',serif; --disp:'Cinzel',serif; --body:'EB Garamond',serif;
    }
    .km-lens-header ion-toolbar { --background: var(--ink); --border-color: rgba(201,162,75,.15); }
    .km-lens-header ion-button { --color: var(--gold); }
    .km-lens-content { --background: radial-gradient(120% 80% at 50% -8%, #1c150d 0%, var(--ink) 60%), var(--ink); }
    .km-center { display:flex; justify-content:center; align-items:center; min-height:50vh; }
    .km-center ion-spinner { --color: var(--gold); }
    .km-empty { font-family:var(--body); color:var(--parch-mute); font-style:italic; gap:8px; }
    .km-empty .ar { font-family:var(--ar); color:var(--gold); font-style:normal; font-size:1.3rem; }

    .leaf { max-width:680px; margin:0 auto; padding:22px 20px 60px; color:var(--parch); }
    .eyebrow { font-family:var(--disp); font-size:.6rem; letter-spacing:.4em; text-transform:uppercase; color:var(--gold-deep); text-align:center; margin:6px 0 18px; }
    .lemma { font-family:var(--ar); font-size:clamp(3.4rem,18vw,5.2rem); line-height:1; font-weight:700; text-align:center; color:var(--gold-bright); direction:rtl; margin:0; text-shadow:0 2px 26px rgba(232,200,120,.18); animation:rise .8s ease-out both; }
    .translit { font-family:var(--tl); font-style:italic; font-size:1.3rem; text-align:center; color:var(--parch); margin:.35em 0 .2em; }
    .meta { display:flex; justify-content:center; gap:12px; font-family:var(--disp); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
    .meta .ar-inline { font-family:var(--ar); font-size:1rem; letter-spacing:0; color:var(--gold); text-transform:none; }
    .meta .dot { color:var(--gold-deep); }

    .approach { margin:18px 0 6px; text-align:center; }
    .approach svg { max-width:280px; width:70%; height:auto; }

    .ayah-wrap { text-align:center; margin:6px 0; }
    .ayah-ref { font-family:var(--disp); font-size:.62rem; letter-spacing:.2em; text-transform:uppercase; color:var(--gold-deep); margin:0 0 6px; }
    .ayah-line { font-family:var(--tl); font-style:italic; color:var(--parch-mute); margin:0 auto; max-width:52ch; }

    .rule { height:1px; background:linear-gradient(90deg,transparent,var(--hair),var(--gold-deep) 50%,var(--hair),transparent); border:0; margin:26px 0; }

    .lens { margin:26px 0; }
    .lens-head { display:flex; align-items:baseline; gap:12px; margin:0 0 8px; }
    .lens-num { font-family:var(--ar); direction:rtl; color:var(--gold-deep); font-size:1.4rem; font-weight:700; min-width:1.1em; text-align:center; }
    .lens-ar { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.75rem; font-weight:700; line-height:1; }
    .lens-en { font-family:var(--disp); font-size:.66rem; letter-spacing:.24em; text-transform:uppercase; color:var(--muted); margin-left:auto; transform:translateY(-2px); }
    .lens-body { margin:0; color:var(--parch); line-height:1.62; }

    .section-label { font-family:var(--disp); font-size:.6rem; letter-spacing:.3em; text-transform:uppercase; color:var(--gold-deep); text-align:center; margin:28px 0 14px; }
    .occ-fam { margin:8px 0; }
    .occ-label { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.25rem; }
    .occ-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
    .chip { font-family:var(--disp); font-size:.74rem; letter-spacing:.05em; color:var(--gold); border:1px solid var(--hair); border-radius:3px; padding:3px 9px; }
    .chip.here { background:rgba(232,200,120,.14); color:var(--gold-bright); border-color:rgba(232,200,120,.4); }

    .sources { margin-top:8px; }
    .src-group { margin:10px 0; }
    .src-group h5 { font-family:var(--disp); font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); margin:0 0 6px; }
    .src-item { display:inline-block; font-family:var(--body); font-variant:small-caps; color:var(--gold); font-size:.92rem; margin-right:12px; }

    .footer-mark { text-align:center; margin-top:32px; font-family:var(--ar); color:var(--gold-deep); font-size:1.3rem; direction:rtl; }

    @keyframes rise { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
    @media (prefers-reduced-motion:reduce){ .lemma{animation:none;} }
  `],
})
export class LensModalComponent implements OnInit {
  @Input() root!: string;
  @Input() word?: QuranWord;

  private readonly lexicon = inject(FiveLensLexiconService);
  private readonly modalCtrl = inject(ModalController);

  loading = true;
  entry?: FiveLensEntry;
  families: OccFamily[] = [];
  sourceGroups: Array<{ kind: string; items: string[] }> = [];
  currentRef = '';

  private static readonly SRC_LABELS: Record<string, string> = {
    ketabonline_ibn_manzur_lisan_al_arab: 'Lisān al-ʿArab',
    ketabonline_al_zabidi_taj_al_arus: 'Tāj al-ʿArūs',
    ketabonline_al_raghib_mufradat: 'Mufradāt',
    ketabonline_al_fayyumi_misbah_munir: 'Miṣbāḥ al-Munīr',
    ketabonline_al_jawhari_al_sihah: 'al-Ṣiḥāḥ',
    saaid_maqayis_al_lugha: 'Maqāyīs al-Lugha',
    thahabi_al_khalil_kitab_al_ayn: 'Kitāb al-ʿAyn',
    qomra_al_qamus_al_muhit: 'al-Qāmūs al-Muḥīṭ',
    qomra_al_ubab_al_zakhir: 'al-ʿUbāb al-Zākhir',
    lane_lexicon: 'Lane',
    qul_irab_muyassar: 'al-Iʿrāb al-Muyassar',
    qul_jadwal_irab_quran: 'al-Jadwal',
    qul_irab_quran_daas: 'al-Daʿʿās',
    tibyan_ukbari_irab: 'al-Tibyān (al-ʿUkbarī)',
  };

  ngOnInit(): void {
    this.currentRef = this.word ? `${this.word.surah}:${this.word.ayah}` : '';
    this.lexicon.getFiveLens(this.root).subscribe((e) => {
      this.entry = e;
      if (e.found) {
        this.families = this.parseOccurrences(e.occurrences ?? '');
        this.sourceGroups = Object.entries(e.sources ?? {}).map(([kind, items]) => ({
          kind: this.humanizeKind(kind),
          items,
        }));
      }
      this.loading = false;
    });
  }

  /** "zulfaa: 34:37, 38:25 | uzlifat (IV): 26:64, 81:13" -> families */
  private parseOccurrences(raw: string): OccFamily[] {
    if (!raw.trim()) return [];
    return raw
      .split('|')
      .map((seg) => {
        const [label, refs] = seg.split(':').length > 1 ? this.splitFirst(seg, ':') : [seg, ''];
        return {
          label: label.trim(),
          refs: refs.match(/\d+:\d+/g) ?? [],
        };
      })
      .filter((f) => f.refs.length);
  }

  private splitFirst(s: string, sep: string): [string, string] {
    const i = s.indexOf(sep);
    return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
  }

  arabicNum(n: number): string {
    return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
  }

  humanize(slug: string): string {
    return (
      LensModalComponent.SRC_LABELS[slug] ??
      slug
        .replace(/^[a-z]+_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  private humanizeKind(kind: string): string {
    const map: Record<string, string> = {
      lexicon: 'Lexica',
      tafsir: 'Tafsīr',
      irab: 'Iʿrāb',
      irab_book: 'Iʿrāb',
    };
    return map[kind] ?? kind.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  dismiss(): void {
    void this.modalCtrl.dismiss();
  }
}
