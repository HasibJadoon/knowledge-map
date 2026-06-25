import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { FusedWordVM } from './fused-word.models';

/**
 * Fused word lens — Membean's multi-panel pedagogy rendered in the k-maps
 * illuminated (gold-on-black) aesthetic. Purely presentational: bind a
 * FusedWordVM (assembled by FusedWordFacade) and it renders every panel that
 * has data; empty panels are hidden, Sinai shows "pending" when unfilled.
 */
@Component({
  selector: 'app-fused-word-lens',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div class="fw" *ngIf="vm() as v">
    <!-- header (POS · level · IKT · Next) -->
    <div class="fw-top">
      <div class="fw-badges"><span class="fw-badge">{{ v.pos }}</span><span class="fw-badge">{{ v.level }}</span></div>
      <div class="fw-hw"><span class="fw-w" dir="rtl" lang="ar">{{ v.lemmaAr }}</span>
        <label class="fw-ikt"><input type="checkbox" (change)="iKnow.emit($any($event.target).checked)"> <span dir="rtl" lang="ar">أعرفها</span> · IKT</label></div>
      <div class="fw-cta"><button class="fw-done" (click)="done.emit()">تمّ</button>
        <button class="fw-next" (click)="next.emit()">Next ▸</button></div>
    </div>

    <!-- hero -->
    <div class="fw-hero">
      <p class="eyebrow">Key Term · Five-Lens × Membean</p>
      <h1 class="lemma" dir="rtl" lang="ar">{{ v.lemmaAr }}</h1>
      <p class="translit" *ngIf="v.translit">{{ v.translit }}</p>
      <p class="hsense" *ngIf="v.sense">{{ v.sense }}</p>
      <div class="meta">
        <span>root <span class="ar" dir="rtl" lang="ar">{{ v.rootSpaced }}</span></span>
        <ng-container *ngIf="v.pattern"><span class="dot">·</span><span>pattern <span class="ar" dir="rtl" lang="ar">{{ v.pattern }}</span></span></ng-container>
        <span class="dot">·</span><span>{{ v.ref }}</span>
        <ng-container *ngIf="v.surahNameAr"><span class="dot">·</span><span class="ar" dir="rtl" lang="ar">{{ v.surahNameAr }}</span></ng-container>
      </div>
      <div class="ayah" *ngIf="v.ayahAr">
        <p class="a" dir="rtl" lang="ar">{{ v.ayahAr }}</p>
        <p class="e" *ngIf="v.ayahEn">{{ v.ayahEn }}</p>
      </div>
    </div>
    <div class="brk"></div>

    <div class="grid">
      <!-- MAIN -->
      <div class="col">
        <section class="panel" *ngIf="v.senses.length">
          <div class="phead"><span class="t">Core · Range</span><span class="ta" dir="rtl" lang="ar">المعاني</span></div>
          <div class="pbody"><div class="senses">
            <div class="schip" *ngFor="let s of v.senses"><span class="a" dir="rtl" lang="ar">{{ s.ar }}</span><span class="e">{{ s.en }}</span><span class="r" *ngIf="s.ref">{{ s.ref }}</span></div>
          </div></div>
        </section>

        <section class="panel" *ngIf="v.examples.length">
          <div class="phead"><span class="t">Examples · unique senses</span><span class="ta" dir="rtl" lang="ar">شواهد</span></div>
          <div class="pbody">
            <div class="exq" *ngFor="let x of v.examples">
              <p class="a" dir="rtl" lang="ar">{{ x.ar }}</p><p class="t">{{ x.en }}</p>
              <p class="m"><span class="se" *ngIf="x.sense">{{ x.sense }}</span> {{ x.ref }}</p>
            </div>
          </div>
        </section>

        <section class="panel" *ngIf="v.hook">
          <div class="phead"><span class="t">Memory Hook</span><span class="ta" dir="rtl" lang="ar">الخُطّاف</span></div>
          <div class="pbody">
            <figure class="mh-illus" *ngIf="v.hook.figureSvg" [innerHTML]="safe(v.hook.figureSvg)"></figure>
            <p class="hook" [innerHTML]="safe(v.hook.line)"></p>
            <div class="anchors"><span class="anchor" *ngFor="let a of v.hook.anchors"><b>{{ a.en }}</b><span>{{ a.note }}</span></span></div>
          </div>
        </section>

        <section class="panel" *ngIf="v.verbGovernment.length">
          <div class="phead"><span class="t">Verb · Government</span><span class="ta" dir="rtl" lang="ar">تعدية الفعل</span></div>
          <div class="pbody"><div class="tbl">
            <div class="trow gov thead"><span>verb</span><span>type</span><span>+ḥarf</span><span>meaning</span></div>
            <div class="trow gov" *ngFor="let g of v.verbGovernment">
              <span class="av" dir="rtl" lang="ar">{{ g.verbAr }}</span>
              <span class="type" [class.t]="g.transitivity==='mutaaddi'" [class.i]="g.transitivity==='lazim'">{{ g.transitivity==='mutaaddi' ? 'mutaʿaddin' : 'lāzim' }}</span>
              <span class="harf" dir="rtl" lang="ar">{{ g.harf || '—' }}</span>
              <span class="tg">{{ g.meaningEn }}</span>
            </div>
          </div></div>
        </section>

        <section class="panel" *ngIf="v.sarf.length">
          <div class="phead"><span class="t">Ṣarf · Derivation</span><span class="ta" dir="rtl" lang="ar">الصَّرْف</span></div>
          <div class="pbody"><div class="tbl">
            <div class="trow sarf thead"><span>Form</span><span class="harf" dir="rtl" lang="ar">ماضٍ</span><span class="harf" dir="rtl" lang="ar">مضارع</span><span class="harf" dir="rtl" lang="ar">مصدر</span></div>
            <div class="trow sarf" *ngFor="let f of v.sarf">
              <span class="fm"><b>{{ f.form }}</b><span class="wz" dir="rtl" lang="ar">{{ f.wazn }}</span></span>
              <span class="fc" dir="rtl" lang="ar">{{ f.past }}</span><span class="fc" dir="rtl" lang="ar">{{ f.present }}</span><span class="fc m" dir="rtl" lang="ar">{{ f.masdar }}</span>
            </div>
          </div></div>
        </section>

        <section class="panel" *ngIf="v.tafsir.length">
          <div class="phead"><span class="t">The Tafsīrs · {{ v.tafsir.length }}</span><span class="ta" dir="rtl" lang="ar">التفاسير</span></div>
          <div class="pbody"><div class="rowlist">
            <div class="taf" *ngFor="let t of v.tafsir"><span class="n">{{ t.name }}</span><span class="g">{{ t.gloss }}</span></div>
          </div></div>
        </section>

        <section class="panel" *ngIf="v.lexica.length">
          <div class="phead"><span class="t">From the Lexica · {{ v.lexica.length }}</span><span class="ta" dir="rtl" lang="ar">المعاجم</span></div>
          <div class="pbody"><div class="rowlist">
            <div class="lex" *ngFor="let l of v.lexica">
              <span class="s">{{ l.source }}</span>
              <p class="a" *ngIf="l.ar" dir="rtl" lang="ar">{{ l.ar }}</p>
              <p class="e" *ngIf="l.en">{{ l.en }}</p>
            </div>
          </div></div>
        </section>
      </div>

      <!-- SIDEBAR -->
      <div class="col">
        <section class="panel" *ngIf="v.ingredients">
          <div class="phead"><span class="t">Word Ingredients</span><span class="ta" dir="rtl" lang="ar">المُكوّنات</span></div>
          <div class="pbody"><div class="ing">
            <div class="tile"><div class="m" dir="rtl" lang="ar">{{ v.ingredients.rootAr }}</div><div class="g">{{ v.ingredients.rootGloss }}</div></div>
            <span class="plus">＋</span>
            <div class="tile"><div class="m" dir="rtl" lang="ar">{{ v.ingredients.patternAr }}</div><div class="g">{{ v.ingredients.patternGloss }}</div></div>
          </div><p class="ing-syn" dir="rtl" lang="ar">{{ v.ingredients.synthesisAr }}</p></div>
        </section>

        <section class="panel" *ngIf="constellation() as c">
          <div class="phead"><span class="t">Word Constellation</span><span class="ta" dir="rtl" lang="ar">الأسرة</span></div>
          <div class="pbody"><figure class="cfig"><svg viewBox="0 0 300 300">
            <defs><radialGradient id="fwHub" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#f4dd9e"/><stop offset="60%" stop-color="#c9a24b"/><stop offset="100%" stop-color="#8f6d2f"/></radialGradient></defs>
            <line *ngFor="let n of c.nodes" x1="150" y1="150" [attr.x2]="n.x" [attr.y2]="n.y" stroke="rgba(143,109,47,.3)"/>
            <circle cx="150" cy="150" r="22" fill="url(#fwHub)" stroke="rgba(232,201,106,.55)"/>
            <text x="150" y="155" text-anchor="middle" font-family="Amiri,serif" font-size="14" font-weight="700" fill="#080808" dir="rtl">{{ c.root }}</text>
            <g *ngFor="let n of c.nodes"><circle [attr.cx]="n.x" [attr.cy]="n.y" r="3" [attr.fill]="n.isQuran ? '#e8c96a' : '#9e7c3c'"/>
              <text [attr.x]="n.lx" [attr.y]="n.ly" text-anchor="middle" font-family="Amiri,serif" font-size="11.5" [attr.fill]="n.isQuran ? '#e8c96a' : '#9e7c3c'" dir="rtl">{{ n.ar }}</text></g>
          </svg></figure></div>
        </section>

        <section class="panel" *ngIf="v.nearSynonyms.length || v.antonyms.length">
          <div class="phead"><span class="t">Related Words</span><span class="ta" dir="rtl" lang="ar">ذات صلة</span></div>
          <div class="pbody">
            <div class="chips" *ngIf="v.nearSynonyms.length"><span class="chip" *ngFor="let s of v.nearSynonyms" dir="rtl" lang="ar">{{ s }}</span></div>
            <div class="chips" *ngIf="v.antonyms.length" style="margin-top:10px"><span class="chip ant" *ngFor="let a of v.antonyms" dir="rtl" lang="ar">{{ a.ar }}</span></div>
            <div class="legend"><span><i style="background:var(--fw-gold)"></i>Near-synonym</span><span><i style="background:#9a2b2b"></i>Antonym</span></div>
          </div>
        </section>

        <section class="panel" *ngIf="v.idioms.length">
          <div class="phead"><span class="t">Verbal Idioms · Mir</span><span class="ta" dir="rtl" lang="ar">التعابير</span></div>
          <div class="pbody"><div class="card" *ngFor="let i of v.idioms"><span class="s">{{ i.sourceLabel }}</span><div class="p" dir="rtl" lang="ar">{{ i.phraseAr }}</div><p class="ce">{{ i.en }}</p></div></div>
        </section>

        <section class="panel" *ngIf="v.sinai">
          <div class="phead"><span class="t">Sinai · Key Term</span><span class="ta" dir="rtl" lang="ar">سيناء</span></div>
          <div class="pbody"><p class="ce" *ngIf="!v.sinai.pending">{{ v.sinai.text }}</p><p class="pending" *ngIf="v.sinai.pending">Sinai source registered · entry pending ingestion</p></div>
        </section>

        <section class="panel variants" *ngIf="v.variants.length">
          <div class="phead"><span class="t">Word Variants</span><span class="ta" dir="rtl" lang="ar">المشتقّات</span></div>
          <div class="pbody"><div class="v" *ngFor="let w of v.variants"><span class="w" dir="rtl" lang="ar">{{ w.ar }}</span><span class="p">{{ w.pos }}</span><span class="g">{{ w.gloss }}</span></div></div>
        </section>

        <section class="panel" *ngIf="v.occurrences.length">
          <div class="phead"><span class="t">Across the Qurʾān</span><span class="ta" dir="rtl" lang="ar">المواضع</span></div>
          <div class="pbody"><div class="chips"><span class="chip r" *ngFor="let r of v.occurrences" [class.here]="r===v.currentRef">{{ r }}</span></div></div>
        </section>
      </div>
    </div>
  </div>
  `,
  styles: [`
  .fw{--gold:#c9a84c;--gold-bright:#e8c96a;--gold-deep:#9e7c3c;--fw-gold:#c9a84c;
   --parch:rgba(255,255,255,.92);--parch-mute:rgba(255,255,255,.66);--muted:rgba(255,255,255,.4);
   --hair:rgba(201,168,76,.18);--hair-soft:rgba(201,168,76,.08);
   --ar:'Amiri',serif;--disp:'Cinzel',serif;--body:'EB Garamond',serif;--tl:'Gentium Plus',serif;
   font-family:var(--body);color:var(--parch);background:radial-gradient(130% 90% at 50% -10%,#1a1a1a,#080808 58%),#060606;padding-bottom:50px}
  .fw .ar{font-family:var(--ar);direction:rtl}
  .fw-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:16px;padding:12px 22px;background:linear-gradient(180deg,rgba(10,10,10,.96),rgba(10,10,10,.78));border-bottom:1px solid var(--hair)}
  .fw-badges{display:flex;flex-direction:column;gap:6px}
  .fw-badge{font-family:var(--disp);font-size:.54rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep);border:1px solid var(--hair);border-radius:5px;padding:4px 9px;text-align:center;white-space:nowrap}
  .fw-hw{display:flex;align-items:center;gap:10px}.fw-w{font-family:var(--ar);font-size:2.1rem;color:var(--gold-bright);line-height:1}
  .fw-ikt{display:flex;gap:6px;align-items:center;font-family:var(--disp);font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .fw-cta{margin-inline-start:auto;display:flex;gap:10px}
  .fw-done{font-family:var(--disp);font-size:.56rem;letter-spacing:.16em;text-transform:uppercase;color:var(--parch-mute);background:transparent;border:1px solid var(--hair);border-radius:6px;padding:9px 14px;cursor:pointer}
  .fw-next{font-family:var(--disp);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:#080808;background:linear-gradient(180deg,#f4dd9e,#c9a24b);border:1px solid var(--gold-deep);border-radius:7px;padding:11px 26px;cursor:pointer;font-weight:600}
  .fw-hero{max-width:1320px;margin:0 auto;text-align:center;padding:40px 16px 12px;position:relative;overflow:hidden}
  .fw-hero::before{content:"";position:absolute;left:50%;top:24px;width:min(440px,82%);height:300px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(232,201,106,.13),transparent 70%);z-index:0}
  .fw-hero>*{position:relative;z-index:1}
  .fw .eyebrow{font-family:var(--disp);font-size:.6rem;letter-spacing:.42em;text-transform:uppercase;color:var(--gold-deep);margin:0 0 12px}
  .fw .lemma{font-family:var(--ar);font-size:clamp(3.2rem,12vw,5rem);line-height:1;font-weight:700;color:var(--gold-bright);margin:0;direction:rtl;text-shadow:0 2px 30px rgba(232,201,106,.2)}
  .fw .translit{font-family:var(--tl);font-style:italic;font-size:1.3rem;margin:.3em 0 .1em}
  .fw .hsense{font-style:italic;color:var(--parch-mute);margin:0 0 12px}
  .fw .meta{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;font-family:var(--disp);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .fw .meta .ar{font-family:var(--ar);font-size:1rem;letter-spacing:0;color:var(--gold);text-transform:none}.fw .meta .dot{color:var(--gold-deep)}
  .fw .ayah{margin:18px auto 0;max-width:680px;border:1px solid var(--hair-soft);border-radius:12px;padding:16px 22px;background:linear-gradient(180deg,rgba(232,201,106,.05),rgba(8,8,8,.28))}
  .fw .ayah .a{font-family:var(--ar);direction:rtl;font-size:clamp(1.5rem,4.4vw,2rem);line-height:2;margin:0 0 8px}
  .fw .ayah .e{font-style:italic;color:var(--parch-mute)}
  .fw .brk{height:1px;max-width:680px;margin:30px auto;background:linear-gradient(90deg,transparent,var(--gold-deep),transparent)}
  .fw .grid{max-width:1320px;margin:0 auto;display:grid;grid-template-columns:1.5fr 1fr;gap:26px;align-items:start;padding:0 26px}
  @media(max-width:900px){.fw .grid{grid-template-columns:1fr}}
  .fw .col{display:flex;flex-direction:column;gap:22px}
  .fw .panel{background:linear-gradient(180deg,rgba(26,26,26,.55),rgba(8,8,8,.5));border:1px solid var(--hair);border-radius:10px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(232,201,106,.06),0 16px 34px -28px #000}
  .fw .phead{position:relative;display:flex;align-items:center;gap:10px;padding:13px 19px;border-bottom:1px solid var(--hair);background:linear-gradient(180deg,rgba(201,168,76,.1),transparent)}
  .fw .phead::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:linear-gradient(var(--gold-bright),var(--gold-deep))}
  .fw .phead .t{font-family:var(--disp);font-size:.58rem;letter-spacing:.26em;text-transform:uppercase;color:var(--gold)}
  .fw .phead .ta{font-family:var(--ar);color:var(--gold);font-size:1.05rem;margin-inline-start:auto}
  .fw .pbody{padding:22px 21px}
  .fw .senses{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
  .fw .schip{display:flex;flex-direction:column;align-items:center;gap:1px;border:1px solid var(--hair);border-radius:9px;padding:10px 15px;background:rgba(17,17,17,.45)}
  .fw .schip .a{font-family:var(--ar);color:var(--gold-bright);font-size:1.2rem}.fw .schip .e{font-style:italic;color:var(--parch-mute);font-size:.78rem}.fw .schip .r{font-family:var(--disp);font-size:.5rem;color:var(--gold-deep)}
  .fw .exq{padding:17px 4px;border-bottom:1px dashed rgba(120,98,55,.22)}.fw .exq:last-child{border:0}
  .fw .exq .a{font-family:var(--ar);direction:rtl;font-size:1.4rem;line-height:2.05;margin:0 0 5px}.fw .exq .t{font-style:italic;color:var(--parch-mute);font-size:.95rem;margin:0 0 6px}
  .fw .exq .m{font-family:var(--disp);font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-deep)}.fw .exq .m .se{color:var(--gold);border:1px solid var(--hair);border-radius:10px;padding:2px 9px;margin-inline-end:6px}
  .fw .mh-illus svg{width:100%;max-width:300px;height:auto;display:block;margin:0 auto 12px}
  .fw .hook{font-size:1rem;line-height:1.6}.fw .hook em,.fw .hook strong{color:var(--gold);font-style:normal}
  .fw .anchors{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.fw .anchor{display:inline-flex;gap:6px;align-items:baseline;border:1px solid var(--hair);border-radius:18px;padding:4px 11px}
  .fw .anchor b{font-variant:small-caps;color:var(--gold-bright)}.fw .anchor span{font-style:italic;color:var(--muted);font-size:.78rem}
  .fw .tbl{border-top:1px solid var(--hair)}
  .fw .trow{display:grid;gap:10px 14px;padding:14px 6px;border-bottom:1px solid rgba(120,98,55,.16);align-items:center}.fw .trow:last-child{border:0}
  .fw .thead{background:rgba(143,109,47,.1)}.fw .thead span{font-family:var(--disp);font-size:.52rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-deep)}
  .fw .gov{grid-template-columns:1fr .8fr .6fr 1.6fr}.fw .sarf{grid-template-columns:54px 1fr 1fr 1.3fr}
  .fw .av{font-family:var(--ar);direction:rtl;color:var(--gold-bright);font-size:1.3rem}.fw .harf{font-family:var(--ar);direction:rtl;color:var(--gold);font-size:1.15rem}
  .fw .type{font-style:italic;font-size:.78rem}.fw .type.t{color:var(--gold)}.fw .type.i{color:var(--parch-mute)}.fw .tg{font-style:italic;color:var(--parch-mute);font-size:.86rem}
  .fw .fc{font-family:var(--ar);direction:rtl;font-size:1.25rem}.fw .fc.m{color:var(--gold-bright)}.fw .fm b{font-family:var(--disp);color:var(--gold-bright);font-size:.8rem}.fw .fm .wz{display:block;font-family:var(--ar);direction:rtl;color:var(--muted);font-size:.85rem}
  .fw .rowlist .taf{display:grid;grid-template-columns:118px 1fr;gap:16px;align-items:baseline;padding:14px 4px;border-bottom:1px solid rgba(120,98,55,.18)}.fw .rowlist .taf:last-child{border:0}
  .fw .taf .n{font-variant:small-caps;color:var(--gold);font-size:.92rem}.fw .taf .g{color:var(--parch-mute);font-size:.92rem;line-height:1.55}
  .fw .lex{padding:16px 6px;border-bottom:1px solid rgba(120,98,55,.18)}.fw .lex:last-child{border:0}
  .fw .lex .s{display:block;font-family:var(--disp);font-size:.5rem;letter-spacing:.15em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:9px}
  .fw .lex .a{font-family:var(--ar);direction:rtl;font-size:1.12rem;line-height:1.95;text-align:right;margin:0 0 7px}.fw .lex .e{font-style:italic;color:var(--parch-mute);font-size:.8rem;line-height:1.55;margin:0}
  .fw .ing{display:flex;align-items:center;justify-content:center;gap:15px;flex-wrap:wrap}.fw .ing .plus{color:var(--gold-deep)}
  .fw .tile{border:1px solid var(--hair);border-radius:9px;background:rgba(17,17,17,.5);padding:8px 14px;text-align:center}.fw .tile .m{font-family:var(--ar);color:var(--gold-bright);font-size:1.4rem}.fw .tile .g{font-style:italic;color:var(--muted);font-size:.74rem}
  .fw .ing-syn{font-family:var(--ar);direction:rtl;text-align:center;font-size:1.25rem;margin:14px 0 0}
  .fw .cfig svg{width:100%;max-width:300px;height:auto;display:block;margin:0 auto;overflow:visible}
  .fw .chips{display:flex;gap:11px;flex-wrap:wrap;justify-content:center}
  .fw .chip{font-family:var(--ar);direction:rtl;font-size:1.1rem;color:var(--gold);border:1px solid var(--hair);border-radius:18px;padding:6px 15px;background:rgba(17,17,17,.4)}
  .fw .chip.ant{color:var(--parch-mute);border-color:rgba(154,43,43,.4)}.fw .chip.r{font-family:var(--disp);font-size:.7rem;border-radius:3px;padding:4px 8px}.fw .chip.r.here{background:rgba(232,201,106,.14);color:var(--gold-bright)}
  .fw .legend{display:flex;gap:16px;justify-content:center;font-size:.78rem;color:var(--muted);margin-top:10px}.fw .legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-inline-end:5px}
  .fw .card{border-left:2px solid var(--hair);padding:1px 0 1px 15px;margin:13px 0}.fw .card .s{display:block;font-family:var(--disp);font-size:.52rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:4px}
  .fw .card .p{font-family:var(--ar);direction:rtl;color:var(--gold-bright);font-size:1.35rem}.fw .card .ce{font-style:italic;color:var(--muted);font-size:.86rem;margin:3px 0 0}
  .fw .ce{color:var(--parch-mute);font-size:.94rem;line-height:1.55}.fw .pending{font-style:italic;color:var(--muted);font-size:.82rem;text-align:center}
  .fw .variants .v{display:flex;gap:8px;align-items:baseline;padding:10px 0;border-bottom:1px solid rgba(120,98,55,.14)}.fw .variants .v:last-child{border:0}
  .fw .variants .v .w{font-family:var(--ar);color:var(--gold-bright);font-size:1.3rem}.fw .variants .v .p{font-family:var(--disp);font-size:.5rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-deep)}.fw .variants .v .g{font-style:italic;color:var(--parch-mute);font-size:.86rem;margin-inline-start:auto}
  `],
})
export class FusedWordLensComponent {
  private readonly sanitizer = inject(DomSanitizer);

  private readonly _vm = signal<FusedWordVM | null>(null);
  @Input() set wordVm(v: FusedWordVM | null) {
    this._vm.set(v);
  }
  readonly vm = this._vm.asReadonly();

  @Output() next = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();
  @Output() iKnow = new EventEmitter<boolean>();

  /** Radial layout for the constellation: two rings around the root hub. */
  readonly constellation = computed(() => {
    const c = this._vm()?.constellation;
    if (!c?.nodes?.length) return null;
    const cx = 150,
      cy = 150,
      n = c.nodes.length;
    const nodes = c.nodes.map((node, i) => {
      const ang = ((-90 + i * (360 / n)) * Math.PI) / 180;
      const r = i % 2 === 0 ? 92 : 118;
      const lr = r + 18;
      return {
        ...node,
        x: +(cx + r * Math.cos(ang)).toFixed(1),
        y: +(cy + r * Math.sin(ang)).toFixed(1),
        lx: +(cx + lr * Math.cos(ang)).toFixed(1),
        ly: +(cy + lr * Math.sin(ang)).toFixed(1),
      };
    });
    return { root: c.root, nodes };
  });

  safe(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
