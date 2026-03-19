import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

type LessonTab = 'Roots' | 'Lexicon' | 'Morphology';

@Component({
  selector: 'km-lesson-card',
  standalone: true,
  imports: [],
  templateUrl: './lesson-card.component.html',
  styleUrl: './lesson-card.component.scss',
})
export class LessonCardComponent implements OnInit {
  @Input() surahId!: number;
  @Output() closed = new EventEmitter<void>();

  private readonly router = inject(Router);

  activeTab = signal<LessonTab>('Roots');

  readonly tabs: LessonTab[] = ['Roots', 'Lexicon', 'Morphology'];

  ngOnInit(): void {
    // future: fetch root/lemma data for this surah via KMapsService
  }

  setTab(tab: LessonTab): void {
    this.activeTab.set(tab);
  }

  close(): void {
    this.closed.emit();
  }

  goEditLesson(): void {
    this.router.navigate(['/arabic/quran/lessons', this.surahId, 'edit']);
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('lesson-card-backdrop')) {
      this.close();
    }
  }
}
