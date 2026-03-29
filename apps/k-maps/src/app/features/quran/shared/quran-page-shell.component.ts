import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'km-quran-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quran-page-shell.component.html',
  styleUrl: './quran-page-shell.component.scss',
})
export class QuranPageShellComponent {
  @Input() breadcrumb = '';
  @Input() title = '';
  @Output() goBack = new EventEmitter<void>();
}
