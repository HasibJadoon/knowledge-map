import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-entity-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entity-toolbar.component.html'
})
export class EntityToolbarComponent {
  @Input() title = 'Items';
  @Input() subtitle = '';
  @Input() searchPlaceholder = 'Search';
  @Input() addLabel = 'Add';
  @Input() hideAdd = false;

  @Output() search = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();

  q = '';
}
