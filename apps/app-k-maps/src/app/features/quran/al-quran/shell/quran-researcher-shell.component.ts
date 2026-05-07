import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { QuranResearchSearchService } from '../quran-research-search.service';

interface ResearchTab {
  id: string;
  labelAr: string;
  icon: string;
  routePath: string;
}

@Component({
  selector: 'app-quran-researcher-shell',
  standalone: true,
  imports: [IonicModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './quran-researcher-shell.component.html',
  styleUrl: './quran-researcher-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuranResearchSearchService],
})
export class QuranResearcherShellComponent {
  private readonly router = inject(Router);
  readonly search = inject(QuranResearchSearchService);

  readonly tabs: ResearchTab[] = [
    { id: 'al-quran', labelAr: 'القرآن', icon: '▤', routePath: 'al-quran' },
    { id: 'tafseer', labelAr: 'تفسير', icon: '◫', routePath: 'tafseer' },
    { id: 'uloom', labelAr: 'علوم', icon: '⧉', routePath: 'uloom' },
    { id: 'lexicon', labelAr: 'معاجم', icon: 'ع', routePath: 'lexicon' },
    { id: 'notes', labelAr: 'ملاحظات', icon: '✎', routePath: 'notes' },
  ];

  goHome(): void {
    this.router.navigateByUrl('/home');
  }

  setSearch(value: string | null | undefined): void {
    this.search.setSearch(value);
  }
}
