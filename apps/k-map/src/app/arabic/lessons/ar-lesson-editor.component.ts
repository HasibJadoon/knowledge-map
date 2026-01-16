import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../shared/services/ar-lessons.service';

type VocabItem = {
  word: string;
  root?: string;
  type?: string;
  meaning?: string;
  notes?: string;
};

type LessonJson = {
  text: {
    arabic: string;
    translation?: string;
    reference?: string;
  };
  vocabulary: VocabItem[];
  comprehension: any[];
};

@Component({
  selector: 'app-ar-lesson-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card mb-3">
    <div class="card-body">
      <div class="d-flex align-items-center mb-3">
        <h5 class="card-title mb-0">Arabic Lesson Editor</h5>
        <div class="ms-auto d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="goBack()">Back</button>
          <button class="btn btn-primary btn-sm" type="button" (click)="save()" [disabled]="saving">Save</button>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger py-2">{{ error }}</div>

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Title</label>
          <input class="form-control" type="text" [(ngModel)]="title" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Type</label>
          <select class="form-select" [(ngModel)]="lessonType">
            <option value="Quran">Quran</option>
            <option value="Literature">Literature</option>
            <option value="Linguistics">Linguistics</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Status</label>
          <select class="form-select" [(ngModel)]="status">
            <option value="draft">draft</option>
            <option value="done">done</option>
            <option value="published">published</option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Subtype</label>
          <input class="form-control" type="text" [(ngModel)]="subtype" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Source</label>
          <input class="form-control" type="text" [(ngModel)]="source" />
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-body">
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab==='text'" (click)="tab='text'">Arabic Text</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab==='vocab'" (click)="tab='vocab'">Vocabulary</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab==='comprehension'" (click)="tab='comprehension'">Comprehension</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="tab==='json'" (click)="tab='json'">JSON</button>
        </li>
      </ul>

      <div *ngIf="tab === 'text'">
        <div class="mb-3">
          <label class="form-label">Arabic Text</label>
          <textarea class="form-control arabic-textarea" rows="6" [(ngModel)]="lessonJson.text.arabic" (input)="syncJsonText()"></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label">Translation</label>
          <textarea class="form-control" rows="4" [(ngModel)]="lessonJson.text.translation" (input)="syncJsonText()"></textarea>
        </div>
        <div class="mb-0">
          <label class="form-label">Reference</label>
          <input class="form-control" type="text" [(ngModel)]="lessonJson.text.reference" (input)="syncJsonText()" />
        </div>
      </div>

      <div *ngIf="tab === 'vocab'">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="fw-semibold">Vocabulary</div>
          <button class="btn btn-outline-secondary btn-sm" type="button" (click)="addVocab()">Add</button>
        </div>
        <div *ngIf="lessonJson.vocabulary.length === 0" class="text-muted">No vocabulary yet.</div>
        <div class="table-responsive" *ngIf="lessonJson.vocabulary.length">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Word</th>
                <th>Root</th>
                <th>Type</th>
                <th>Meaning</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of lessonJson.vocabulary; let i = index">
                <td><input class="form-control form-control-sm" [(ngModel)]="v.word" (input)="syncJsonText()" /></td>
                <td><input class="form-control form-control-sm" [(ngModel)]="v.root" (input)="syncJsonText()" /></td>
                <td><input class="form-control form-control-sm" [(ngModel)]="v.type" (input)="syncJsonText()" /></td>
                <td><input class="form-control form-control-sm" [(ngModel)]="v.meaning" (input)="syncJsonText()" /></td>
                <td class="text-end">
                  <button class="btn btn-outline-danger btn-sm" type="button" (click)="removeVocab(i)">Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="tab === 'comprehension'">
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <h6 class="card-title mb-0">Paste Comprehension JSON</h6>
              <button class="btn btn-outline-secondary btn-sm ms-auto" type="button" (click)="applyComprehensionJson()">Apply</button>
            </div>
            <textarea
              class="form-control json-editor"
              rows="6"
              [(ngModel)]="comprehensionPasteText"
              spellcheck="false"
              placeholder='Paste {"comprehension":[...]} or an array'
            ></textarea>
            <div *ngIf="comprehensionPasteError" class="text-danger small mt-2">{{ comprehensionPasteError }}</div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <h6 class="card-title">Memory Recall</h6>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Verbs (one per line)</label>
                <textarea
                  class="form-control arabic-textarea"
                  rows="6"
                  [(ngModel)]="compMemoryVerbsText"
                  (input)="updateComprehensionFromUI()"
                ></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label">Nouns (one per line)</label>
                <textarea
                  class="form-control arabic-textarea"
                  rows="6"
                  [(ngModel)]="compMemoryNounsText"
                  (input)="updateComprehensionFromUI()"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <h6 class="card-title mb-0">MCQ</h6>
              <button class="btn btn-outline-secondary btn-sm ms-auto" type="button" (click)="addMcqQuestion()">Add</button>
            </div>
            <div class="d-flex gap-3 mb-3">
              <label class="form-check">
                <input class="form-check-input" type="checkbox" [(ngModel)]="compMcqScopeVerbs" (change)="updateComprehensionFromUI()" />
                <span class="form-check-label">Verbs</span>
              </label>
              <label class="form-check">
                <input class="form-check-input" type="checkbox" [(ngModel)]="compMcqScopeNouns" (change)="updateComprehensionFromUI()" />
                <span class="form-check-label">Nouns</span>
              </label>
            </div>

            <div *ngIf="compMcqQuestions.length === 0" class="text-muted">No MCQ questions.</div>
            <div *ngFor="let q of compMcqQuestions; let i = index" class="border rounded p-3 mb-2">
              <div class="d-flex align-items-center mb-2">
                <strong class="me-auto">Question {{ i + 1 }}</strong>
                <button class="btn btn-outline-danger btn-sm" type="button" (click)="removeMcqQuestion(i)">Remove</button>
              </div>
              <div class="mb-2">
                <label class="form-label">Question</label>
                <input class="form-control" [(ngModel)]="q.question" (input)="updateComprehensionFromUI()" />
              </div>
              <div class="mb-2">
                <label class="form-label">Options (one per line)</label>
                <textarea class="form-control arabic-textarea" rows="4" [(ngModel)]="q.optionsText" (input)="updateComprehensionFromUI()"></textarea>
              </div>
              <div class="mb-0">
                <label class="form-label">Answer</label>
                <input class="form-control arabic-textarea" [(ngModel)]="q.answer" (input)="updateComprehensionFromUI()" />
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <div class="d-flex align-items-center mb-2">
              <h6 class="card-title mb-0">Passage Questions</h6>
              <button class="btn btn-outline-secondary btn-sm ms-auto" type="button" (click)="addPassageQuestion()">Add</button>
            </div>
            <div *ngIf="compPassageQuestions.length === 0" class="text-muted">No passage questions.</div>
            <div *ngFor="let q of compPassageQuestions; let i = index" class="border rounded p-3 mb-2">
              <div class="d-flex align-items-center mb-2">
                <strong class="me-auto">Question {{ i + 1 }}</strong>
                <button class="btn btn-outline-danger btn-sm" type="button" (click)="removePassageQuestion(i)">Remove</button>
              </div>
              <label class="form-label">Question</label>
              <textarea class="form-control" rows="3" [(ngModel)]="q.question" (input)="updateComprehensionFromUI()"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="tab === 'json'">
        <label class="form-label">Lesson JSON</label>
        <textarea
          class="form-control json-editor"
          rows="12"
          [(ngModel)]="jsonText"
          (blur)="applyJsonText()"
          spellcheck="false"
        ></textarea>
        <div *ngIf="jsonError" class="text-danger small mt-2">{{ jsonError }}</div>
      </div>
    </div>
  </div>
  `,
  styles: [
    `
    .arabic-textarea {
      text-align: right;
      direction: rtl;
      font-family: 'UthmanicHafs', 'Amiri', 'Noto Naskh Arabic', serif;
      font-size: var(--app-ar-font-size, 1em);
      line-height: 1.9;
    }
    `
  ]
})
export class ArLessonEditorComponent implements OnInit {
  private lessons = inject(ArLessonsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id: number | null = null;
  loading = false;
  saving = false;
  error = '';
  jsonError = '';

  title = '';
  lessonType = 'Quran';
  subtype = '';
  source = '';
  status = 'draft';

  tab: 'text' | 'vocab' | 'comprehension' | 'json' = 'text';

  lessonJson: LessonJson = this.defaultLessonJson();
  jsonText = JSON.stringify(this.lessonJson, null, 2);

  compMemoryVerbsText = '';
  compMemoryNounsText = '';
  compMcqScopeVerbs = true;
  compMcqScopeNouns = true;
  compMcqQuestions: Array<{ question: string; optionsText: string; answer: string }> = [];
  compPassageQuestions: Array<{ question: string }> = [];
  comprehensionPasteText = '';
  comprehensionPasteError = '';

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (id && Number.isFinite(id)) {
      this.id = id;
      this.load(id);
    }
  }

  private defaultLessonJson(): LessonJson {
    return {
      text: {
        arabic: '',
        translation: '',
        reference: ''
      },
      vocabulary: [],
      comprehension: this.defaultComprehensionTemplate()
    };
  }

  private defaultComprehensionTemplate() {
    return [
      {
        type: 'memory_recall',
        verbs: [],
        nouns: []
      },
      {
        type: 'mcq',
        scope: ['verbs', 'nouns'],
        questions: []
      },
      {
        type: 'passage_questions',
        questions: []
      }
    ];
  }

  private setLessonJson(value: any) {
    const normalized: LessonJson = {
      text: {
        arabic: value?.text?.arabic ?? '',
        translation: value?.text?.translation ?? '',
        reference: value?.text?.reference ?? ''
      },
      vocabulary: Array.isArray(value?.vocabulary) ? value.vocabulary : [],
      comprehension: Array.isArray(value?.comprehension) ? value.comprehension : []
    };
    this.lessonJson = normalized;
    this.syncJsonText();
    this.hydrateComprehensionUI();
  }

  async load(id: number) {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.lessons.get(id);
      const result = (data as any)?.result;
      if (!result) throw new Error('Lesson not found');

      this.title = result.title ?? '';
      this.lessonType = result.lesson_type ?? 'Quran';
      this.subtype = result.subtype ?? '';
      this.source = result.source ?? '';
      this.status = result.status ?? 'draft';

      this.setLessonJson(result.lesson_json ?? {});
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson';
    } finally {
      this.loading = false;
    }
  }

  addVocab() {
    this.lessonJson.vocabulary.push({ word: '', root: '', type: '', meaning: '' });
    this.syncJsonText();
  }

  removeVocab(index: number) {
    this.lessonJson.vocabulary.splice(index, 1);
    this.syncJsonText();
  }

  syncJsonText() {
    this.jsonText = JSON.stringify(this.lessonJson, null, 2);
  }

  applyJsonText() {
    try {
      const parsed = JSON.parse(this.jsonText);
      this.jsonError = '';
      this.setLessonJson(parsed);
    } catch (err: any) {
      this.jsonError = err?.message ?? 'Invalid JSON';
    }
  }

  private hydrateComprehensionUI() {
    const comp = Array.isArray(this.lessonJson.comprehension) ? this.lessonJson.comprehension : [];
    const memory = comp.find((c: any) => c?.type === 'memory_recall') ?? {};
    const mcq = comp.find((c: any) => c?.type === 'mcq') ?? {};
    const passage = comp.find((c: any) => c?.type === 'passage_questions') ?? {};

    this.compMemoryVerbsText = Array.isArray(memory?.verbs) ? memory.verbs.join('\n') : '';
    this.compMemoryNounsText = Array.isArray(memory?.nouns) ? memory.nouns.join('\n') : '';

    const scope = Array.isArray(mcq?.scope) ? mcq.scope : [];
    this.compMcqScopeVerbs = scope.includes('verbs');
    this.compMcqScopeNouns = scope.includes('nouns');
    this.compMcqQuestions = Array.isArray(mcq?.questions)
      ? mcq.questions.map((q: any) => ({
          question: q?.question ?? '',
          optionsText: Array.isArray(q?.options) ? q.options.join('\n') : '',
          answer: q?.answer ?? ''
        }))
      : [];

    this.compPassageQuestions = Array.isArray(passage?.questions)
      ? passage.questions.map((q: any) => ({ question: q?.question ?? '' }))
      : [];
  }

  applyComprehensionJson() {
    this.comprehensionPasteError = '';
    const raw = this.comprehensionPasteText.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const compArray = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.comprehension)
          ? parsed.comprehension
          : null;
      if (!compArray) throw new Error('Expected an array or { comprehension: [...] }');
      this.lessonJson.comprehension = compArray;
      this.syncJsonText();
      this.hydrateComprehensionUI();
    } catch (err: any) {
      this.comprehensionPasteError = err?.message ?? 'Invalid JSON';
    }
  }

  private updateComprehensionFromUI() {
    const memory = {
      type: 'memory_recall',
      verbs: this.parseLines(this.compMemoryVerbsText),
      nouns: this.parseLines(this.compMemoryNounsText)
    };

    const scope: string[] = [];
    if (this.compMcqScopeVerbs) scope.push('verbs');
    if (this.compMcqScopeNouns) scope.push('nouns');

    const mcq = {
      type: 'mcq',
      scope,
      questions: this.compMcqQuestions.map((q, idx) => ({
        id: idx + 1,
        question: q.question,
        options: this.parseLines(q.optionsText),
        answer: q.answer
      }))
    };

    const passage = {
      type: 'passage_questions',
      questions: this.compPassageQuestions.map((q, idx) => ({
        id: idx + 1,
        question: q.question
      }))
    };

    this.lessonJson.comprehension = [memory, mcq, passage];
    this.syncJsonText();
  }

  addMcqQuestion() {
    this.compMcqQuestions.push({ question: '', optionsText: '', answer: '' });
    this.updateComprehensionFromUI();
  }

  removeMcqQuestion(index: number) {
    this.compMcqQuestions.splice(index, 1);
    this.updateComprehensionFromUI();
  }

  addPassageQuestion() {
    this.compPassageQuestions.push({ question: '' });
    this.updateComprehensionFromUI();
  }

  removePassageQuestion(index: number) {
    this.compPassageQuestions.splice(index, 1);
    this.updateComprehensionFromUI();
  }

  private parseLines(text: string) {
    return (text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  async save() {
    this.error = '';
    this.jsonError = '';

    let payloadJson = this.lessonJson;
    if (this.tab === 'json') {
      try {
        payloadJson = JSON.parse(this.jsonText);
        this.setLessonJson(payloadJson);
      } catch (err: any) {
        this.jsonError = err?.message ?? 'Invalid JSON';
        return;
      }
    } else {
      this.updateComprehensionFromUI();
    }

    if (!this.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    const payload = {
      title: this.title,
      lesson_type: this.lessonType,
      subtype: this.subtype,
      source: this.source,
      status: this.status,
      lesson_json: payloadJson
    };

    this.saving = true;
    try {
      if (this.id) {
        const data = await this.lessons.update(this.id, payload);
        const result = (data as any)?.result;
        if (result?.id) {
          this.router.navigate(['/arabic/lessons', result.id]);
        }
      } else {
        const data = await this.lessons.create(payload);
        const result = (data as any)?.result;
        if (result?.id) {
          this.router.navigate(['/arabic/lessons', result.id]);
        }
      }
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to save lesson';
    } finally {
      this.saving = false;
    }
  }

  goBack() {
    if (this.id) {
      this.router.navigate(['/arabic/lessons', this.id]);
    } else {
      this.router.navigate(['/arabic/lessons']);
    }
  }
}
