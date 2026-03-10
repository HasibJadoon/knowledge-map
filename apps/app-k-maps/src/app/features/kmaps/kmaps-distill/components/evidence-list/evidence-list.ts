import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KmapsEvidenceItem } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-evidence-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evidence-list.html',
  styleUrl: './evidence-list.scss',
})
export class EvidenceListComponent {
  @Input() items: KmapsEvidenceItem[] = [];

  trackItem(_: number, item: KmapsEvidenceItem): string {
    return item.id;
  }
}
