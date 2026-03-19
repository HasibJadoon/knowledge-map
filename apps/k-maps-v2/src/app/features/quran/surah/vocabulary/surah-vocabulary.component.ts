import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SurahModulesService, VocabularyLemmaVm } from '../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';

@Component({
  selector: 'km-surah-vocabulary',
  standalone: true,
  imports: [QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-vocabulary.component.html',
  styleUrl: './surah-vocabulary.component.scss',
})
export class SurahVocabularyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);

  surahId = signal(0);
  items = signal<VocabularyLemmaVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getSurahVocabulary(id).subscribe({
      next: (res) => {
        // prefer lexicon if available, fall back to lemmas
        const vocab = res.lexicon?.length ? res.lexicon : res.lemmas;
        this.items.set(vocab);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  back(): void { this.router.navigate(['/quran']); }

  primaryMeaning(item: VocabularyLemmaVm): string {
    if (!item.meanings_json) return '';
    try {
      const m = JSON.parse(item.meanings_json);
      if (Array.isArray(m)) return m[0] ?? '';
      if (typeof m === 'string') return m;
      return m['primary'] ?? m['en'] ?? '';
    } catch { return ''; }
  }
}
