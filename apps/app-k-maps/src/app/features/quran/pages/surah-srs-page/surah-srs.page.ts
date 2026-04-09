import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass, TitleCasePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SurahModulesService, SrsCardVm } from '../../../../shared/services/surah-modules.service';

type SrsFilter = 'due' | 'upcoming' | 'all' | 'suspended';

@Component({
  selector: 'app-surah-srs-page',
  standalone: true,
  imports: [IonicModule, NgClass, TitleCasePipe],
  templateUrl: './surah-srs.page.html',
  styleUrl: './surah-srs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurahSrsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(SurahModulesService);

  readonly surahId = signal(0);
  readonly items = signal<SrsCardVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeFilter = signal<SrsFilter>('due');

  readonly filters: SrsFilter[] = ['due', 'upcoming', 'all', 'suspended'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.load('due');
  }

  load(filter: SrsFilter): void {
    this.activeFilter.set(filter);
    this.loading.set(true);
    this.svc.getSurahSrs(this.surahId(), filter).subscribe({
      next: (res) => { this.items.set(res.items); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed'); this.loading.set(false); },
    });
  }

  daysUntil(item: SrsCardVm): string {
    if (!item.due_at) return '';
    const diff = Math.ceil((new Date(item.due_at).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    return `In ${diff}d`;
  }
}
