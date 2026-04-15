import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SurahModulesService, WorldviewNodeVm } from '../../../../shared/services/surah-modules.service';

@Component({
  selector: 'app-worldview-nodes-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-nodes.page.html',
  styleUrl: './worldview-nodes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewNodesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SurahModulesService);

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
