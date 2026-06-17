import { Component, Input, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

import {
  FiveLensLexiconService,
  FiveLensEntry,
  QuranWord,
} from '../../../../../shared/services/ar-linguistics/five-lens-lexicon.service';
import {
  QrWordStudyService,
  QrMorphOccurrence,
  QrExample,
} from '../../../../../shared/services/quran/qr-word-study.service';

/**
 * Five-Lens modal. Opened from the word context menu (word-popover) for a
 * tapped Quran word; fetches the curated entry for the word's root
 * (qr_word_occurrences.root) and renders the manuscript leaf in the
 * illuminated aesthetic (Amiri / Cinzel / EB Garamond / Gentium Plus, dark +
 * gold). The bilingual lens bodies + ayah arrive as curated, sanitized HTML
 * and are rendered with [innerHTML]; ViewEncapsulation.None lets the leaf
 * styles reach that injected markup (everything is scoped under .km-lens so
 * nothing leaks globally). Display-only — it reads the lexicon and writes
 * nothing.
 */
@Component({
  selector: 'app-lens-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  encapsulation: ViewEncapsulation.None,
  template: `
  <ion-header class="km-lens-header">
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button (click)="dismiss()" aria-label="Close"><ion-icon name="close-outline"></ion-icon></ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="km-lens-content">
    <div class="km-lens">
      <div *ngIf="loading" class="km-state km-loading">
        <div class="km-illum"><span class="km-illum-ring"></span><span class="km-illum-core"></span></div>
        <p class="km-loading-text">Opening the lexicon…</p>
      </div>

      <div *ngIf="!loading && entry && !entry.found" class="km-state km-empty">
        No five-lens entry yet for <span class="ar-inline" dir="rtl" lang="ar">{{ word?.text }}</span>.
      </div>

      <article *ngIf="!loading && entry?.found" class="leaf">
        <p class="eyebrow">Key Term · Five-Lens</p>
        <h1 class="lemma" dir="rtl" lang="ar">{{ lemma() }}</h1>
        <p class="translit" *ngIf="entry?.entry?.translit">{{ entry?.entry?.translit }}</p>
        <p class="sense" *ngIf="entry?.entry?.sense">{{ entry?.entry?.sense }}</p>
        <div class="meta">
          <span>root <span class="ar-inline" dir="rtl" lang="ar">{{ entry?.entry?.rootSpaced }}</span></span>
          <ng-container *ngIf="entry?.entry?.pattern">
            <span class="dot">·</span>
            <span>pattern <span class="ar-inline" dir="rtl" lang="ar">{{ entry?.entry?.pattern }}</span></span>
          </ng-container>
          <span class="dot">·</span>
          <span>{{ word?.surah }}:{{ word?.ayah }}</span>
          <ng-container *ngIf="surahLabel() as sn">
            <span class="dot">·</span>
            <span class="ar-inline" dir="rtl" lang="ar">{{ sn }}</span>
          </ng-container>
        </div>

        <hr class="rule">

        <!-- ayah (curated bilingual HTML) -->
        <div class="ayah-wrap" *ngIf="entry?.ayah?.html" [innerHTML]="entry?.ayah?.html"></div>

        <!-- root-image ornament -->
        <figure class="approach">
          <div class="fig-label" *ngIf="entry?.figure?.label">{{ entry?.figure?.label }}</div>
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
            <text x="70" y="120" text-anchor="middle" font-family="Amiri,serif" font-size="14" fill="#080808" direction="rtl">قُرب</text>
            <path d="M135,115 l9,-4 l0,8 z" fill="#c9a24b"/>
          </svg>
          <figcaption *ngIf="entry?.figure?.html" [innerHTML]="entry?.figure?.html"></figcaption>
        </figure>

        <!-- range of meaning -->
        <ng-container *ngIf="entry?.meaning?.senses?.length">
          <p class="section-label">Range of Meaning</p>
          <div class="senses">
            <div class="sense-chip" *ngFor="let s of entry?.meaning?.senses">
              <span class="sense-ar" dir="rtl" lang="ar">{{ s.ar }}</span>
              <span class="sense-en">{{ s.en }}</span>
            </div>
          </div>
        </ng-container>

        <!-- memory hook (vocabulary retention) -->
        <div class="feature" *ngIf="entry?.retention as ret">
          <span class="feature-tag">Memory Hook</span>
          <p class="hook-line" [innerHTML]="ret.hook"></p>
          <div class="anchors" *ngIf="ret.anchors?.length">
            <span class="anchor" *ngFor="let a of ret.anchors"><b>{{ a.en }}</b><span>{{ a.note }}</span></span>
          </div>
          <p class="contrast" *ngIf="ret.contrast">{{ ret.contrast }}</p>
          <p class="retrieval" *ngIf="ret.retrieval">{{ ret.retrieval }}</p>
        </div>

        <hr class="rule tight">

        <!-- lenses (curated bilingual HTML bodies) -->
        <section class="lens" *ngFor="let l of entry?.lenses">
          <div class="lens-head">
            <span class="lens-num" dir="rtl" lang="ar">{{ arabicNum(l.seq) }}</span>
            <span class="lens-ar" dir="rtl" lang="ar">{{ l.headingAr }}</span>
            <span class="lens-en">{{ l.labelEn }}</span>
          </div>
          <div class="lens-body" [innerHTML]="l.html"></div>

          <ng-container *ngIf="l.ledger as lg">
            <figure class="confluence">
              <svg viewBox="0 0 320 96" role="img" aria-label="Two roots converging on one meaning">
                <text x="40" y="30" text-anchor="middle" font-family="Amiri,serif" font-size="20" fill="#c9a24b" direction="rtl">ق ر ب</text>
                <text x="280" y="30" text-anchor="middle" font-family="Amiri,serif" font-size="20" fill="#c9a24b" direction="rtl">ز ل ف</text>
                <path d="M40,40 C40,68 150,70 160,74" fill="none" stroke="#8f6d2f" stroke-width="1.3"/>
                <path d="M280,40 C280,68 170,70 160,74" fill="none" stroke="#8f6d2f" stroke-width="1.3"/>
                <circle cx="160" cy="78" r="5" fill="#e8c878"/>
                <text x="160" y="96" text-anchor="middle" font-family="EB Garamond,serif" font-style="italic" font-size="12" fill="#8c8c8c">one sense, doubled</text>
              </svg>
            </figure>
            <div class="ledger">
              <div class="lpanel claimed">
                <div class="tier">{{ lg.claimed.tier }}</div>
                <div class="lword" dir="rtl" lang="ar">{{ lg.claimed.word }}</div>
                <div class="lcase">{{ lg.claimed.case }}</div>
                <div class="lrole">{{ lg.claimed.role }}</div>
                <div class="lchips"><span class="chip" *ngFor="let c of lg.claimed.chips">{{ c }}</span></div>
              </div>
              <div class="lpanel granted">
                <div class="tier">{{ lg.granted.tier }}</div>
                <div class="lword" dir="rtl" lang="ar">{{ lg.granted.word }}</div>
                <div class="lcase">{{ lg.granted.case }}</div>
                <div class="lrole">{{ lg.granted.role }}</div>
                <div class="lchips"><span class="chip" *ngFor="let c of lg.granted.chips">{{ c }}</span></div>
              </div>
            </div>
            <p class="ledger-note" *ngIf="lg.note">{{ lg.note }}</p>
          </ng-container>
        </section>

        <!-- derivation table (sarf: past / present / verbal noun) -->
        <ng-container *ngIf="entry?.morphology as mp">
          <hr class="rule tight">
          <p class="section-label">Derivation · <span class="ar-inline" dir="rtl" lang="ar">الصَّرْف</span> · <span class="ar-inline" dir="rtl" lang="ar">ماضٍ · مضارع · مصدر</span></p>
          <p class="forms-note" *ngIf="mp.note">{{ mp.note }}</p>
          <div class="forms">
            <div class="forms-head">
              <span>Form</span>
              <span class="fc-ar" dir="rtl" lang="ar">ماضٍ</span>
              <span class="fc-ar" dir="rtl" lang="ar">مضارع</span>
              <span class="fc-ar" dir="rtl" lang="ar">مصدر</span>
            </div>
            <div class="forms-row" *ngFor="let f of mp.forms">
              <span class="fc-form"><b>{{ f.form }}</b><span class="wazn" dir="rtl" lang="ar">{{ f.wazn }}</span></span>
              <span class="fc-ar" dir="rtl" lang="ar">{{ f.past }}</span>
              <span class="fc-ar" dir="rtl" lang="ar">{{ f.present }}</span>
              <span class="fc-ar masdar" dir="rtl" lang="ar">{{ f.masdar }}</span>
              <span class="fc-gloss">{{ f.gloss }}</span>
            </div>
          </div>
          <div class="keyword-pin" *ngIf="mp.keyword as kw">
            <span class="kw-word" dir="rtl" lang="ar">{{ kw.word }}</span>
            <span class="kw-meta"><span dir="rtl" lang="ar">{{ kw.pattern }}</span> · {{ kw.kind }} — {{ kw.gloss }}</span>
          </div>
        </ng-container>

        <!-- word constellation (root family — live from DB_AL) -->
        <ng-container *ngIf="constellationLayout() as cl">
          <hr class="rule">
          <p class="section-label">Word Constellation · <span class="ar-inline" dir="rtl" lang="ar">الأسرة الاشتقاقية</span></p>
          <p class="forms-note">{{ cl.nodes.length }} words spun from one root — gold marks those in the Qur'an.</p>
          <figure class="constellation-fig">
            <svg viewBox="0 0 320 320" role="img" aria-label="Derivational family of the root">
              <defs>
                <radialGradient id="cnHub" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stop-color="#f4dd9e"/><stop offset="60%" stop-color="#c9a24b"/><stop offset="100%" stop-color="#8f6d2f"/>
                </radialGradient>
              </defs>
              <line *ngFor="let n of cl.nodes" class="cn-line" x1="160" y1="160" [attr.x2]="n.x" [attr.y2]="n.y"></line>
              <circle class="cn-hub" cx="160" cy="160" r="24"></circle>
              <text class="cn-hub-text" x="160" y="160" text-anchor="middle" dominant-baseline="central" dir="rtl" lang="ar">{{ cl.root }}</text>
              <ng-container *ngFor="let n of cl.nodes">
                <circle class="cn-node" [class.q]="n.isQuran" [attr.cx]="n.x" [attr.cy]="n.y" r="3.2"></circle>
                <text class="cn-label" [class.q]="n.isQuran" [attr.x]="n.lx" [attr.y]="n.ly" text-anchor="middle" dominant-baseline="central" dir="rtl" lang="ar">{{ n.ar }}</text>
              </ng-container>
            </svg>
          </figure>
        </ng-container>

        <!-- occurrences -->
        <ng-container *ngIf="entry?.occurrences?.refs?.length || entry?.occurrences?.families?.length">
          <hr class="rule">
          <p class="section-label">Cross-Corpus Occurrences · <span class="ar-inline" dir="rtl" lang="ar">{{ entry?.entry?.rootSpaced }}</span></p>
          <p class="occ-summary" *ngIf="occurrenceCount() as oc">{{ oc }} occurrences across {{ entry?.occurrences?.families?.length || 1 }} forms</p>
          <ng-container *ngIf="entry?.occurrences?.families?.length; else flatOcc">
            <div class="occ-fam" *ngFor="let f of entry?.occurrences?.families">
              <h4 dir="rtl" lang="ar">{{ f.headingAr }}</h4>
              <span class="occ-gloss">{{ f.gloss }}</span>
              <div class="occ-row">
                <span class="chip" *ngFor="let r of f.refs" [class.here]="r === currentRef">{{ r }}</span>
              </div>
            </div>
          </ng-container>
          <ng-template #flatOcc>
            <div class="occ-row">
              <span class="chip" *ngFor="let r of entry?.occurrences?.refs" [class.here]="r === currentRef">{{ r }}</span>
            </div>
          </ng-template>
        </ng-container>

        <!-- Qur'anic morphology (live from km_quran QAC corpus) -->
        <ng-container *ngIf="qrMorph.length">
          <hr class="rule tight">
          <p class="section-label">Qur'anic Morphology · <span class="ar-inline" dir="rtl" lang="ar">الإعراب</span></p>
          <p class="forms-note">Every occurrence parsed from the Qur'anic morphology corpus.</p>
          <div class="morph">
            <div class="morph-row" *ngFor="let m of qrMorph" [class.here]="m.ref === currentRef">
              <span class="chip" [class.here]="m.ref === currentRef">{{ m.ref }}</span>
              <span class="morph-word" dir="rtl" lang="ar">{{ m.wordAr }}</span>
              <span class="morph-tag">{{ m.readable }}</span>
            </div>
          </div>
        </ng-container>

        <!-- in-context examples (live translations from km_quran) -->
        <ng-container *ngIf="qrExamples.length">
          <hr class="rule tight">
          <p class="section-label">In Context · <span class="ar-inline" dir="rtl" lang="ar">أمثلة</span></p>
          <p class="forms-note">The root across the Qur'an, with translation.</p>
          <div class="examples">
            <div class="ex-card" *ngFor="let e of qrExamples" [class.here]="e.ref === currentRef">
              <div class="ex-head">
                <span class="chip" [class.here]="e.ref === currentRef">{{ e.ref }}</span>
                <span class="ex-word" dir="rtl" lang="ar">{{ e.wordAr }}</span>
              </div>
              <p class="ex-text">{{ e.text }}</p>
              <p class="ex-src" *ngIf="e.translator">— {{ e.translator }}</p>
            </div>
          </div>
        </ng-container>

        <!-- From the Lexica: real dictionary excerpts (live from DB_AL) -->
        <ng-container *ngIf="entry?.lexica?.length">
          <hr class="rule">
          <p class="section-label">From the Lexica</p>
          <div class="lexica">
            <div class="lex-card" *ngFor="let lx of entry?.lexica">
              <span class="lex-src">{{ humanize(lx.source) }}</span>
              <p class="lex-text" [class.ar]="lx.lang === 'ar'" [attr.dir]="lx.lang === 'ar' ? 'rtl' : 'ltr'" [attr.lang]="lx.lang">{{ lx.text }}</p>
            </div>
          </div>
        </ng-container>

        <!-- sources -->
        <div *ngIf="sourceGroups.length" class="sources">
          <p class="section-label">Rooted In</p>
          <div class="src-grid">
            <div class="src-col" *ngFor="let g of sourceGroups">
              <h5>{{ g.kind }}</h5>
              <span class="src-item" *ngFor="let s of g.items">{{ humanize(s) }}</span>
            </div>
          </div>
        </div>

        <div class="footer-mark" dir="rtl" lang="ar">۞</div>
      </article>
    </div>
  </ion-content>
  `,
  styles: [`
    .km-lens {
      /* K-MAPS app dark theme — gold-on-black (matches theme/variables.scss) */
      --ink:#080808; --gold:#c9a84c; --gold-bright:#e8c96a; --gold-deep:#9e7c3c;
      --parch:rgba(255,255,255,.92); --parch-mute:rgba(255,255,255,.60); --muted:rgba(255,255,255,.40);
      --hair:rgba(201,168,76,.16); --hair-soft:rgba(201,168,76,.08);
      --ar:'Amiri',serif; --tl:'Gentium Plus',serif; --disp:'Cinzel',serif; --body:'EB Garamond',serif;
      font-family: var(--body);
    }
    .km-lens-header ion-toolbar { --background:#080808; --border-color:rgba(201,168,76,.14); }
    .km-lens-header ion-button { --color:#c9a84c; }
    .km-lens-content { --background: radial-gradient(120% 80% at 50% -8%, #161616 0%, #080808 60%), #080808; }

    .km-lens .km-state { display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:50vh; gap:8px; }
    .km-lens .km-state ion-spinner { --color:var(--gold); }
    .km-lens .km-empty { font-family:var(--body); color:var(--parch-mute); font-style:italic; }
    .km-lens .km-empty .ar-inline { font-family:var(--ar); color:var(--gold); font-style:normal; font-size:1.3rem; }

    .km-lens .leaf {
      max-width:680px; margin:0 auto; padding:24px 20px 60px; color:var(--parch);
      position:relative; border:1px solid var(--hair); border-radius:3px;
      background:linear-gradient(180deg, rgba(26,26,26,.55), rgba(8,8,8,.55));
    }
    .km-lens .leaf::before { content:""; position:absolute; inset:8px; border:1px solid var(--hair-soft); border-radius:2px; pointer-events:none; }

    .km-lens .eyebrow { font-family:var(--disp); font-size:.62rem; letter-spacing:.42em; text-transform:uppercase; color:var(--gold-deep); text-align:center; margin:4px 0 18px; }
    .km-lens .lemma { font-family:var(--ar); font-size:clamp(3.8rem,16vw,5.6rem); line-height:1; font-weight:700; text-align:center; color:var(--gold-bright); direction:rtl; margin:0; text-shadow:0 2px 28px rgba(232,201,106,.18); animation:km-rise .8s ease-out both; }
    .km-lens .translit { font-family:var(--tl); font-style:italic; font-size:1.4rem; text-align:center; color:var(--parch); margin:.35em 0 .2em; }
    .km-lens .meta { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:12px; font-family:var(--disp); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
    .km-lens .meta .ar-inline { font-family:var(--ar); font-size:1.05rem; letter-spacing:0; color:var(--gold); text-transform:none; }
    .km-lens .meta .dot { color:var(--gold-deep); }

    .km-lens .rule { height:1px; background:linear-gradient(90deg,transparent,var(--hair) 18%,var(--gold-deep) 50%,var(--hair) 82%,transparent); border:0; margin:28px 0; }
    .km-lens .rule.tight { margin:22px 0; }

    .km-lens .ayah-wrap { text-align:center; margin:6px 0; }
    .km-lens .ayah-wrap p { margin:0 0 12px; }
    .km-lens .ayah-wrap p[lang="ar"] { font-family:var(--ar); direction:rtl; font-size:clamp(1.7rem,5.5vw,2.3rem); line-height:2.05; color:var(--parch); }
    .km-lens .ayah-wrap em { font-family:var(--body); font-style:italic; color:var(--parch-mute); }

    .km-lens .approach { margin:18px 0 6px; text-align:center; }
    .km-lens .approach svg { max-width:280px; width:70%; height:auto; }

    .km-lens .lens { margin:26px 0; }
    .km-lens .lens-head { display:flex; align-items:center; gap:12px; margin:0 0 8px; }
    .km-lens .lens-num { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.15rem; font-weight:700; flex:0 0 auto; width:2rem; height:2rem; display:inline-grid; place-items:center; border-radius:50%; background:radial-gradient(circle at 50% 35%, rgba(232,201,106,.16), rgba(8,8,8,.2)); box-shadow:inset 0 0 0 1px rgba(201,168,76,.4), 0 0 0 4px rgba(8,8,8,.5), 0 0 14px -4px rgba(232,201,106,.5); }
    .km-lens .lens-ar { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.8rem; font-weight:700; line-height:1; }
    .km-lens .lens-en { font-family:var(--disp); font-size:.66rem; letter-spacing:.24em; text-transform:uppercase; color:var(--muted); margin-left:auto; transform:translateY(-2px); }
    .km-lens .lens-body { margin:0; color:var(--parch); line-height:1.66; }
    .km-lens .lens-body p { margin:0 0 .6em; }
    .km-lens .lens-body [lang="ar"] { font-family:var(--ar); direction:rtl; unicode-bidi:isolate; color:var(--gold); font-size:1.16em; }
    .km-lens .lens-body em { font-family:var(--tl); font-style:italic; color:var(--parch); }

    .km-lens .section-label { font-family:var(--disp); font-size:.6rem; letter-spacing:.3em; text-transform:uppercase; color:var(--gold-deep); text-align:center; margin:26px 0 14px; }
    .km-lens .section-label .ar-inline { font-family:var(--ar); letter-spacing:0; color:var(--gold); }
    .km-lens .occ-row { display:flex; gap:8px 10px; flex-wrap:wrap; justify-content:center; }
    .km-lens .chip { font-family:var(--disp); font-size:.76rem; letter-spacing:.05em; color:var(--gold); border:1px solid var(--hair); border-radius:3px; padding:4px 9px; font-variant-numeric:tabular-nums; }
    .km-lens .chip.here { background:rgba(232,201,106,.14); color:var(--gold-bright); border-color:rgba(232,201,106,.4); }

    .km-lens .sources { margin-top:28px; }
    .km-lens .src-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .km-lens .src-col h5 { font-family:var(--disp); font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); margin:0 0 8px; border-bottom:1px solid var(--hair-soft); padding-bottom:6px; }
    .km-lens .src-item { display:block; font-family:var(--body); font-variant:small-caps; color:var(--gold); font-size:.92rem; padding:1px 0; }

    .km-lens .footer-mark { text-align:center; margin-top:34px; font-family:var(--ar); color:var(--gold-deep); font-size:1.4rem; direction:rtl; }

    .km-lens .sense { font-family:var(--body); font-style:italic; text-align:center; color:var(--parch-mute); margin:0 0 16px; }
    .km-lens .fig-label { font-family:var(--disp); font-size:.6rem; letter-spacing:.3em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:12px; }
    .km-lens figcaption { font-family:var(--body); font-style:italic; color:var(--muted); font-size:.95rem; margin:12px auto 0; max-width:54ch; text-align:center; }
    .km-lens figcaption [lang="ar"] { font-family:var(--ar); font-style:normal; color:var(--gold); }
    .km-lens figcaption em { font-family:var(--body); font-variant:small-caps; font-style:normal; color:var(--gold); }
    .km-lens .confluence { margin:14px auto 2px; text-align:center; }
    .km-lens .confluence svg { max-width:300px; width:80%; height:auto; }
    .km-lens .ledger { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:8px 0 2px; }
    .km-lens .lpanel { border-left:2px solid var(--hair); padding:2px 0 2px 16px; }
    .km-lens .lpanel .tier { font-family:var(--disp); font-size:.58rem; letter-spacing:.28em; text-transform:uppercase; margin-bottom:8px; }
    .km-lens .lpanel .lword { font-family:var(--ar); direction:rtl; font-size:2.2rem; line-height:1.1; }
    .km-lens .lpanel .lcase { font-family:var(--tl); font-style:italic; font-size:.9rem; margin:4px 0 8px; }
    .km-lens .lpanel .lrole { font-family:var(--body); font-style:italic; color:var(--parch-mute); font-size:.9rem; margin-bottom:10px; }
    .km-lens .lpanel .lchips { display:flex; gap:8px; flex-wrap:wrap; }
    .km-lens .lpanel.claimed { border-left-color:rgba(255,255,255,.18); }
    .km-lens .lpanel.claimed .tier, .km-lens .lpanel.claimed .lword { color:rgba(255,255,255,.5); }
    .km-lens .lpanel.claimed .lcase, .km-lens .lpanel.claimed .chip { color:var(--muted); border-color:rgba(255,255,255,.18); }
    .km-lens .lpanel.granted { border-left-color:var(--gold); }
    .km-lens .lpanel.granted .tier { color:var(--gold-deep); }
    .km-lens .lpanel.granted .lword { color:var(--gold-bright); text-shadow:0 1px 18px rgba(232,201,106,.3); }
    .km-lens .lpanel.granted .lcase, .km-lens .lpanel.granted .chip { color:var(--gold); }
    .km-lens .ledger-note { text-align:center; font-family:var(--body); font-style:italic; color:var(--muted); margin:12px 0 0; font-size:.95rem; }
    .km-lens .occ-fam { margin:12px 0; text-align:center; }
    .km-lens .occ-fam h4 { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.4rem; margin:0 0 2px; font-weight:700; }
    .km-lens .occ-gloss { font-family:var(--body); font-style:italic; color:var(--parch-mute); font-size:.9rem; }
    .km-lens .occ-fam .occ-row { margin-top:8px; }
    @media (max-width:560px){ .km-lens .ledger { grid-template-columns:1fr; } }

    /* — richness polish — */
    .km-lens .leaf > * { animation: km-rise .55s cubic-bezier(.2,.7,.2,1) both; }
    .km-lens .leaf > *:nth-child(2){ animation-delay:.04s }
    .km-lens .leaf > *:nth-child(3){ animation-delay:.08s }
    .km-lens .leaf > *:nth-child(4){ animation-delay:.12s }
    .km-lens .leaf > *:nth-child(5){ animation-delay:.16s }
    .km-lens .leaf > *:nth-child(6){ animation-delay:.20s }
    .km-lens .leaf > *:nth-child(7){ animation-delay:.24s }
    .km-lens .leaf > *:nth-child(n+8){ animation-delay:.28s }

    .km-lens .rule::after { content:""; position:absolute; left:50%; top:50%; width:6px; height:6px; transform:translate(-50%,-50%) rotate(45deg); background:var(--gold-bright); box-shadow:0 0 10px rgba(232,201,106,.6); }

    .km-lens .leaf::after { content:""; position:absolute; inset:8px; pointer-events:none; opacity:.6;
      background:
        linear-gradient(var(--gold),var(--gold)) left 0 top 0/14px 1px no-repeat,
        linear-gradient(var(--gold),var(--gold)) left 0 top 0/1px 14px no-repeat,
        linear-gradient(var(--gold),var(--gold)) right 0 top 0/14px 1px no-repeat,
        linear-gradient(var(--gold),var(--gold)) right 0 top 0/1px 14px no-repeat,
        linear-gradient(var(--gold),var(--gold)) left 0 bottom 0/14px 1px no-repeat,
        linear-gradient(var(--gold),var(--gold)) left 0 bottom 0/1px 14px no-repeat,
        linear-gradient(var(--gold),var(--gold)) right 0 bottom 0/14px 1px no-repeat,
        linear-gradient(var(--gold),var(--gold)) right 0 bottom 0/1px 14px no-repeat; }

    .km-lens .senses { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
    .km-lens .sense-chip { display:flex; flex-direction:column; align-items:center; gap:2px; border:1px solid var(--hair); border-radius:10px; padding:8px 12px; background:rgba(17,17,17,.5); transition:border-color .2s, transform .2s; }
    .km-lens .sense-chip:hover { border-color:rgba(232,201,106,.45); transform:translateY(-1px); }
    .km-lens .sense-ar { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.3rem; line-height:1.2; }
    .km-lens .sense-en { font-family:var(--body); font-style:italic; color:var(--parch-mute); font-size:.82rem; }

    .km-lens .occ-summary { font-family:var(--body); font-style:italic; text-align:center; color:var(--muted); margin:-6px 0 14px; font-size:.9rem; }
    .km-lens .chip { transition:background .2s, border-color .2s, transform .2s, color .2s; }
    .km-lens .chip:hover { border-color:rgba(232,201,106,.45); transform:translateY(-1px); }
    .km-lens .src-item { transition:color .2s, letter-spacing .2s; }
    .km-lens .src-item:hover { color:var(--gold-bright); letter-spacing:.02em; }

    .km-lens .km-illum { position:relative; width:64px; height:64px; }
    .km-lens .km-illum-ring { position:absolute; inset:0; border-radius:50%; border:2px solid transparent; border-top-color:var(--gold-bright); border-right-color:var(--gold-deep); animation:km-spin 1.1s linear infinite; box-shadow:0 0 18px -6px rgba(232,201,106,.6); }
    .km-lens .km-illum-core { position:absolute; left:50%; top:50%; width:12px; height:12px; transform:translate(-50%,-50%) rotate(45deg); background:var(--gold-bright); box-shadow:0 0 14px rgba(232,201,106,.7); animation:km-pulse 1.4s ease-in-out infinite; }
    .km-lens .km-loading-text { font-family:var(--disp); font-size:.66rem; letter-spacing:.28em; text-transform:uppercase; color:var(--gold-deep); }

    @keyframes km-spin { to { transform:rotate(360deg); } }
    @keyframes km-pulse { 0%,100%{opacity:.55;} 50%{opacity:1;} }

    @media (prefers-reduced-motion:reduce){
      .km-lens .leaf > *, .km-lens .km-illum-ring, .km-lens .km-illum-core { animation:none !important; }
    }

    /* — memory hook (vocabulary retention) — */
    .km-lens .feature { border-left:3px solid var(--gold); padding:2px 0 2px 18px; margin:14px 0 6px; }
    .km-lens .feature-tag { display:inline-block; font-family:var(--disp); font-size:.56rem; letter-spacing:.26em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:8px; }
    .km-lens .hook-line { font-size:1.05rem; color:var(--parch); margin:6px 0 14px; }
    .km-lens .hook-line strong { color:var(--gold-bright); font-weight:700; }
    .km-lens .hook-line em { font-style:italic; color:var(--gold); }
    .km-lens .anchors { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .km-lens .anchor { display:inline-flex; align-items:baseline; gap:7px; border:1px solid var(--hair); border-radius:20px; padding:5px 12px; background:rgba(8,8,8,.45); }
    .km-lens .anchor b { font-family:var(--body); color:var(--gold-bright); font-size:.95rem; font-variant:small-caps; letter-spacing:.04em; }
    .km-lens .anchor span { font-family:var(--body); font-style:italic; color:var(--muted); font-size:.82rem; }
    .km-lens .contrast { font-style:italic; color:var(--parch-mute); margin:4px 0 8px; padding-left:12px; border-left:1px solid var(--hair); }
    .km-lens .retrieval { font-style:italic; color:var(--muted); font-size:.92rem; margin:0; }

    /* — derivation / sarf table — */
    .km-lens .forms-note { text-align:center; font-style:italic; color:var(--parch-mute); margin:0 0 14px; font-size:.95rem; }
    .km-lens .forms { border-top:1px solid var(--hair); }
    .km-lens .forms-head, .km-lens .forms-row { display:grid; grid-template-columns:72px 1fr 1fr 1.1fr; gap:6px 12px; padding:11px 14px; align-items:baseline; }
    .km-lens .forms-head { background:rgba(143,109,47,.12); border-bottom:1px solid var(--hair); }
    .km-lens .forms-head > span { font-family:var(--disp); font-size:.56rem; letter-spacing:.2em; text-transform:uppercase; color:var(--gold-deep); }
    .km-lens .forms-head .fc-ar { font-family:var(--ar); direction:rtl; font-size:1rem; letter-spacing:normal; text-transform:none; color:var(--gold); }
    .km-lens .forms-row { border-bottom:1px solid rgba(120,98,55,.16); }
    .km-lens .forms-row:last-child { border-bottom:0; }
    .km-lens .fc-form b { font-family:var(--disp); color:var(--gold-bright); font-size:.9rem; }
    .km-lens .fc-form .wazn { display:block; font-family:var(--ar); direction:rtl; color:var(--muted); font-size:.95rem; }
    .km-lens .fc-ar { font-family:var(--ar); direction:rtl; font-size:1.45rem; color:var(--parch); }
    .km-lens .fc-ar.masdar { color:var(--gold-bright); }
    .km-lens .fc-gloss { grid-column:1 / -1; font-style:italic; color:var(--muted); font-size:.85rem; margin-top:-2px; }
    .km-lens .keyword-pin { display:flex; align-items:center; gap:14px; justify-content:center; flex-wrap:wrap; margin-top:14px; padding:12px; border:1px dashed var(--hair); border-radius:8px; }
    .km-lens .kw-word { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:2rem; }
    .km-lens .kw-meta { font-style:italic; color:var(--parch-mute); font-size:.9rem; }
    @media (max-width:560px){ .km-lens .forms-head, .km-lens .forms-row { grid-template-columns:58px 1fr 1fr 1fr; } .km-lens .fc-ar { font-size:1.2rem; } }

    /* — word constellation (root family graph) — */
    .km-lens .constellation-fig { text-align:center; margin:8px 0 2px; }
    .km-lens .constellation-fig svg { width:100%; max-width:340px; height:auto; overflow:visible; }
    .km-lens .cn-line { stroke:rgba(143,109,47,.32); stroke-width:1; }
    .km-lens .cn-hub { fill:url(#cnHub); stroke:rgba(232,201,106,.55); stroke-width:1; }
    .km-lens .cn-hub-text { font-family:var(--ar); fill:#080808; font-size:15px; font-weight:700; }
    .km-lens .cn-node { fill:var(--gold-deep); }
    .km-lens .cn-node.q { fill:var(--gold-bright); }
    .km-lens .cn-label { font-family:var(--ar); fill:var(--parch-mute); font-size:11px; }
    .km-lens .cn-label.q { fill:var(--gold-bright); }

    /* — Qur'anic morphology readout — */
    .km-lens .morph { border-top:1px solid var(--hair); }
    .km-lens .morph-row { display:grid; grid-template-columns:auto 1.4fr 3fr; gap:10px; align-items:baseline; padding:9px 14px; border-bottom:1px solid rgba(120,98,55,.16); }
    .km-lens .morph-row:last-child { border-bottom:0; }
    .km-lens .morph-row.here { background:rgba(232,201,106,.07); }
    .km-lens .morph-word { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.35rem; }
    .km-lens .morph-tag { font-family:var(--body); font-style:italic; color:var(--parch-mute); font-size:.86rem; }
    @media (max-width:560px){ .km-lens .morph-row { grid-template-columns:auto 1fr; } .km-lens .morph-tag { grid-column:1 / -1; margin-top:-4px; } }

    /* — in-context examples — */
    .km-lens .examples { display:flex; flex-direction:column; gap:12px; }
    .km-lens .ex-card { border-left:2px solid var(--hair); padding:2px 0 2px 14px; }
    .km-lens .ex-card.here { border-left-color:var(--gold-bright); }
    .km-lens .ex-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
    .km-lens .ex-word { font-family:var(--ar); direction:rtl; color:var(--gold-bright); font-size:1.5rem; }
    .km-lens .ex-text { font-family:var(--body); color:var(--parch); margin:0; font-size:.98rem; }
    .km-lens .ex-src { font-family:var(--disp); font-size:.56rem; letter-spacing:.18em; text-transform:uppercase; color:var(--gold-deep); margin:6px 0 0; }

    /* — from the lexica (real dictionary excerpts) — */
    .km-lens .lexica { display:flex; flex-direction:column; gap:12px; }
    .km-lens .lex-card { border-left:2px solid var(--hair); padding:2px 0 2px 14px; }
    .km-lens .lex-src { display:block; font-family:var(--disp); font-size:.56rem; letter-spacing:.22em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:6px; }
    .km-lens .lex-text { margin:0; color:var(--parch-mute); font-size:.95rem; line-height:1.55; font-style:italic; }
    .km-lens .lex-text.ar { font-family:var(--ar); font-style:normal; font-size:1.25rem; line-height:1.95; color:var(--parch); }

    @media (max-width:560px){ .km-lens .src-grid { grid-template-columns:1fr; gap:18px; } }
    @keyframes km-rise { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
    @media (prefers-reduced-motion:reduce){ .km-lens .lemma{animation:none;} }
  `],
})
export class LensModalComponent implements OnInit {
  @Input() root!: string;
  @Input() word?: QuranWord;

  private readonly lexicon = inject(FiveLensLexiconService);
  private readonly qrWords = inject(QrWordStudyService);
  private readonly modalCtrl = inject(ModalController);

  loading = true;
  entry?: FiveLensEntry;
  qrMorph: QrMorphOccurrence[] = [];
  qrExamples: QrExample[] = [];
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
    tabari: 'al-Ṭabarī',
    zamakhshari: 'al-Zamakhsharī',
    ibn_atiyya: 'Ibn ʿAṭiyya',
    razi: 'al-Rāzī',
    ibn_kathir: 'Ibn Kathīr',
    abu_hayyan: 'Abū Ḥayyān',
    alusi: 'al-Ālūsī',
    ibn_ashur: 'Ibn ʿĀshūr',
  };

  ngOnInit(): void {
    this.currentRef = this.word ? `${this.word.surah}:${this.word.ayah}` : '';
    this.lexicon.getFiveLens(this.root).subscribe((e) => {
      this.entry = e;
      if (e.found) {
        this.sourceGroups = Object.entries(e.sources ?? {}).map(([kind, items]) => ({
          kind: this.humanizeKind(kind),
          items,
        }));
      }
      this.loading = false;
    });

    // Live Qur'anic morphology for every occurrence of this root (km_quran).
    const root = (this.word?.root ?? this.root ?? '').trim();
    if (root) {
      this.qrWords.getMorphologyByRoot(root).subscribe((rows) => {
        this.qrMorph = rows;
        const items = this.pickExamples(rows);
        if (items.length) {
          this.qrWords.getExamples(items).subscribe((ex) => (this.qrExamples = ex));
        }
      });
    }
  }

  /** One representative occurrence per distinct lemma (so the examples span the
   *  word's forms rather than repeating one), capped to keep the panel tight. */
  private pickExamples(rows: QrMorphOccurrence[]): { surah: number; ayah: number; wordAr: string }[] {
    const seen = new Set<string>();
    const out: { surah: number; ayah: number; wordAr: string }[] = [];
    for (const r of rows) {
      const key = r.lemmaAr ?? r.ref;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ surah: r.surah, ayah: r.ayah, wordAr: r.wordAr });
      if (out.length >= 4) break;
    }
    return out;
  }

  /** The vocalized lemma for the headline; falls back to the tapped word. */
  lemma(): string {
    return (this.entry?.entry?.lemmaAr ?? this.word?.text ?? '').trim();
  }

  /** Prefer the Arabic surah name; fall back to the Latin one from data_json. */
  surahLabel(): string {
    return (this.entry?.entry?.surahNameAr ?? this.entry?.ayah?.surahName ?? '').trim();
  }

  /** Radial layout for the word-constellation graph: places each derived lemma
   *  on one of two rings around the central root hub. Returns dot + label
   *  coordinates so the template can draw the SVG declaratively. */
  constellationLayout(): {
    root: string;
    nodes: { ar: string; isQuran: boolean; x: number; y: number; lx: number; ly: number }[];
  } | null {
    const cn = this.entry?.constellation;
    if (!cn?.nodes?.length) return null;
    const cx = 160;
    const cy = 160;
    const n = cn.nodes.length;
    const nodes = cn.nodes.map((node, i) => {
      const ang = ((-90 + i * (360 / n)) * Math.PI) / 180;
      const r = i % 2 === 0 ? 92 : 120;
      const lr = r + 15;
      return {
        ar: node.ar,
        isQuran: node.isQuran,
        x: +(cx + r * Math.cos(ang)).toFixed(1),
        y: +(cy + r * Math.sin(ang)).toFixed(1),
        lx: +(cx + lr * Math.cos(ang)).toFixed(1),
        ly: +(cy + lr * Math.sin(ang)).toFixed(1),
      };
    });
    return { root: cn.root, nodes };
  }

  /** Total distinct cross-corpus occurrences across all forms/families. */
  occurrenceCount(): number {
    const fams = this.entry?.occurrences?.families ?? [];
    if (fams.length) {
      const set = new Set<string>();
      for (const f of fams) for (const r of f.refs ?? []) set.add(r);
      return set.size;
    }
    return this.entry?.occurrences?.refs?.length ?? 0;
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
