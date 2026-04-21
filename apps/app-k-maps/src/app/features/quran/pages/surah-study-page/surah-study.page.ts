import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonIcon, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline, bookOutline, layersOutline,
  chatbubbleOutline, gitBranchOutline,
} from 'ionicons/icons';
import {
  QuranSurahService,
  StudyUnitCardVm,
  StudySurahMeta,
} from '../../../../shared/services/quran/quran-surah.service';

@Component({
  selector: 'app-surah-study-page',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonIcon, IonSpinner,
  ],
  templateUrl: './surah-study.page.html',
  styleUrl: './surah-study.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurahStudyPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(QuranSurahService);

  readonly surahId = signal(0);
  readonly surahMeta = signal<StudySurahMeta | null>(null);
  readonly units = signal<StudyUnitCardVm[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    addIcons({ chevronForwardOutline, bookOutline, layersOutline, chatbubbleOutline, gitBranchOutline });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getStudyGrid(id).subscribe({
      next: (res) => {
        this.surahMeta.set(res.surah);
        this.units.set(res.units);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load study grid');
        this.loading.set(false);
      },
    });
  }

  openUnit(unit: StudyUnitCardVm): void {
    this.router.navigate(['/quran/surah', this.surahId(), 'study', unit.order_index]);
  }

  ayahRange(u: StudyUnitCardVm): string {
    if (!u.ayah_from) return u.start_ref ?? '';
    return u.ayah_to && u.ayah_to !== u.ayah_from
      ? `${this.surahId()}:${u.ayah_from}–${u.ayah_to}`
      : `${this.surahId()}:${u.ayah_from}`;
  }
}
