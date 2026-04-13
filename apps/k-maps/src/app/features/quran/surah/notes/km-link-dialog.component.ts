import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  HostListener, Input, OnChanges, Output, ViewChild, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'km-link-dialog',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="km-link-dialog" (mousedown)="$event.stopPropagation()">
        <input
          #urlInput
          class="km-link-dialog__input"
          type="url"
          placeholder="https://..."
          [(ngModel)]="url"
          (keydown.enter)="confirm()"
          (keydown.escape)="cancel()" />
        <button class="km-link-dialog__btn km-link-dialog__btn--primary" (click)="confirm()">Insert</button>
        @if (hasLink) {
          <button class="km-link-dialog__btn km-link-dialog__btn--danger" (click)="remove()">Remove</button>
        }
        <button class="km-link-dialog__btn" (click)="cancel()">Cancel</button>
      </div>
    }
  `,
  styles: [`
    .km-link-dialog {
      display: flex; align-items: center; gap: 6px;
      background: var(--km-surface-2, #1e1e22);
      border: 1px solid var(--km-border-gold, rgba(201,168,76,0.3));
      border-radius: 8px;
      padding: 8px 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.45);
      animation: linkIn 0.15s ease;
    }
    @keyframes linkIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:none; } }
    .km-link-dialog__input {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--km-border);
      border-radius: 5px;
      padding: 5px 10px;
      color: var(--km-text);
      font-size: 0.82rem;
      width: 240px;
      outline: none;
    }
    .km-link-dialog__input:focus { border-color: var(--km-gold); }
    .km-link-dialog__btn {
      padding: 5px 12px; border-radius: 5px;
      border: 1px solid var(--km-border);
      background: transparent; color: var(--km-text-2);
      font-size: 0.78rem; cursor: pointer;
    }
    .km-link-dialog__btn--primary { background: var(--km-gold); color: #1a1a1a; border-color: var(--km-gold); font-weight: 600; }
    .km-link-dialog__btn--danger { color: #e07070; border-color: rgba(224,112,112,0.3); }
    .km-link-dialog__btn:hover { opacity: 0.85; }
  `],
})
export class KmLinkDialogComponent implements OnChanges {
  @ViewChild('urlInput') urlInput?: ElementRef<HTMLInputElement>;

  @Input() show = false;
  @Input() existingUrl = '';
  @Input() hasLink = false;

  @Output() confirmed = new EventEmitter<string>();
  @Output() removed   = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  open = signal(false);
  url = '';

  ngOnChanges(): void {
    this.open.set(this.show);
    if (this.show) {
      this.url = this.existingUrl;
      setTimeout(() => this.urlInput?.nativeElement.focus(), 50);
    }
  }

  @HostListener('document:keydown.escape')
  cancel(): void { this.cancelled.emit(); }

  confirm(): void {
    const trimmed = this.url.trim();
    if (!trimmed) return;
    this.confirmed.emit(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  }

  remove(): void { this.removed.emit(); }
}
