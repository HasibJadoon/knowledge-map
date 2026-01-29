import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-concept-picker-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './concept-picker-modal.component.html',
  styleUrls: ['./concept-picker-modal.component.scss'],
})
export class ConceptPickerModalComponent {
  @Output() close = new EventEmitter<void>();
  wv_concepts = ['C_REVELATION', 'C_SOVEREIGNTY', 'C_LAW', 'C_REASON', 'C_NARRATIVE'];
}
