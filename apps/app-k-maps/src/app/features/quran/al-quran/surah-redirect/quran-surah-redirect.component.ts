import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-quran-surah-redirect',
  standalone: true,
  template: '',
})
export class QuranSurahRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const surah = Number(this.route.snapshot.paramMap.get('surahId'));
    const queryParams = Number.isFinite(surah) && surah > 0 ? { surah } : undefined;
    void this.router.navigate(['/quran/al-quran'], { queryParams, replaceUrl: true });
  }
}
