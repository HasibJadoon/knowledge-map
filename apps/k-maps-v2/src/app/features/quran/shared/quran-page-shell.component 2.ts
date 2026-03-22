import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'km-quran-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qpage">
      <div class="qpage__inner">
        <nav class="qpage__nav">
          <button class="qpage__back" (click)="goBack.emit()">&#8592; Back</button>
          <span class="qpage__breadcrumb">{{ breadcrumb }}</span>
          @if (title) { <span class="qpage__title-crumb">{{ title }}</span> }
        </nav>
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .qpage {
      width: 100%; min-height: 100dvh;
      background: var(--km-bg); color: var(--km-text);
      font-family: var(--km-font-body);
      padding: 2rem 2rem 6rem;
    }
    .qpage__inner { max-width: 1100px; margin: 0 auto; }
    .qpage__nav {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 2.5rem; flex-wrap: wrap;
    }
    .qpage__back {
      display: inline-flex; align-items: center; gap: 0.35rem;
      background: transparent; border: 1px solid var(--km-border);
      border-radius: 6px; color: var(--km-text-2);
      font-family: var(--km-font-body); font-size: 0.8rem;
      letter-spacing: 0.06em; text-transform: uppercase;
      padding: 0.4rem 0.85rem; cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
      &:hover { border-color: var(--km-border-gold); color: var(--km-gold); }
    }
    .qpage__breadcrumb {
      font-family: var(--km-font-heading); font-size: 0.72rem;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--km-gold); opacity: 0.65;
    }
    .qpage__title-crumb {
      font-size: 0.72rem; color: var(--km-text-3);
      letter-spacing: 0.08em; text-transform: uppercase;
    }
  `],
})
export class QuranPageShellComponent {
  @Input() breadcrumb = '';
  @Input() title = '';
  @Output() goBack = new EventEmitter<void>();
}
