import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldviewEvidence } from '../../../../../../shared/models/worldview/worldview-entry.model';

@Component({
  selector: 'app-evidence-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evidence-editor.component.html',
  styleUrls: ['./evidence-editor.component.scss'],
})
export class EvidenceEditorComponent {
  @Input() evidence: WorldviewEvidence[] = [];
}
