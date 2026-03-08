import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-review-item-card',
  standalone: false,
  templateUrl: './review-item-card.component.html',
  styleUrl: './review-item-card.component.scss',
})
export class ReviewItemCardComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input() label = 'Item';
  @Input() placeholder = 'Add a note';
}
