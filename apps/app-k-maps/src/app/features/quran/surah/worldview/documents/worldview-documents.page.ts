import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { QuranSurahService, WorldviewDocumentVm } from '../../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-worldview-documents-page',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './worldview-documents.page.html',
  styleUrl: './worldview-documents.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldviewDocumentsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly items = signal<WorldviewDocumentVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getWorldviewDocuments(id).subscribe({
      next: (r) => { this.items.set(r.documents); this.loading.set(false); },
      error: () => { this.error.set('Failed to load documents'); this.loading.set(false); },
    });
  }
}
