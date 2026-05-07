import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { QuranResearchSearchService } from '../quran-research-search.service';

interface TafseerSource {
  title: string;
  scholar: string;
  description: string;
  icon: string;
}

const TAFSEER_SOURCES: TafseerSource[] = [
  { title: 'تفسير الطبري', scholar: 'محمد بن جرير الطبري', description: 'Narration-centered tafseer with early transmitted reports.', icon: '◫' },
  { title: 'تفسير ابن كثير', scholar: 'إسماعيل بن كثير', description: 'Quran by Quran, hadith, and companion explanations.', icon: '◨' },
  { title: 'تفسير القرطبي', scholar: 'محمد بن أحمد القرطبي', description: 'Legal and thematic tafseer with rulings and discussion.', icon: '⊓' },
  { title: 'تفسير السعدي', scholar: 'عبد الرحمن السعدي', description: 'Concise meaning-focused tafseer for quick reading.', icon: '≡' },
];

@Component({
  selector: 'app-tafseer-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './tafseer-page.component.html',
  styleUrl: './tafseer-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TafseerPageComponent {
  private readonly search = inject(QuranResearchSearchService);
  readonly sources = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return TAFSEER_SOURCES;
    return TAFSEER_SOURCES.filter((source) =>
      `${source.title} ${source.scholar} ${source.description}`.toLowerCase().includes(q),
    );
  });
}
