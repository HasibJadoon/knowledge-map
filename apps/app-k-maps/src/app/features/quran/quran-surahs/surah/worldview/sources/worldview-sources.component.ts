import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranSurahService, WorldviewSourceVm } from '../../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-worldview-sources',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-sources.component.html',
  styleUrl: './worldview-sources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewSourcesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly items = signal<WorldviewSourceVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewSources(id).subscribe({
      next: (r) => { this.items.set(r.sources); this.loading.set(false); },
      error: () => { this.error.set('Failed to load sources'); this.loading.set(false); },
    });
  }
}
