import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KmapsMetaItem } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-source-meta-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './source-meta-row.html',
  styleUrl: './source-meta-row.scss',
})
export class SourceMetaRowComponent {
  @Input() items: KmapsMetaItem[] = [];

  trackItem(_: number, item: KmapsMetaItem): string {
    return `${item.label}:${item.value}`;
  }
}
