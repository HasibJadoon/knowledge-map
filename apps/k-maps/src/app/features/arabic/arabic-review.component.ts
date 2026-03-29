import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface SrsCard { id: number; entity_type: string; entity_id: number; front: string; back: string; due_at: string; }

@Component({
  selector: 'km-arabic-review',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-review.component.html',
  styleUrl: './arabic-review.component.scss'
})
export class ArabicReviewComponent implements OnInit {
  private router = inject(Router);
  readonly loading = signal(true);
  readonly cards = signal<SrsCard[]>([]);
  readonly currentIndex = signal(0);
  readonly flipped = signal(false);

  readonly currentCard = () => this.cards()[this.currentIndex()] ?? null;
  readonly remaining = () => this.cards().length - this.currentIndex();

  ngOnInit(): void { this.fetchCards(); }

  private async fetchCards(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBase}/ar/srs?entity_type=vocab&limit=20`);
      const data = await res.json() as { ok: boolean; items?: SrsCard[] };
      if (data.ok && data.items) this.cards.set(data.items);
    } catch { /* silent */ } finally { this.loading.set(false); }
  }

  flip(): void { this.flipped.set(!this.flipped()); }

  rate(_rating: string): void {
    this.flipped.set(false);
    const next = this.currentIndex() + 1;
    if (next >= this.cards().length) {
      this.cards.set([]);
    } else {
      this.currentIndex.set(next);
    }
  }

  goBack(): void { this.router.navigate(['/arabic']); }
}
