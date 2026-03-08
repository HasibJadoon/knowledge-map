import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CREATOR_SPEAKERS, speakerLabel } from '../podcast-builder.models';

@Component({
  selector: 'app-dialogue-item-card',
  standalone: false,
  templateUrl: './dialogue-item-card.component.html',
  styleUrl: './dialogue-item-card.component.scss',
})
export class DialogueItemCardComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly speakers = CREATOR_SPEAKERS;

  speakerLabel(value: string): string {
    return speakerLabel(value as never);
  }
}
