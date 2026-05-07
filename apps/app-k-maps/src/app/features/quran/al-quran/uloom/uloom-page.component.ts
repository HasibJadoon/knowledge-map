import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';

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
  readonly searchTerm = signal('');
  readonly sources = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return ULOOM_SOURCES;
    return ULOOM_SOURCES.filter((source) => `${source.title} ${source.description}`.toLowerCase().includes(q));
  });

  setSearch(value: string): void {
    this.searchTerm.set(value);
  }
}
