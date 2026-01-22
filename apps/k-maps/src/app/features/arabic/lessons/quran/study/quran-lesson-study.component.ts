import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { QuranLessonService } from '../../../../../shared/services/quran-lesson.service';
import {
  QuranLesson,
  QuranLessonMcq,
  QuranLessonComprehensionQuestion,
} from '../../../../../shared/models/arabic/quran-lesson.model';

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
  activeTab: 'study' | 'mcq' | 'passage' = 'study';
  mcqSelections: Record<string, { selectedIndex: number; isCorrect: boolean }> = {};
  private audioContext?: AudioContext;
  selectedVerseId: string | null = null;
  selectedQuestionId: string | null = null;

  get arabicParagraph(): string {
    const arabicFull = (this.lesson?.text.arabic_full ?? [])
      .map((verse) => verse.arabic?.trim())
      .filter(Boolean) as string[];
    if (arabicFull.length) {
      return arabicFull.join(' ');
    }
    const sentences = (this.lesson?.sentences ?? [])
      .map((sentence) => sentence.arabic?.trim())
      .filter(Boolean) as string[];
    return sentences.join(' ');
  }

  get verseList() {
    return (this.lesson?.text.arabic_full ?? [])
      .map((verse) => ({
        id: verse.unit_id,
        text: verse.arabic?.trim() ?? '',
      }))
      .filter((verse) => verse.text);
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

  selectVerse(unitId: string) {
    this.selectedVerseId = this.selectedVerseId === unitId ? null : unitId;
  }

  selectQuestion(question: QuranLessonComprehensionQuestion) {
    const id = question.question_id ?? question.question;
    if (!id) return;
    this.selectedQuestionId = this.selectedQuestionId === id ? null : id;
  }

  get sentenceList() {
    return this.lesson?.sentences ?? [];
  }

  get mcqQuestions(): QuranLessonMcq[] {
    const mcqs = this.lesson?.comprehension?.mcqs;
    if (!mcqs) return [];
    if (Array.isArray(mcqs)) return mcqs;
    if (typeof mcqs === 'object' && mcqs !== null && 'text' in mcqs) {
      const typed = mcqs as { text?: QuranLessonMcq[] };
      return Array.isArray(typed.text) ? typed.text : [];
    }
    return [];
  }

  get reflectiveQuestions(): QuranLessonComprehensionQuestion[] {
    const questions = this.lesson?.comprehension?.reflective;
    return Array.isArray(questions) ? questions : [];
  }

  get analyticalQuestions(): QuranLessonComprehensionQuestion[] {
    const questions = this.lesson?.comprehension?.analytical;
    return Array.isArray(questions) ? questions : [];
  }

  get hasComprehensionQuestions() {
    return this.reflectiveQuestions.length > 0 || this.analyticalQuestions.length > 0;
  }

  ngOnInit() {
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        const tab = params.get('tab');
        this.activeTab = tab === 'mcq' ? 'mcq' : tab === 'passage' ? 'passage' : 'study';
      })
    );

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

  onMcqOptionSelect(mcqId: string, optionIndex: number, optionIsCorrect: boolean) {
    const current = this.mcqSelections[mcqId];
    if (current?.selectedIndex === optionIndex && current.isCorrect === optionIsCorrect) {
      return;
    }
    this.mcqSelections[mcqId] = { selectedIndex: optionIndex, isCorrect: optionIsCorrect };
    if (!optionIsCorrect) {
      this.playErrorTone();
    }
  }

  private playErrorTone() {
    const audioCapability = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };

    const AudioCtor = audioCapability.AudioContext ?? audioCapability.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioCtor();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 320;
    gain.gain.value = 0.2;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
    oscillator.stop(this.audioContext.currentTime + 0.25);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
