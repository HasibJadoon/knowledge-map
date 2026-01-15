import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.scss']
})
export class HeaderSearchComponent {
  @Input() placeholder = 'Search';
  @Input() value = '';
  @Input() primaryLabel = '';
  @Input() secondaryLabel = '';

  @Output() search = new EventEmitter<string>();
  @Output() primary = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();

  onInput(event: Event) {
    const value = String((event.target as HTMLInputElement).value ?? '');
    this.search.emit(value);
  }
}
