import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ArDomain {
  id: number | string;
  name_ar?: string;
  name?: string;
  name_en?: string;
  icon?: string;
  description?: string;
}

interface ArPhrase {
  id: number | string;
  arabic?: string;
  text_ar?: string;
  transliteration?: string;
  english?: string;
  text_en?: string;
  translation?: string;
  level?: string;
}

@Component({
  selector: 'km-arabic-domains',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './arabic-domains.component.html',
  styleUrl: './arabic-domains.component.scss',
})
export class ArabicDomainsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  domains = signal<ArDomain[]>([]);
  activeDomain = signal<ArDomain | null>(null);
  phrases = signal<ArPhrase[]>([]);
  domainsLoading = signal(true);
  phrasesLoading = signal(false);
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  private readonly domainIconMap: Record<string, string> = {
    home: '🏠', house: '🏠', market: '🛒', mosque: '🕌',
    travel: '✈️', food: '🍽️', family: '👨‍👩‍👧', work: '💼',
    religion: '📿', prayer: '🤲', nature: '🌿', school: '📚',
  };

  ngOnInit(): void {
    this.loadDomains();
  }

  private loadDomains(): void {
    this.http.get<any>(`${this.base}/ar/domains?limit=20`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.domains)) {
          this.domains.set(res.domains);
        }
        this.domainsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.domainsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  domainIcon(d: ArDomain): string {
    const name = (d.name_en ?? d.name ?? '').toLowerCase();
    for (const [key, icon] of Object.entries(this.domainIconMap)) {
      if (name.includes(key)) return icon;
    }
    return '🔤';
  }

  openDomain(d: ArDomain): void {
    this.activeDomain.set(d);
    this.phrases.set([]);
    this.phrasesLoading.set(true);
    this.http.get<any>(`${this.base}/ar/domains/${d.id}/phrases`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.phrases)) {
          this.phrases.set(res.phrases);
        }
        this.phrasesLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.phrasesLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  closeDomain(): void {
    this.activeDomain.set(null);
    this.phrases.set([]);
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
