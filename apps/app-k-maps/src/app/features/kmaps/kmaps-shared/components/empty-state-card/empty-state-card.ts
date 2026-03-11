import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-kmaps-empty-state-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './empty-state-card.html',
  styleUrl: './empty-state-card.scss',
})
export class KmapsEmptyStateCardComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() icon = 'sparkles-outline';

  @Output() actionSelected = new EventEmitter<void>();
}
