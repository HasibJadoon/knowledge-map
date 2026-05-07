import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranSurahService, WorldviewNoteVm } from '../../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-worldview-notes',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-notes.component.html',
  styleUrl: './worldview-notes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewNotesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(QuranSurahService);

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
