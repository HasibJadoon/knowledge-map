import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HubCard } from '../../models/hub.models';

@Component({
  selector: 'km-hub-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hub-card.component.html',
  styleUrl: './hub-card.component.scss'
})
export class HubCardComponent {
  @Input({ required: true }) card!: HubCard;
  @Input() count: number | null = null;
  @Input() showDesc = false;
  @Output() cardClick = new EventEmitter<HubCard>();
}
