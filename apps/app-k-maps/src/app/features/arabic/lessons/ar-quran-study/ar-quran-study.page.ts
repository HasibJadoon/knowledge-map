import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, SegmentCustomEvent } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { QuranLessonService } from '../../../../shared/services/quran-lesson.service';
import {
  QuranLesson,
  QuranLessonComprehensionQuestion,
  QuranLessonMcq,
} from '../../../../shared/models/arabic/quran-lesson.model';
import {
  arrowBackOutline,
  bookOutline,
  documentTextOutline,
  listOutline,
} from 'ionicons/icons';

type StudyTab = 'study' | 'mcq' | 'passage';

@Component({
  selector: 'app-ar-quran-study',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './ar-quran-study.page.html',
  styleUrls: ['./ar-quran-study.page.scss'],
})
export class ArQuranStudyPage implements OnInit {
  private readonly defaultText: QuranLesson['text'] = { arabic_full: [], mode: 'original' };
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(QuranLessonService);

  lesson: QuranLesson | null = null;
  loading = true;
  error = '';
  activeTab: StudyTab = 'study';
  selectedVerseId: string | null = null;
  selectedSentenceKey: string | null = null;
  selectedQuestionId: string | null = null;

  mcqSelections: Record<string, { selectedIndex: number; isCorrect: boolean }> = {};

  readonly icons = {
    arrowBackOutline,
    bookOutline,
    listOutline,
    documentTextOutline,
  };

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.error = 'Lesson not found';
      this.loading = false;
      return;
    }

    try {
      const lesson = await firstValueFrom(this.service.getLesson(id));
      this.lesson = {
        ...lesson,
        text: lesson.text ?? { ...this.defaultText },
      };
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson';
    } finally {
      this.loading = false;
    }
  }

  back() {
    this.router.navigate(['/arabic/lessons']);
  }

  setActiveTab(tab: StudyTab) {
    this.activeTab = tab;
  }

  onTabChange(event: SegmentCustomEvent) {
    const next = event.detail?.value as StudyTab | undefined;
    if (next) {
      this.setActiveTab(next);
    }
  }

  selectVerse(unitId: string) {
    this.selectedVerseId = this.selectedVerseId === unitId ? null : unitId;
    if (!this.selectedVerseId) {
      this.selectedSentenceKey = null;
    }
  }

  selectSentence(unitId: string, index: number) {
    const key = `${unitId}-${index}`;
    if (this.selectedSentenceKey === key) {
      this.selectedSentenceKey = null;
      this.selectedVerseId = null;
      return;
    }
    this.selectedSentenceKey = key;
    this.selectedVerseId = unitId;
  }

  selectQuestion(question: QuranLessonComprehensionQuestion) {
    const id = this.getQuestionKey(question);
    if (!id) return;
    this.selectedQuestionId = this.selectedQuestionId === id ? null : id;
  }

  onMcqOptionSelect(mcqId: string, optionIndex: number, optionIsCorrect: boolean) {
    const current = this.mcqSelections[mcqId];
    if (current?.selectedIndex === optionIndex && current.isCorrect === optionIsCorrect) {
      return;
    }
    this.mcqSelections[mcqId] = { selectedIndex: optionIndex, isCorrect: optionIsCorrect };
  }

  getQuestionKey(question: QuranLessonComprehensionQuestion) {
    return question.question_id ?? question.question ?? '';
  }

  get verseList() {
    return (this.lesson?.text.arabic_full ?? []).map((verse) => ({
      id: verse.unit_id,
      text: verse.arabic?.trim() ?? '',
    }));
  }

  get sentenceGroups() {
    const sentences = this.lesson?.sentences ?? [];
    if (!sentences.length) return [];

    const verseMap = new Map(
      (this.lesson?.text.arabic_full ?? []).map((verse) => [verse.unit_id, verse.arabic ?? ''])
    );

    const groups: Array<{ unitId: string; verseArabic: string; sentences: Array<{ arabic?: string }> }> = [];

    for (const sentence of sentences) {
      const existing = groups.find((group) => group.unitId === sentence.unit_id);
      if (existing) {
        existing.sentences.push({ arabic: sentence.arabic });
        continue;
      }
      groups.push({
        unitId: sentence.unit_id,
        verseArabic: verseMap.get(sentence.unit_id) ?? '',
        sentences: [{ arabic: sentence.arabic }],
      });
    }

    return groups;
  }

  get mcqQuestions(): QuranLessonMcq[] {
    const mcqs = this.lesson?.comprehension?.mcqs;
    if (!mcqs) return [];
    if (Array.isArray(mcqs)) return mcqs;
    if (typeof mcqs === 'object' && mcqs !== null) {
      const typed = mcqs as {
        text?: QuranLessonMcq[];
        vocabulary?: QuranLessonMcq[];
        grammar?: QuranLessonMcq[];
      };
      return [
        ...(Array.isArray(typed.text) ? typed.text : []),
        ...(Array.isArray(typed.vocabulary) ? typed.vocabulary : []),
        ...(Array.isArray(typed.grammar) ? typed.grammar : []),
      ];
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
}
