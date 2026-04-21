import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranSurahService, WorldviewPodcastVm } from '../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-worldview-podcasts-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-podcasts.page.html',
  styleUrl: './worldview-podcasts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewPodcastsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly items = signal<WorldviewPodcastVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewPodcasts(id).subscribe({
      next: (r) => { this.items.set(r.podcasts); this.loading.set(false); },
      error: () => { this.error.set('Failed to load podcasts'); this.loading.set(false); },
    });
  }
}
