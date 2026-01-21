import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type QuranUnit = {
  unit_id?: string;
  unit_type?: string;
  arabic?: string;
  translation?: string | null;
  notes?: string | null;
  surah?: number;
  ayah?: number;
};

type McqOption = {
  option?: string;
  is_correct?: boolean;
};

type McqQuestion = {
  mcq_id?: string;
  linked_unit_ids?: string[];
  question?: string;
  question_ar?: string;
  explanation?: string;
  tags?: string[];
  options?: McqOption[];
};

type QuranText = {
  arabic_full?: QuranUnit[];
  translation?: string;
  reference?: string;
  sentences?: Array<{ arabic?: string; tokens?: any[] }>;
  mode?: string;
};

type QuranComprehension = {
  reflective?: Array<Record<string, any>>;
  analytical?: Array<Record<string, any>>;
  mcqs?: Record<string, McqQuestion[]>;
};

@Component({
  selector: 'app-quran-lesson-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quran-lesson-details.component.html',
  styleUrls: ['./quran-lesson-details.component.scss']
})
export class QuranLessonDetailsComponent {
  @Input() text: QuranText = {};
  @Input() comprehension: QuranComprehension = {};

  get arabicUnits(): QuranUnit[] {
    return Array.isArray(this.text?.arabic_full) ? this.text.arabic_full : [];
  }

  get hasUnits() {
    return this.arabicUnits.length > 0;
  }

  get reflectiveQuestions() {
    return Array.isArray(this.comprehension?.reflective) ? this.comprehension?.reflective : [];
  }

  get analyticalQuestions() {
    return Array.isArray(this.comprehension?.analytical) ? this.comprehension?.analytical : [];
  }

  get mcqGroups() {
    return this.comprehension?.mcqs ?? {};
  }

  get mcqKeys() {
    return Object.entries(this.mcqGroups)
      .filter(([, items]) => Array.isArray(items) && items.length > 0)
      .map(([key]) => key);
  }

  formatMeta(unit: QuranUnit) {
    const parts: string[] = [];
    if (unit.surah) parts.push(`S.${unit.surah}`);
    if (unit.ayah) parts.push(`Ayah ${unit.ayah}`);
    return parts.join(' • ');
  }

  formatTags(tags?: string[]) {
    if (!Array.isArray(tags) || !tags.length) return '';
    return tags.join(' • ');
  }

  mcqLabel(key: string) {
    switch (key) {
      case 'text':
        return 'Passage MCQs';
      case 'vocabulary':
        return 'Vocabulary MCQs';
      case 'grammar':
        return 'Grammar MCQs';
      default:
        return key.replace(/_/g, ' ');
    }
  }
}
