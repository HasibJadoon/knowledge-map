import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, Type, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MorphBlockVm } from '../../../../../../../../shared/services/quran/quran-surah.service';
import { LangSel } from '../morph-block.types';
import { MorphBlockBody } from '../morph-block.types';
import { MORPH_BLOCK_REGISTRY } from '../morph-block.registry';
import { safeMorphIcon } from '../morph-icons';

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
  templateUrl: './morph-block-host.component.html',
  styleUrl: './morph-block-host.component.scss',
})
export class MorphBlockHostComponent implements OnChanges {
  @Input({ required: true }) block!: MorphBlockVm;
  @Input() lang: LangSel = 'all';
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
  headIcon(): string { return safeMorphIcon(this.block.icon); }
  showIllu(): boolean {
    return !!this.block.illustration?.url && this.block.type !== 'master_story' && this.block.type !== 'synthesis';
  }
  regChips(): RegChip[] {
    const regs = (this.block.registers && this.block.registers.length)
      ? this.block.registers : (this.block.register ? [this.block.register] : []);
    return regs.map(r => REG_CHIP[r] ?? { label: r, cls: 'reg-ling' });
  }
}
