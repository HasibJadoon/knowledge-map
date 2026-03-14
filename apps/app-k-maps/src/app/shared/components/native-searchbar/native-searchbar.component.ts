import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-native-searchbar',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './native-searchbar.component.html',
  styleUrl: './native-searchbar.component.scss',
})
export class NativeSearchbarComponent {
  @Input() value = '';
  @Input() placeholder = 'Search';
  @Input() debounce = 150;

  @Output() valueChange = new EventEmitter<string>();

  onInput(value: string | null | undefined): void {
    this.valueChange.emit(value ?? '');
  }
}
