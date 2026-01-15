import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../shared/services/ar-lessons.service';

type LessonJson = {
  text?: {
    arabic?: string;
    translation?: string;
    reference?: string;
  };
  vocabulary?: Array<{ word?: string; root?: string; type?: string; meaning?: string }>;
  comprehension?: string;
};

@Component({
  selector: 'app-ar-lesson-view',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="card mb-3">
    <div class="card-body">
      <div class="d-flex align-items-center">
        <h5 class="card-title mb-0">{{ title }}</h5>
        <div class="ms-auto d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="back()">Back</button>
          <button class="btn btn-primary btn-sm" type="button" (click)="edit()">Edit</button>
        </div>
      </div>
      <div class="text-body-secondary small mt-1">{{ lessonType }} • {{ status }}</div>
      <div class="text-body-secondary small" *ngIf="source">Source: {{ source }}</div>
    </div>
  </div>

  <div *ngIf="error" class="alert alert-danger py-2">{{ error }}</div>
  <div *ngIf="loading" class="text-muted">Loading…</div>

  <div *ngIf="!loading" class="card mb-3">
    <div class="card-body">
      <h6 class="card-title">Arabic Text</h6>
      <div class="arabic-text" *ngIf="lessonJson.text?.arabic">{{ lessonJson.text?.arabic }}</div>
      <div class="text-muted" *ngIf="lessonJson.text?.translation">{{ lessonJson.text?.translation }}</div>
      <div class="small text-body-secondary" *ngIf="lessonJson.text?.reference">{{ lessonJson.text?.reference }}</div>
    </div>
  </div>

  <div *ngIf="!loading" class="card mb-3">
    <div class="card-body">
      <h6 class="card-title">Vocabulary</h6>
      <div *ngIf="!lessonJson.vocabulary?.length" class="text-muted">No vocabulary.</div>
      <div class="table-responsive" *ngIf="lessonJson.vocabulary?.length">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Word</th>
              <th>Root</th>
              <th>Type</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of lessonJson.vocabulary">
              <td>{{ v.word }}</td>
              <td>{{ v.root }}</td>
              <td>{{ v.type }}</td>
              <td>{{ v.meaning }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div *ngIf="!loading" class="card mb-3">
    <div class="card-body">
      <h6 class="card-title">Comprehension</h6>
      <div *ngIf="lessonJson.comprehension; else noComp">{{ lessonJson.comprehension }}</div>
      <ng-template #noComp>
        <div class="text-muted">No comprehension notes.</div>
      </ng-template>
    </div>
  </div>

  <div *ngIf="!loading" class="card">
    <div class="card-body">
      <h6 class="card-title">Raw JSON</h6>
      <pre class="json-preview">{{ jsonText }}</pre>
    </div>
  </div>
  `,
  styles: [
    `
    .arabic-text {
      font-family: 'UthmanicHafs', 'Amiri', 'Noto Naskh Arabic', serif;
      font-size: var(--app-ar-font-size, 1em);
      line-height: 1.9;
      white-space: pre-wrap;
      text-align: right;
      direction: rtl;
    }
    `
  ]
})
export class ArLessonViewComponent implements OnInit {
  private lessons = inject(ArLessonsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id: number | null = null;
  loading = false;
  error = '';

  title = '';
  lessonType = '';
  status = '';
  source = '';

  lessonJson: LessonJson = {};
  jsonText = '{}';

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (id && Number.isFinite(id)) {
      this.id = id;
      this.load(id);
    }
  }

  async load(id: number) {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.lessons.get(id);
      const result = (data as any)?.result;
      if (!result) throw new Error('Lesson not found');

      this.title = result.title ?? '';
      this.lessonType = result.lesson_type ?? '';
      this.status = result.status ?? '';
      this.source = result.source ?? '';

      this.lessonJson = result.lesson_json ?? {};
      this.jsonText = JSON.stringify(this.lessonJson ?? {}, null, 2);
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson';
    } finally {
      this.loading = false;
    }
  }

  back() {
    this.router.navigate(['/arabic/lessons']);
  }

  edit() {
    if (this.id) this.router.navigate(['/arabic/lessons', this.id, 'edit']);
  }
}
