import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-kmaps-section-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './section-header.html',
  styleUrl: './section-header.scss',
})
export class KmapsSectionHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actionLabel = '';

  @Output() actionSelected = new EventEmitter<void>();
}
