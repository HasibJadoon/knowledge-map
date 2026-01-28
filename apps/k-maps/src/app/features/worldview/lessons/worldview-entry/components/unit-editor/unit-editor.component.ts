import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenceEditorComponent } from '../evidence-editor/evidence-editor.component';
import { WorldviewUnit } from '../../../../../../shared/models/worldview/worldview-entry.model';

@Component({
  selector: 'app-unit-editor',
  standalone: true,
  imports: [CommonModule, EvidenceEditorComponent],
  templateUrl: './unit-editor.component.html',
  styleUrls: ['./unit-editor.component.scss'],
})
export class UnitEditorComponent {
  @Input() unit!: WorldviewUnit;
  @Output() linkConcept = new EventEmitter<void>();
}
