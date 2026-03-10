import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { KmapsActionItem } from '../../models/kmaps.models';

@Component({
  selector: 'app-kmaps-action-strip',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './action-strip.html',
  styleUrl: './action-strip.scss',
})
export class KmapsActionStripComponent {
  @Input() actions: KmapsActionItem[] = [];

  @Output() actionSelected = new EventEmitter<string>();

  trackAction(_: number, action: KmapsActionItem): string {
    return action.key;
  }
}
