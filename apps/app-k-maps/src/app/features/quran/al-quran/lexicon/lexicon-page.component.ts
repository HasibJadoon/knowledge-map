import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { QuranResearchSearchService } from '../quran-research-search.service';

interface LexiconSource {
  title: string;
  scholar: string;
  description: string;
  entryCount: string;
  icon: string;
}

const LEXICON_SOURCES: LexiconSource[] = [
  { title: 'لسان العرب', scholar: 'ابن منظور', description: 'Arabic lexical breadth, usage, and root-derived meanings.', entryCount: '80k entries', icon: '◫' },
  { title: 'مفردات ألفاظ القرآن', scholar: 'الراغب الأصفهاني', description: 'Quran-specific word meanings and semantic distinctions.', entryCount: '1.5k entries', icon: '◨' },
  { title: 'مقاييس اللغة', scholar: 'ابن فارس', description: 'Root principles and semantic cores for Arabic derivation.', entryCount: '2k roots', icon: '△' },
  { title: 'القاموس المحيط', scholar: 'الفيروزآبادي', description: 'Compact lookup for broad vocabulary and rare forms.', entryCount: '20k entries', icon: '◎' },
];

@Component({
  selector: 'app-lexicon-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './lexicon-page.component.html',
  styleUrl: './lexicon-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconPageComponent {
  private readonly search = inject(QuranResearchSearchService);
  readonly sources = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return LEXICON_SOURCES;
    return LEXICON_SOURCES.filter((source) =>
      `${source.title} ${source.scholar} ${source.description}`.toLowerCase().includes(q),
    );
  });
}
