import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-planner-page-header',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './planner-page-header.component.html',
  styleUrl: './planner-page-header.component.scss',
})
export class PlannerPageHeaderComponent {
  private readonly location = inject(Location);

  @Input() title = 'Planner';
  @Input() showSearch = false;
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Search';

  @Output() searchChange = new EventEmitter<string>();

  readonly icons = {
    arrowBackOutline,
  };

  back(): void {
    this.location.back();
  }

  onSearchInput(value: string | null | undefined): void {
    this.searchChange.emit((value ?? '').trim());
  }
}
