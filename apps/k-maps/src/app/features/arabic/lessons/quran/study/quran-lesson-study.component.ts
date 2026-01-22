import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { QuranLessonService } from '../../../../../shared/services/quran-lesson.service';
import { QuranLesson } from '../../../../../shared/models/arabic/quran-lesson.model';

@Component({
  selector: 'app-quran-lesson-study',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quran-lesson-study.component.html',
  styleUrls: ['./quran-lesson-study.component.scss']
})
export class QuranLessonStudyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private service = inject(QuranLessonService);
  private subs = new Subscription();

  private defaultText: QuranLesson['text'] = { arabic_full: [], mode: 'original' };
  lesson: QuranLesson | null = null;

  get arabicParagraph(): string {
    const sentences = (this.lesson?.sentences ?? [])
      .map((sentence) => sentence.arabic?.trim())
      .filter(Boolean) as string[];
    return sentences.join(' ');
  }

  get sentenceGroups() {
    const sentences = this.lesson?.sentences ?? [];
    if (!sentences.length) return [];
    const verseMap = new Map(
      (this.lesson?.text.arabic_full ?? []).map((verse) => [
        verse.unit_id,
        { arabic: verse.arabic, surah: verse.surah, ayah: verse.ayah },
      ])
    );

    const groups: Array<{
      unitId: string;
      verseArabic: string;
      surah?: number;
      ayah?: number;
      sentences: Array<{ arabic?: string; translation?: string | null }>;
    }> = [];

    for (const sentence of sentences) {
      const existing = groups.find((group) => group.unitId === sentence.unit_id);
      if (existing) {
        existing.sentences.push({
          arabic: sentence.arabic,
          translation: sentence.translation,
        });
        continue;
      }
      const verseInfo = verseMap.get(sentence.unit_id);
      groups.push({
        unitId: sentence.unit_id,
        verseArabic: verseInfo?.arabic ?? '',
        surah: verseInfo?.surah,
        ayah: verseInfo?.ayah,
        sentences: [
          {
            arabic: sentence.arabic,
            translation: sentence.translation,
          },
        ],
      });
    }

    return groups;
  }

  get sentenceList() {
    return this.lesson?.sentences ?? [];
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!isNaN(id)) {
      this.subs.add(
        this.service.getLesson(id).subscribe({
          next: (lesson: QuranLesson) =>
            (this.lesson = {
              ...lesson,
              text: lesson.text ?? { ...this.defaultText },
            }),
          error: () => (this.lesson = null),
        })
      );
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
