import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

export type StudyTab =
  | 'reading'
  | 'morphology'
  | 'sentence-structure'
  | 'expressions'
  | 'comprehension'
  | 'passage-structure'
  | 'vocabulary'
  | 'notes'
  | 'worldview'
  | 'review';

interface TabDef {
  id: StudyTab;
  label: string;
}

@Component({
  selector: 'km-lesson-study',
  standalone: true,
  imports: [],
  templateUrl: './lesson-study.component.html',
  styleUrl: './lesson-study.component.scss',
})
export class LessonStudyComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  lessonId = signal<string>('');
  activeTab = signal<StudyTab>('reading');

  readonly tabs: TabDef[] = [
    { id: 'reading', label: 'Reading' },
    { id: 'morphology', label: 'Morphology' },
    { id: 'sentence-structure', label: 'Sentence Structure' },
    { id: 'expressions', label: 'Expressions' },
    { id: 'comprehension', label: 'Comprehension' },
    { id: 'passage-structure', label: 'Passage Structure' },
    { id: 'vocabulary', label: 'Vocabulary' },
    { id: 'notes', label: 'Notes' },
    { id: 'worldview', label: 'Worldview' },
    { id: 'review', label: 'Review' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lessonId');
    if (id) {
      this.lessonId.set(id);
    }

    this.route.queryParamMap.subscribe((params) => {
      const task = params.get('task') as StudyTab | null;
      const validTabs = this.tabs.map((t) => t.id);
      if (task && validTabs.includes(task)) {
        this.activeTab.set(task);
      }
    });
  }

  setTab(tab: StudyTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { task: tab },
      queryParamsHandling: 'merge',
    });
  }

  back(): void {
    this.router.navigate(['/arabic/quran']);
  }
}
