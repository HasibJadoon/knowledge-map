import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranSurahService, WorldviewNodeVm } from '../../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-worldview-nodes',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-nodes.component.html',
  styleUrl: './worldview-nodes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewNodesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly items = signal<WorldviewNodeVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewNodes(id).subscribe({
      next: (r) => { this.items.set(r.nodes); this.loading.set(false); },
      error: () => { this.error.set('Failed to load nodes'); this.loading.set(false); },
    });
  }
}
