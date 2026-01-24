import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-quran-lesson-creator',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="lesson-creator">
      <header>
        <p class="eyebrow">Quran Lessons</p>
        <h1>Create a new Quran lesson</h1>
        <p>
          Use this entry point to capture Qur’anic passages, add Arabic text, and craft comprehension prompts.
        </p>
      </header>
      <div class="actions">
        <a class="btn btn-outline-light" routerLink="/arabic/lessons">Back to lessons</a>
      </div>
    </section>
  `,
})
export class QuranLessonCreatorComponent {}
