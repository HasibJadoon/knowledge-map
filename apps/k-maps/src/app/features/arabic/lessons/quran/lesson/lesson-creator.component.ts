import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type LessonNodeKey = 'reference' | 'text' | 'sentences' | 'passage_layers' | 'comprehension';
type LessonTab = LessonNodeKey | 'json';
type LessonReference = Record<string, unknown> & {
  ref_label?: string;
};
type LessonJson = {
  entity_type: string;
  id: string;
  lesson_type: string;
  subtype: string;
  title: string;
  title_ar: string;
  status: string;
  difficulty: number;
  reference: LessonReference;
  text: {
    arabic_full: Array<Record<string, unknown>>;
    mode: string;
  };
  sentences: Array<Record<string, unknown>>;
  passage_layers: Array<Record<string, unknown>>;
  comprehension: {
    reflective: unknown[];
    analytical: unknown[];
    mcqs: unknown;
  };
};
type LessonMeta = {
  title: string;
  title_ar: string;
  lesson_type: string;
  status: string;
  subtype: string;
  difficulty: number;
  referenceLabel: string;
};

@Component({
  selector: 'app-lesson-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-creator.component.html',
})
export class LessonCreatorComponent implements OnInit {
  tabs: { key: LessonTab; label: string }[] = [
    { key: 'reference', label: 'Reference Node' },
    { key: 'text', label: 'Text Node' },
    { key: 'sentences', label: 'Sentence Nodes' },
    { key: 'passage_layers', label: 'Discourse Layers' },
    { key: 'comprehension', label: 'Comprehension Node' },
    { key: 'json', label: 'Full JSON' },
  ];
  selectedTab = 'reference';
  lessonType: 'quran' | 'literature' = 'quran';

  readonly nodeKeys: LessonNodeKey[] = [
    'reference',
    'text',
    'sentences',
    'passage_layers',
    'comprehension',
  ];

  lessonJson: LessonJson = this.defaultLessonJson();
  lessonMeta: LessonMeta = this.buildLessonMeta(this.lessonJson);
  jsonText = '';
  jsonError = '';
  nodeJsonTexts: Record<LessonNodeKey, string> = {
    reference: '',
    text: '',
    sentences: '',
    passage_layers: '',
    comprehension: '',
  };
  nodeErrors: Record<LessonNodeKey, string> = {
    reference: '',
    text: '',
    sentences: '',
    passage_layers: '',
    comprehension: '',
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const type = this.route.snapshot.data['lessonType'];
    this.lessonType = type === 'literature' ? 'literature' : 'quran';
    this.syncJsonRepresentations();
  }

  onMetaInputChange() {
    const reference: LessonReference =
      typeof this.lessonJson.reference === 'object' && this.lessonJson.reference !== null
        ? { ...this.lessonJson.reference }
        : {};
    reference.ref_label = this.lessonMeta.referenceLabel;

    this.lessonJson = {
      ...this.lessonJson,
      title: this.lessonMeta.title,
      title_ar: this.lessonMeta.title_ar,
      lesson_type: this.lessonMeta.lesson_type,
      status: this.lessonMeta.status,
      subtype: this.lessonMeta.subtype,
      difficulty: this.lessonMeta.difficulty,
      reference,
    };

    this.syncJsonRepresentations();
  }

  private buildLessonMeta(json: LessonJson): LessonMeta {
    const reference = json.reference ?? {};
    const referenceLabel =
      typeof reference.ref_label === 'string' ? reference.ref_label : '';

    return {
      title: json.title ?? '',
      title_ar: json.title_ar ?? '',
      lesson_type: json.lesson_type ?? 'quran',
      status: json.status ?? 'draft',
      subtype: json.subtype ?? '',
      difficulty: typeof json.difficulty === 'number' ? json.difficulty : 1,
      referenceLabel,
    };
  }

  private syncLessonMetaFromJson() {
    this.lessonMeta = this.buildLessonMeta(this.lessonJson);
  }

  defaultLessonJson(): LessonJson {
    return {
      entity_type: 'ar_lesson',
      id: 'new',
      lesson_type: 'quran',
      subtype: 'narrative',
      title: '',
      title_ar: '',
      status: 'draft',
      difficulty: 1,
      reference: {},
      text: {
        arabic_full: [],
        mode: 'original',
      },
      sentences: [],
      passage_layers: [],
      comprehension: {
        reflective: [],
        analytical: [],
        mcqs: [],
      },
    };
  }

  selectTab(tab: LessonTab) {
    this.selectedTab = tab;
  }

  applyNodeJson(node: LessonNodeKey) {
    try {
      const parsed = JSON.parse(this.nodeJsonTexts[node]);
      this.lessonJson = {
        ...this.lessonJson,
        [node]: parsed,
      };
      this.nodeErrors[node] = '';
      this.syncJsonRepresentations();
    } catch (err: any) {
      this.nodeErrors[node] = err?.message ?? 'Invalid JSON';
    }
  }

  applyFullJson() {
    try {
      const parsed = JSON.parse(this.jsonText);
      if (typeof parsed === 'object' && parsed !== null) {
        this.lessonJson = {
          ...this.defaultLessonJson(),
          ...(parsed as LessonJson),
        };
      }
      this.jsonError = '';
      this.syncJsonRepresentations();
    } catch (err: any) {
      this.jsonError = err?.message ?? 'Invalid JSON';
    }
  }

  clearLesson() {
    this.lessonJson = this.defaultLessonJson();
    this.jsonError = '';
    for (const node of this.nodeKeys) {
      this.nodeErrors[node] = '';
    }
    this.syncJsonRepresentations();
  }

  private syncJsonRepresentations() {
    this.jsonText = JSON.stringify(this.lessonJson, null, 2);
    for (const node of this.nodeKeys) {
      const value = this.lessonJson[node];
      const fallback = this.defaultNodeValue(node);
      this.nodeJsonTexts[node] = JSON.stringify(value ?? fallback, null, 2);
    }
    this.syncLessonMetaFromJson();
  }

  private defaultNodeValue(node: LessonNodeKey): unknown {
    switch (node) {
      case 'reference':
        return {};
      case 'text':
        return { arabic_full: [], mode: 'original' };
      case 'sentences':
        return [];
      case 'passage_layers':
        return [];
      case 'comprehension':
        return { reflective: [], analytical: [], mcqs: [] };
    }
  }
}
