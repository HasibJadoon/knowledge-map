import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

type SurahTab = 'Text' | 'Lessons' | 'Notes' | 'Worldview' | 'Vocabulary' | 'Review';

@Component({
  selector: 'km-surah',
  standalone: true,
  imports: [],
  templateUrl: './surah.component.html',
  styleUrl: './surah.component.scss',
})
export class SurahComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  surahId = signal<string>('1');
  activeTab = signal<SurahTab>('Text');

  readonly tabs: SurahTab[] = [
    'Text',
    'Lessons',
    'Notes',
    'Worldview',
    'Vocabulary',
    'Review',
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('surahId');
    if (id) {
      this.surahId.set(id);
    }
  }

  setTab(tab: SurahTab): void {
    this.activeTab.set(tab);
  }

  back(): void {
    this.router.navigate(['/quran']);
  }
}
