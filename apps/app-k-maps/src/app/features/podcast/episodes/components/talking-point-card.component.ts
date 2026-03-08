import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CREATOR_TONES, toneLabel } from '../podcast-builder.models';

@Component({
  selector: 'app-talking-point-card',
  standalone: false,
  templateUrl: './talking-point-card.component.html',
  styleUrl: './talking-point-card.component.scss',
})
export class TalkingPointCardComponent {
  @Input({ required: true }) group!: FormGroup;

  readonly tones = CREATOR_TONES;

  toneLabel(value: string): string {
    return toneLabel(value as never);
  }
}
