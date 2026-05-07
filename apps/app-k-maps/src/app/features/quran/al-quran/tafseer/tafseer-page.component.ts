import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';

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
  readonly searchTerm = signal('');
  readonly sources = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return TAFSEER_SOURCES;
    return TAFSEER_SOURCES.filter((source) =>
      `${source.title} ${source.scholar} ${source.description}`.toLowerCase().includes(q),
    );
  });

  setSearch(value: string): void {
    this.searchTerm.set(value);
  }
}
