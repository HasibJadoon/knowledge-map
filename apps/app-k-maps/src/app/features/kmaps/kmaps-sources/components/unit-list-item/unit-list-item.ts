import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KmapsStatChipRowComponent } from '../../../kmaps-shared/components/stat-chip-row/stat-chip-row';
import { KmapsSourceUnit, KmapsStatItem, formatUnitTypeLabel } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-unit-list-item',
  standalone: true,
  imports: [CommonModule, KmapsStatChipRowComponent],
  templateUrl: './unit-list-item.html',
  styleUrl: './unit-list-item.scss',
})
export class UnitListItemComponent {
  @Input({ required: true }) unit!: KmapsSourceUnit;
  @Input() noteCount = 0;

  @Output() selected = new EventEmitter<string>();

  get unitTypeLabel(): string {
    return formatUnitTypeLabel(this.unit.unitType);
  }

  get stats(): KmapsStatItem[] {
    return [
      { label: 'Read', value: `${this.unit.readingMinutes}m` },
      { label: 'Notes', value: this.noteCount, emphasis: this.noteCount > 0 },
    ];
  }
}
