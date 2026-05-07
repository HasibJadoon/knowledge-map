import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranSurahService, WorldviewLinkVm } from '../../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-worldview-links',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-links.component.html',
  styleUrl: './worldview-links.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewLinksComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly items = signal<WorldviewLinkVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewLinks(id).subscribe({
      next: (r) => { this.items.set(r.links); this.loading.set(false); },
      error: () => { this.error.set('Failed to load links'); this.loading.set(false); },
    });
  }
}
