import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SurahModulesService, WorldviewNoteVm } from '../../../../shared/services/surah-modules.service';

@Component({
  selector: 'app-worldview-notes-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-notes.page.html',
  styleUrl: './worldview-notes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewNotesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SurahModulesService);

  readonly surahId = signal(0);
  readonly items = signal<WorldviewNoteVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewNotes(id).subscribe({
      next: (r) => { this.items.set(r.notes); this.loading.set(false); },
      error: () => { this.error.set('Failed to load notes'); this.loading.set(false); },
    });
  }
}
