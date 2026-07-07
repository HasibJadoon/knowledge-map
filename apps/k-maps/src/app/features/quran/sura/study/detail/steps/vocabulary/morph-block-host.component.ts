import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, Type, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockVm, Lang } from '../../../../../../../shared/services/quran/quran-surah.service';
import { MorphBlockBody } from './morph-block.types';
import { MORPH_BLOCK_REGISTRY } from './morph-block.registry';

interface RegChip { label: string; cls: string; }
const REG_CHIP: Record<string, RegChip> = {
  linguistic: { label: 'Linguistic', cls: 'reg-ling' },
  modern:     { label: 'Modern',     cls: 'reg-modern' },
  tafsir:     { label: 'Tafsīr',     cls: 'reg-tafsir' },
  quran:      { label: 'Qurʾān',     cls: 'reg-quran' },
  classical:  { label: 'Classical',  cls: 'reg-classical' },
  msa:        { label: 'MSA',        cls: 'reg-msa' },
};

/**
 * Shared block CHROME (icon · order · title · registers · collapse · illustration).
 * The body is a per-layer component resolved from the closed registry by `block.type`
 * and rendered via NgComponentOutlet. No layer logic here.
 */
@Component({
  selector: 'km-morph-block-host',
  standalone: true,
  imports: [NgComponentOutlet, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="mb" [attr.data-type]="block.type" [attr.data-tier]="block.tier">
      <header class="mb__head" (click)="toggle()">
        <span class="mb__icon"><lucide-icon [name]="headIcon()" [size]="20"></lucide-icon></span>
        <span class="mb__ord">{{ ord() }}</span>
        <span class="mb__title">{{ titleEn() }}</span>
        @if (block.title.ar) { <span class="mb__title-ar ar">{{ block.title.ar }}</span> }
        <span class="mb__chips">
          @for (rc of regChips(); track rc.label) { <span class="mb__reg" [class]="rc.cls">{{ rc.label }}</span> }
          @if (block.is_synthesis) { <span class="mb__reg reg-kmaps">K-MAPS</span> }
          <span class="mb__chev" [class.closed]="collapsed">▾</span>
        </span>
      </header>

      @if (!collapsed) {
        @if (showIllu()) {
          <div class="mb__illu"><img [src]="block.illustration!.url" [alt]="block.illustration!.alt || titleEn()" loading="lazy" /></div>
        }
        <div class="mb__body">
          @if (cmp(); as c) {
            <ng-container *ngComponentOutlet="c; inputs: bodyInputs()"></ng-container>
          }
        </div>
      }
    </article>
  `,
  styles: `
    :host { display: block; }
    .mb { border: 1px solid var(--edge); border-radius: 12px; background: var(--g2); overflow: hidden; box-shadow: 0 12px 40px -28px #000;
      &__head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 22px; border-bottom: 1px solid var(--edge2); background: linear-gradient(180deg, rgba(255,255,255,.02), transparent); cursor: pointer; user-select: none; }
      &__icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; color: var(--gold2); background: rgba(201,168,76,.08); border: 1px solid var(--golddim); flex: none; }
      &__ord { font: 600 11px/1 var(--head); letter-spacing: .12em; color: var(--gold); border: 1px solid var(--golddim); border-radius: 6px; padding: 6px 8px; }
      &__title { font: 600 15px/1 var(--head); letter-spacing: .11em; text-transform: uppercase; color: var(--ink); }
      &__title-ar { font-family: var(--ar); font-size: 15px; color: var(--muted); }
      &__chips { margin-inline-start: auto; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      &__reg { font: 600 9px/1 var(--mono); letter-spacing: .09em; text-transform: uppercase; padding: 5px 8px; border-radius: 999px; color: var(--gold2); border: 1px solid var(--golddim); background: rgba(201,168,76,.08);
        &.reg-classical { color: var(--indigo2); border-color: #8878e2; background: rgba(136,120,226,.08); }
        &.reg-msa { color: var(--sky); border-color: rgba(147,184,214,.4); background: rgba(147,184,214,.08); }
        &.reg-modern { color: var(--indigo2); border-color: #8878e2; }
        &.reg-tafsir { color: var(--sky); border-color: rgba(147,184,214,.4); }
        &.reg-kmaps { color: var(--indigo2); border-color: #8878e2; } }
      &__chev { font-size: 13px; color: var(--muted); transition: transform .18s; &.closed { transform: rotate(-90deg); } }
      &__body { padding: 20px 22px; }
      &__illu { padding: 16px 22px 0; img { width: 100%; max-height: 320px; object-fit: cover; border-radius: 10px; border: 1px solid var(--edge); display: block; } } }
  `,
})
export class MorphBlockHostComponent implements OnChanges {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: Lang = 'en';
  @Input() heroWord = '';

  collapsed = false;
  toggle(): void { this.collapsed = !this.collapsed; }

  private readonly _cmp = signal<Type<MorphBlockBody> | null>(null);
  readonly cmp = this._cmp.asReadonly();

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['block']) this.resolve();
  }
  private resolve(): void {
    const entry = MORPH_BLOCK_REGISTRY[this.block?.type];
    if (!entry) { this._cmp.set(null); return; }
    if ('cmp' in entry) { this._cmp.set(entry.cmp); return; }
    entry.load().then(c => this._cmp.set(c)).catch(() => this._cmp.set(null));
  }

  bodyInputs(): Record<string, unknown> {
    return { block: this.block, lang: this.lang, heroWord: this.heroWord };
  }

  ord(): string { return String(this.block.order ?? 0).padStart(2, '0'); }
  titleEn(): string { return this.block.title.en || this.block.title.ar || this.block.type; }
  headIcon(): string { return this.block.icon || 'circle'; }
  showIllu(): boolean {
    return !!this.block.illustration?.url && this.block.type !== 'master_story' && this.block.type !== 'synthesis';
  }
  regChips(): RegChip[] {
    const regs = (this.block.registers && this.block.registers.length)
      ? this.block.registers : (this.block.register ? [this.block.register] : []);
    return regs.map(r => REG_CHIP[r] ?? { label: r, cls: 'reg-ling' });
  }
}
