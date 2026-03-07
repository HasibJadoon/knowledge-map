import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-quran-summary-tab',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './quran-summary-tab.component.html',
  styleUrl: './quran-summary-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranSummaryTabComponent {
  @Input() totalPages = 0;
  @Input() totalSurahs = 0;
  @Input() totalJuzs = 0;
}
