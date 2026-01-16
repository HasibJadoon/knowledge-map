import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ArLessonsService } from '../../../shared/services/ar-lessons.service';
import { GrammarNotesService } from '../../../shared/services/grammar-notes.service';

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
    sentences?: string;
    translation?: string;
    reference?: string;
    mode?: 'quran' | 'text';
  };
  vocabulary: VocabItem[];
  comprehension: any[];
};

type GrammarNoteItem = {
  textType: 'quran' | 'text';
  textId: string;
  source: string;
  label: string;
  note: string;
  examplesText: string;
};

@Component({
  selector: 'app-ar-lesson-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ar-lesson-editor.component.html',
  styleUrls: ['./ar-lesson-editor.component.scss']
})
export class ArLessonEditorComponent implements OnInit {
  private lessons = inject(ArLessonsService);
  private grammarNotes = inject(GrammarNotesService);
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

  tab: 'text' | 'vocab' | 'comprehension' | 'grammar' | 'json' = 'text';

  lessonJson: LessonJson = this.defaultLessonJson();
  jsonText = JSON.stringify(this.lessonJson, null, 2);

  compMemoryVerbsText = '';
  compMemoryNounsText = '';
  compMemoryQuestionsText = '';
  compPassageQuestionsText = '';
  grammarNotesItems: GrammarNoteItem[] = [];
  grammarNotesError = '';

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
        sentences: '',
        translation: '',
        reference: '',
        mode: 'quran'
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
        nouns: [],
        questions: []
      }
      ,
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
        sentences: value?.text?.sentences ?? '',
        translation: value?.text?.translation ?? '',
        reference: value?.text?.reference ?? '',
        mode: value?.text?.mode === 'text' ? 'text' : 'quran'
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
      await this.loadGrammarNotes(id);
    } catch (err: any) {
      this.error = err?.message ?? 'Failed to load lesson';
    } finally {
      this.loading = false;
    }
  }

  addGrammarNote() {
    this.grammarNotesItems.push({
      textType: this.lessonJson.text?.mode === 'text' ? 'text' : 'quran',
      textId: '',
      source: this.source ?? '',
      label: '',
      note: '',
      examplesText: ''
    });
  }

  removeGrammarNote(index: number) {
    this.grammarNotesItems.splice(index, 1);
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
    const passage = comp.find((c: any) => c?.type === 'passage_questions') ?? {};

    this.compMemoryVerbsText = Array.isArray(memory?.verbs) ? memory.verbs.join(', ') : '';
    this.compMemoryNounsText = Array.isArray(memory?.nouns) ? memory.nouns.join(', ') : '';
    this.compMemoryQuestionsText = Array.isArray(memory?.questions)
      ? memory.questions.map((q: any) => q?.question ?? '').join('\n')
      : '';
    this.compPassageQuestionsText = Array.isArray(passage?.questions)
      ? passage.questions.map((q: any) => q?.question ?? '').join('\n')
      : '';
  }


  updateComprehensionFromUI() {
    const memory = {
      type: 'memory_recall',
      verbs: this.parseCommaList(this.compMemoryVerbsText),
      nouns: this.parseCommaList(this.compMemoryNounsText),
      questions: this.parseLines(this.compMemoryQuestionsText).map((q, idx) => ({
        id: idx + 1,
        question: q
      }))
    };

    const passage = {
      type: 'passage_questions',
      questions: this.parseLines(this.compPassageQuestionsText).map((q, idx) => ({
        id: idx + 1,
        question: q
      }))
    };

    this.lessonJson.comprehension = [memory, passage];
    this.syncJsonText();
  }

  private parseLines(text: string) {
    return (text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private parseCommaList(text: string) {
    return (text ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private cleanText(value?: string) {
    if (!value) return value ?? '';
    return value
      .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .trim();
  }

  private cleanLessonJson(json: LessonJson) {
    if (!json?.text) return json;
    return {
      ...json,
      text: {
        ...json.text,
        arabic: this.cleanText(json.text.arabic),
        sentences: this.cleanText(json.text.sentences),
        translation: this.cleanText(json.text.translation),
        reference: this.cleanText(json.text.reference),
        mode: json.text.mode === 'text' ? 'text' : 'quran'
      }
    };
  }

  async save() {
    this.error = '';
    this.jsonError = '';
    this.grammarNotesError = '';

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
      source: this.cleanText(this.source),
      status: this.status,
      lesson_json: this.cleanLessonJson(payloadJson)
    };

    this.saving = true;
    try {
      if (this.id) {
        const data = await this.lessons.update(this.id, payload);
        const result = (data as any)?.result;
        if (result?.id) {
          await this.saveGrammarNotes(result.id);
          this.router.navigate(['/arabic/lessons', result.id]);
        }
      } else {
        const data = await this.lessons.create(payload);
        const result = (data as any)?.result;
        if (result?.id) {
          await this.saveGrammarNotes(result.id);
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

  private async loadGrammarNotes(id: number) {
    try {
      const data = await this.grammarNotes.list(id);
      const results = Array.isArray((data as any)?.results) ? (data as any).results : [];
      this.grammarNotesItems = results.map((note: any) => ({
        textType: note?.text_type === 'text' ? 'text' : 'quran',
        textId: note?.text_id ?? '',
        source: note?.source ?? '',
        label: note?.label ?? '',
        note: note?.note ?? '',
        examplesText: Array.isArray(note?.examples) ? note.examples.join('\n') : ''
      }));
    } catch (err: any) {
      this.grammarNotesError = err?.message ?? String(err);
    }
  }

  private async saveGrammarNotes(id: number) {
    const notes = this.grammarNotesItems
      .map((item) => ({
        text_id: item.textId?.trim() || null,
        text_type: item.textType === 'text' ? 'text' : 'quran',
        source: item.source?.trim() || null,
        label: item.label?.trim() || null,
        note: item.note?.trim() || '',
        examples: item.examplesText
          ? item.examplesText.split(/\r?\n+/).map((line) => line.trim()).filter((line) => line)
          : null
      }))
      .filter((item) => item.note);

    await this.grammarNotes.replaceForLesson(id, notes);
  }
}
