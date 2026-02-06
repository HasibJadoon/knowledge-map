import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

interface QuranDataSubmenuItem {
  id: string;
  title: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-quran-data-submenu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quran-data-submenu.component.html',
  styleUrls: ['./quran-data-submenu.component.scss'],
})
export class QuranDataSubmenuComponent {
  @Input() active: string | null = null;

  readonly items: QuranDataSubmenuItem[] = [
    {
      id: 'text',
      title: 'Quran Text',
      description: 'Surah cards + ayah viewer',
      route: '/arabic/quran/data/text',
    },
    {
      id: 'lemmas',
      title: 'Lemma Index',
      description: 'Lemma catalog and counts',
      route: '/arabic/quran/data/lemmas',
    },
    {
      id: 'lemma-locations',
      title: 'Lemma Locations',
      description: 'Ayah-level lemma occurrences',
      route: '/arabic/quran/data/lemma-locations',
    },
  ];
}
