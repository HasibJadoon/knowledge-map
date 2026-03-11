import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KmapsSectionHeaderComponent } from '../section-header/section-header';

@Component({
  selector: 'app-kmaps-grouped-section',
  standalone: true,
  imports: [CommonModule, KmapsSectionHeaderComponent],
  templateUrl: './grouped-section.html',
  styleUrl: './grouped-section.scss',
})
export class KmapsGroupedSectionComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actionLabel = '';

  @Output() actionSelected = new EventEmitter<void>();
}
