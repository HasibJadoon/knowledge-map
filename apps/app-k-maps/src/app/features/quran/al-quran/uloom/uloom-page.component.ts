import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { QuranResearchSearchService } from '../quran-research-search.service';

interface UloomSource {
  title: string;
  description: string;
  topicCount: string;
  icon: string;
}

const ULOOM_SOURCES: UloomSource[] = [
  { title: 'أسباب النزول', description: 'Context for revelation and occasion-linked readings.', topicCount: '184 topics', icon: '☰' },
  { title: 'علم التجويد', description: 'Rules for recitation, articulation, and oral precision.', topicCount: '98 topics', icon: '◨' },
  { title: 'علم القراءات', description: 'Transmission variants and reading traditions.', topicCount: '126 topics', icon: '◫' },
  { title: 'المكي والمدني', description: 'Makki and Madani classification with thematic traits.', topicCount: '112 topics', icon: '◑' },
];

@Component({
  selector: 'app-uloom-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './uloom-page.component.html',
  styleUrl: './uloom-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UloomPageComponent {
  private readonly search = inject(QuranResearchSearchService);
  readonly sources = computed(() => {
    const q = this.search.searchTerm().trim().toLowerCase();
    if (!q) return ULOOM_SOURCES;
    return ULOOM_SOURCES.filter((source) => `${source.title} ${source.description}`.toLowerCase().includes(q));
  });
}
