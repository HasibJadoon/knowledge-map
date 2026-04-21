import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TargetedNotesPanelComponent } from '../targeted-notes-panel/targeted-notes-panel.component';
import { TargetRef } from '../../../models/content/targeting.models';

export type TargetedNotesBlockVariant = 'default' | 'inline';

@Component({
  selector: 'app-targeted-notes-block',
  standalone: true,
  imports: [CommonModule, TargetedNotesPanelComponent],
  templateUrl: './targeted-notes-block.component.html',
  styleUrl: './targeted-notes-block.component.scss',
})
export class TargetedNotesBlockComponent {
  @Input() target: TargetRef | null = null;
  @Input() placeholder = 'Add a targeted note...';
  @Input() variant: TargetedNotesBlockVariant = 'default';
  @Input() collapsed = false;
}
