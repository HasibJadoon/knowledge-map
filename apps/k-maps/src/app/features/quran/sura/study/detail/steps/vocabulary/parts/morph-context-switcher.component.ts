import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MorphContextVm } from '../../../../../../../../shared/services/quran/quran-surah.service';

/**
 * Presentational context switcher for the Morph Display Layer — one card per
 * Qurʾānic occurrence of the word. Pure renderer; emits the chosen ayah_key.
 */
@Component({
  selector: 'km-morph-context-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mw-switch">
      <div class="mw-switch__head">
        <span class="mw-switch__t">Choose a context <span class="ar">· مواضع الجذر</span></span>
        <span class="mw-switch__note">same core above · this verse below</span>
      </div>
      <div class="mw-switch__grid">
        @for (c of contexts; track c.ayah_key) {
          <button
            class="mw-cx"
            [class.on]="activeAyahKey === c.ayah_key"
            (click)="select.emit(c.ayah_key)"
          >
            <span class="mw-cx__ar ar">{{ c.kind_ar }} {{ lemmaBare }}</span>
            <span class="mw-cx__en">{{ c.en }}</span>
            <span class="mw-cx__key">Qurʾān · {{ c.ayah_key }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }

    .mw-switch {
      border: 1px solid rgba(147,184,214,.28); border-radius: 14px;
      background: radial-gradient(500px 120px at 0 0, rgba(147,184,214,.06), transparent), var(--g2); padding: 15px 17px;
      &__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
      &__t { font: 600 10px/1 var(--head); letter-spacing: .2em; text-transform: uppercase; color: var(--sky);
        .ar { text-transform: none; letter-spacing: 0; font-size: 13px; color: var(--faint); } }
      &__note { font-size: 11px; color: var(--faint); }
      &__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    }
    .mw-cx {
      display: flex; flex-direction: column; gap: 4px; text-align: start; padding: 10px 14px; border-radius: 10px;
      cursor: pointer; border: 1px solid var(--edge); background: var(--well);
      &__ar { font-family: var(--ar); font-size: 16px; color: var(--ink2); }
      &__en { font: 500 9.5px/1 var(--mono); letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
      &__key { font: 600 9px/1 var(--mono); color: var(--faint); letter-spacing: .03em; }
      &:hover { border-color: var(--golddim); }
      &.on { border-color: var(--golddim); background: rgba(201,168,76,.09);
        .mw-cx__ar { color: var(--gold2); } .mw-cx__en { color: var(--gold); } }
    }
  `,
})
export class MorphContextSwitcherComponent {
  @Input() contexts: MorphContextVm[] = [];
  @Input() activeAyahKey: string | null = null;
  @Input() lemmaBare = '';
  @Output() select = new EventEmitter<string>();
}
