import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ArabicFeature {
  icon: string;
  title: string;
  arabicTitle: string;
  description: string;
  route: string;
}

interface ArabicStats {
  containers: number;
  vocab: number;
  grammar: number;
  balagha: number;
}

@Component({
  selector: 'km-arabic-menu-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './arabic-menu-card.component.html',
  styleUrl: './arabic-menu-card.component.scss',
})
export class ArabicMenuCardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBase;

  features: ArabicFeature[] = [
    {
      icon: 'ك',
      title: 'Content Library',
      arabicTitle: 'المكتبة',
      description: 'Books, poetry, podcasts',
      route: '/arabic/library',
    },
    {
      icon: 'ن',
      title: 'Linguistics',
      arabicTitle: 'اللغويات',
      description: 'Grammar & rhetoric',
      route: '/arabic/linguistics',
    },
    {
      icon: 'م',
      title: 'Domains',
      arabicTitle: 'المجالات',
      description: 'Context vocabulary',
      route: '/arabic/domains',
    },
    {
      icon: '↻',
      title: 'Review',
      arabicTitle: 'المراجعة',
      description: 'Spaced repetition',
      route: '/arabic/review',
    },
  ];

  stats = {
    containers: 0,
    vocab: 0,
    grammar: 0,
    balagha: 0,
  };

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.http.get<any>(`${this.apiBase}/hub/counts`).subscribe({
      next: (res) => {
        if (res?.ok && res.counts) {
          this.stats = {
            containers: res.counts.ar_containers ?? 0,
            vocab: res.counts.ar_roots ?? 0,
            grammar: res.counts.ar_grammar ?? 0,
            balagha: res.counts.ar_balagha ?? 0,
          };
        }
      },
      error: () => {
        // silently fail
      },
    });
  }
}
