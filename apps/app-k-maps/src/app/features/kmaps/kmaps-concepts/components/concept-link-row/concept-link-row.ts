import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KmapsConcept } from '../../../kmaps-shared/models/kmaps.models';

@Component({
  selector: 'app-concept-link-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './concept-link-row.html',
  styleUrl: './concept-link-row.scss',
})
export class ConceptLinkRowComponent {
  @Input({ required: true }) concept!: KmapsConcept;
  @Input() detail = '';

  @Output() selected = new EventEmitter<string>();
}
