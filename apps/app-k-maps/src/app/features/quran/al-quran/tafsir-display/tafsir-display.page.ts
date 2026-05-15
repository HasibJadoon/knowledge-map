import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  QuranResearchApiService,
  QrTafsirDisplaySource,
  QrTafsirGroupDisplayPayload,
  QrTafsirDisplayBlock,
} from '../../../../shared/services/quran-research-api.service';
import { DisplayBlockComponent } from '../../../../shared/components/display-block/display-block.component';

interface ScholarColumn {
  source: QrTafsirDisplaySource;
  blocks: QrTafsirDisplayBlock[];
  expanded: boolean;
}

/**
 * Multi-scholar tafsir reader. Consumes /qr/tafsir/display?surah=N&ayah=M and
 * renders blocks grouped by scholar in side-by-side columns (desktop) or
 * stacked sections (mobile). Honors madhab + era filtering.
 */
@Component({
  selector: 'app-tafsir-display-page',
  standalone: true,
  imports: [CommonModule, IonicModule, DisplayBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tafsir-display.page.html',
  styleUrl: './tafsir-display.page.scss',
})
export class TafsirDisplayPageComponent implements OnInit {
  private readonly api    = inject(QuranResearchApiService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sources = signal<QrTafsirDisplaySource[]>([]);
  readonly payload = signal<QrTafsirGroupDisplayPayload | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  // User-driven filters
  readonly surah  = signal(2);
  readonly ayah   = signal(255);
  readonly selectedScholarIds = signal<Set<string>>(new Set());
  readonly madhabFilter       = signal<string | null>(null);
  readonly eraFilter          = signal<string | null>(null);

  readonly columns = computed<ScholarColumn[]>(() => {
    const p = this.payload();
    if (!p) return [];
    const selected = this.selectedScholarIds();
    const madhab = this.madhabFilter();
    const era    = this.eraFilter();
    const byScholar = new Map<string, QrTafsirDisplayBlock[]>();
    for (const b of p.blocks) {
      const sid = b.scholar_id ?? 'unknown';
      if (selected.size && !selected.has(sid)) continue;
      if (madhab && b.madhab !== madhab) continue;
      if (era && b.era !== era) continue;
      if (!byScholar.has(sid)) byScholar.set(sid, []);
      byScholar.get(sid)!.push(b);
    }
    return p.sources
      .filter(s => byScholar.has(s.scholar_id ?? ''))
      .map(s => ({
        source: s,
        blocks: byScholar.get(s.scholar_id ?? '') ?? [],
        expanded: true,
      }));
  });

  readonly groupHeader = computed(() => {
    const p = this.payload();
    if (!p) return '';
    return p.ayah_keys.length > 1
      ? `سورة ${p.surah_no} • ${p.ayah_group_key}`
      : `سورة ${p.surah_no} • آية ${p.ayah_no}`;
  });

  readonly availableMadhabs = computed(() => {
    const set = new Set<string>();
    for (const s of this.sources()) if (s.madhab) set.add(s.madhab);
    return [...set].sort();
  });

  ngOnInit(): void {
    // Read surah/ayah from route query params (?surah=2&ayah=255)
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const s = parseInt(params.get('surah') ?? '2', 10);
        const a = parseInt(params.get('ayah')  ?? '255', 10);
        this.surah.set(s);
        this.ayah.set(a);
        this.loadPayload();
      });

    this.api.getTafsirDisplaySources()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => this.sources.set(res.sources));
  }

  loadPayload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTafsirDisplay(this.surah(), this.ayah())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => { this.payload.set(p); this.loading.set(false); },
        error: e => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
      });
  }

  toggleScholar(sid: string): void {
    this.selectedScholarIds.update(set => {
      const next = new Set(set);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  }

  isScholarSelected(sid: string): boolean {
    const set = this.selectedScholarIds();
    return set.size === 0 || set.has(sid);
  }

  setMadhab(m: string | null): void { this.madhabFilter.set(m); }
  setEra(e: string | null): void    { this.eraFilter.set(e); }

  /** Step ±1 ayah and reload. */
  navAyah(delta: number): void {
    const next = Math.max(1, this.ayah() + delta);
    this.router.navigate(['/quran/tafsir-display'], {
      queryParams: { surah: this.surah(), ayah: next },
    });
  }
}
