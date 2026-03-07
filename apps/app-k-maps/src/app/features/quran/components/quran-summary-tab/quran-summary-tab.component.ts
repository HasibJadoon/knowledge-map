import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-quran-summary-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './quran-summary-tab.component.html',
  styleUrl: './quran-summary-tab.component.scss',
})
export class QuranSummaryTabComponent {
  @Input() totalPages = 0;
  @Input() totalSurahs = 0;
  @Input() totalJuzs = 0;
}
