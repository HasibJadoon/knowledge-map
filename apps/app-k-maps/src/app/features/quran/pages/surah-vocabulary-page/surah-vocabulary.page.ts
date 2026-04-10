import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SurahModulesService, VocabularyLemmaVm } from '../../../../shared/services/surah-modules.service';

@Component({
  selector: 'app-surah-vocabulary-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './surah-vocabulary.page.html',
  styleUrl: './surah-vocabulary.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurahVocabularyPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SurahModulesService);

  readonly surahId = signal(0);
  readonly items = signal<VocabularyLemmaVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getSurahVocabulary(id).subscribe({
      next: (res) => {
        this.items.set(res.lexicon?.length ? res.lexicon : res.lemmas);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  primaryMeaning(item: VocabularyLemmaVm): string {
    if (!item.meanings_json) return '';
    try {
      const m = JSON.parse(item.meanings_json);
      if (Array.isArray(m)) return m[0] ?? '';
      if (typeof m === 'string') return m;
      return (m as Record<string, string>)['primary'] ?? (m as Record<string, string>)['en'] ?? '';
    } catch { return ''; }
  }
}
