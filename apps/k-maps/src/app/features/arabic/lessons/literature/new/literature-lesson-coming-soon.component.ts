import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-literature-lesson-coming-soon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="coming-soon">
      <p class="eyebrow">Literature lessons</p>
      <h1>Coming soon</h1>
      <p class="lead">
        Creating new literature lessons will be available shortly.
      </p>
      <p>
        For now you can still use the Quran lesson editor at
        <strong>/arabic/lessons/quran/new</strong>.
      </p>
    </section>
  `,
  styles: [
    `
      .coming-soon {
        min-height: 240px;
        border: 1px solid #dcdcdc;
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        background: #fff;
      }

      .coming-soon .eyebrow {
        font-size: 0.85rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #6c757d;
        margin-bottom: 0.5rem;
      }

      .coming-soon h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .coming-soon .lead {
        font-size: 1rem;
        margin-bottom: 0.75rem;
      }
    `,
  ],
})
export class LiteratureLessonComingSoonComponent {}
