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
import { environment } from '../../../../environments/environment';

type Tab = 'grammar' | 'balagha' | 'analysis';
type BalaghaB = 'bayan' | 'maani' | 'badi' | string;

interface GrammarConcept {
  id: number | string;
  concept?: string;
  name?: string;
  category?: string;
  example?: string;
  description?: string;
}

interface BalaghaTerm {
  id: number | string;
  arabic_term?: string;
  term_ar?: string;
  english_term?: string;
  term_en?: string;
  definition?: string;
  branch?: BalaghaB;
  example?: string;
}

@Component({
  selector: 'km-arabic-linguistics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './arabic-linguistics.component.html',
  styleUrl: './arabic-linguistics.component.scss',
})
export class ArabicLinguisticsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private readonly base = environment.apiBase;

  activeTab = signal<Tab>('grammar');
  grammarConcepts = signal<GrammarConcept[]>([]);
  balaghaTerms = signal<BalaghaTerm[]>([]);
  grammarLoading = signal(true);
  balaghaLoading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];

  balahgaBranches = [
    { key: 'bayan', label: 'Bayan', ar: 'البيان' },
    { key: 'maani', label: "Ma'ani", ar: 'المعاني' },
    { key: 'badi', label: "Badi'", ar: 'البديع' },
  ];

  ngOnInit(): void {
    this.loadGrammar();
    this.loadBalagha();
  }

  private loadGrammar(): void {
    this.http.get<any>(`${this.base}/ar/grammar?limit=50`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.concepts)) {
          this.grammarConcepts.set(res.concepts);
        }
        this.grammarLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.grammarLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private loadBalagha(): void {
    this.http.get<any>(`${this.base}/ar/balagha?limit=50`).subscribe({
      next: (res) => {
        if (res?.ok && Array.isArray(res.terms)) {
          this.balaghaTerms.set(res.terms);
        }
        this.balaghaLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.balaghaLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  termsByBranch(branch: string): BalaghaTerm[] {
    return this.balaghaTerms().filter((t) => t.branch === branch);
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  back(): void {
    this.router.navigate(['/arabic']);
  }
}
