import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LessonGeneratorService } from '../../../../shared/services/lesson-generator.service';

@Component({
  selector: 'app-ar-lesson-claude',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ar-lesson-claude.component.html',
  styleUrls: ['./ar-lesson-claude.component.scss']
})
export class ArLessonClaudeComponent {
  private lessonGenerator = inject(LessonGeneratorService);

  arabicText = '';
  surah = 12;
  mode: 'ayah' | 'sentence' = 'ayah';

  loading = false;
  error = '';
  resultJson = '';
  rawResponse = '';
  attempts = 0;
  warnings: string[] = [];
  responseTab: 'formatted' | 'raw' = 'formatted';

  get canSubmit() {
    return !!this.arabicText.trim();
  }

  async generate() {
    if (!this.canSubmit) {
      this.error = 'Enter Arabic text to continue.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.resultJson = '';
    this.rawResponse = '';
    this.attempts = 0;
    this.warnings = [];

    try {
      const response = await this.lessonGenerator.generateFromText({
        text: this.arabicText,
        surah: this.surah,
        mode: this.mode,
        options: { max_tokens: 6000 },
      });

      this.resultJson = JSON.stringify(response.lesson ?? {}, null, 2);
      this.rawResponse = response.raw_output ?? '';
      this.attempts = response.attempts ?? 0;
      this.warnings = response.warnings ?? [];
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to generate Claude lesson.';
    } finally {
      this.loading = false;
    }
  }
}
