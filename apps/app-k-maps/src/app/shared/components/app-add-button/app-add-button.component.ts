import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-add-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './app-add-button.component.html',
  styleUrl: './app-add-button.component.scss',
})
export class AppAddButtonComponent {
  @Input() ariaLabel = 'Add';
  @Input() title = 'Add';
  @Input() variant: 'tile' | 'compact' = 'tile';
  @Input() disabled = false;
  @Input() icon = 'add-outline';

  @Output() pressed = new EventEmitter<Event>();

  onPressed(event: Event): void {
    this.pressed.emit(event);
  }
}
