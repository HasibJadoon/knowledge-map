import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KmapsStatItem } from '../../models/kmaps.models';

@Component({
  selector: 'app-kmaps-stat-chip-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-chip-row.html',
  styleUrl: './stat-chip-row.scss',
})
export class KmapsStatChipRowComponent {
  @Input() stats: KmapsStatItem[] = [];

  trackStat(_: number, stat: KmapsStatItem): string {
    return stat.label;
  }
}
