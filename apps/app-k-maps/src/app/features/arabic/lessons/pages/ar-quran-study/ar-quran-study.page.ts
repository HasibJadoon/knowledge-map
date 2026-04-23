import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import {
  arrowBackOutline,
  bookOutline,
  constructOutline,
  flashOutline,
  gitMergeOutline,
  gitNetworkOutline,
  listOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { ArQuranStudyFacade, StudyTask } from '../../ar-quran-study/ar-quran-study.facade';
import { StudyComprehensionTabComponent } from '../../ar-quran-study/tabs/study-comprehension-tab.component';
import { StudyExpressionsTabComponent } from '../../ar-quran-study/tabs/study-expressions-tab.component';
import { StudyMorphologyTabComponent } from '../../ar-quran-study/tabs/study-morphology-tab.component';
import { StudyPassageStructureTabComponent } from '../../ar-quran-study/tabs/study-passage-structure-tab.component';
import { StudyReadingTabComponent } from '../../ar-quran-study/tabs/study-reading-tab.component';
import { StudySentenceStructureTabComponent } from '../../ar-quran-study/tabs/study-sentence-structure-tab.component';
import { AppIconTabsComponent, IconTabItem } from '../../../../../shared/components/icon-tabs/icon-tabs.component';

const LEGACY_STUDY_TAB_MAP: Record<string, StudyTask> = {
  study: 'reading',
  reading: 'reading',
  memory: 'sentence_structure',
  sentences: 'sentence_structure',
  mcq: 'comprehension',
  passage: 'passage_structure',
  comprehension: 'comprehension',
  expressions: 'expressions',
  grammar: 'sentence_structure',
};

@Component({
  selector: 'app-ar-quran-study',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    StudyReadingTabComponent,
    StudyMorphologyTabComponent,
    StudySentenceStructureTabComponent,
    StudyExpressionsTabComponent,
    StudyComprehensionTabComponent,
    StudyPassageStructureTabComponent,
    AppIconTabsComponent,
  ],
  templateUrl: './ar-quran-study.page.html',
  providers: [ArQuranStudyFacade],
})
export class ArQuranStudyPage implements OnInit, OnDestroy {
  readonly facade = inject(ArQuranStudyFacade);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subs = new Subscription();

  readonly taskTabs: IconTabItem[] = [
    { key: 'reading', label: 'Reading', icon: bookOutline },
    { key: 'morphology', label: 'Morphology', icon: constructOutline },
    { key: 'sentence_structure', label: 'Sentence Structure', icon: gitMergeOutline },
    { key: 'expressions', label: 'Expressions', icon: flashOutline },
    { key: 'comprehension', label: 'Comprehension', icon: listOutline },
    { key: 'passage_structure', label: 'Passage Structure', icon: gitNetworkOutline },
  ];

  readonly icons = {
    arrowBackOutline,
  };

  async ngOnInit(): Promise<void> {
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        this.applyRouteTask(params);
      })
    );

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.facade.error = 'Lesson not found';
      this.facade.loading = false;
      return;
    }

    await this.facade.loadLesson(id);
    this.applyRouteTask(this.route.snapshot.queryParamMap);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  back(): void {
    this.router.navigate(['/arabic/lessons']);
  }

  onTaskTabSelected(tabKey: string): void {
    if (!this.isStudyTask(tabKey)) return;
    if (tabKey === this.facade.activeTask) return;
    this.facade.setActiveTask(tabKey);
    this.syncQueryTask(tabKey);
  }

  private applyRouteTask(params: ParamMap): void {
    const task = params.get('task');
    if (task === 'grammar_concepts') {
      this.facade.setActiveTask('sentence_structure');
      return;
    }

    if (task && this.isStudyTask(task)) {
      this.facade.setActiveTask(task);
      return;
    }

    const legacy = params.get('tab');
    if (legacy && LEGACY_STUDY_TAB_MAP[legacy]) {
      this.facade.setActiveTask(LEGACY_STUDY_TAB_MAP[legacy]);
      return;
    }

    if (!task && !legacy) {
      this.facade.setActiveTask('reading');
    }
  }

  private syncQueryTask(task: StudyTask): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { task, tab: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isStudyTask(value: string | null | undefined): value is StudyTask {
    return (
      value === 'reading'
      || value === 'morphology'
      || value === 'sentence_structure'
      || value === 'expressions'
      || value === 'comprehension'
      || value === 'passage_structure'
    );
  }
}
