import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ResearchTab {
  id: string;
  labelAr: string;
  label: string;
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
})
export class QuranResearcherShellComponent {
  private readonly router = inject(Router);

  readonly tabs: ResearchTab[] = [
    { id: 'al-quran', labelAr: 'القرآن', label: 'Quran', icon: '▤', routePath: 'al-quran' },
    { id: 'tafseer', labelAr: 'تفسير', label: 'Tafseer', icon: '◫', routePath: 'tafseer' },
    { id: 'uloom', labelAr: 'علوم', label: 'Sciences', icon: '⧉', routePath: 'uloom' },
    { id: 'lexicon', labelAr: 'معاجم', label: 'Lexicon', icon: 'ع', routePath: 'lexicon' },
    { id: 'notes', labelAr: 'ملاحظات', label: 'Notes', icon: '✎', routePath: 'notes' },
  ];

  goHome(): void {
    this.router.navigateByUrl('/home');
  }
}
