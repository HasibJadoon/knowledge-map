import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-literature-lesson-creator',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="lesson-creator">
      <header>
        <p class="eyebrow">Literature Lessons</p>
        <h1>Create a new literature lesson</h1>
        <p>
          Draft your Arabic literature lesson by linking to primary sources, notes, and discussion prompts.
        </p>
      </header>
      <div class="actions">
        <a class="btn btn-outline-light" routerLink="/arabic/lessons">Back to lessons</a>
      </div>
    </section>
  `,
})
export class LiteratureLessonCreatorComponent {}
