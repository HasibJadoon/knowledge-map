import {
  Component, Input, OnInit, AfterViewInit, OnDestroy,
  ElementRef, inject, ChangeDetectionStrategy,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StudyLessonResponse } from '../../../../../shared/services/surah-modules.service';

gsap.registerPlugin(ScrollTrigger);

export interface PassageSection {
  key: string;
  title: string;
  badge: string;
  tone: 'info' | 'primary' | 'warning' | 'danger' | 'success' | 'secondary';
  renderer: 'keyvalue' | 'chiasm' | 'clusters' | 'timeline';
  data: any;
}

@Component({
  selector: 'km-lesson-passage-structure-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-passage-structure-tab.component.html',
  styleUrl: './lesson-passage-structure-tab.component.scss',
})
export class LessonPassageStructureTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  private elRef = inject(ElementRef);

  sections: PassageSection[] = [];
  ref = '';

  private scrollTriggers: ScrollTrigger[] = [];

  // ── Lifecycle ─────────────────────────────────────────

  ngOnInit(): void {
    const task = this.lesson?.tasks?.find(t => t.task_type === 'passage_structure');
    if (!task?.task_json) return;
    try {
      const parsed = typeof task.task_json === 'string'
        ? JSON.parse(task.task_json)
        : task.task_json;
      this.sections = parsed?.analysis?.sections ?? [];
      const s = parsed?.scope?.ref;
      this.ref = s ? `${s.surah}:${s.verses}` : '';
    } catch { /* malformed JSON */ }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.setupScrollAnimations(), 80);
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers = [];
  }

  // ── Scroll animations ─────────────────────────────────

  private setupScrollAnimations(): void {
    const cards = this.elRef.nativeElement
      .querySelectorAll('.section-card') as NodeListOf<HTMLElement>;
    if (!cards.length) return;

    cards.forEach((card, i) => {
      gsap.set(card, { opacity: 0, y: 28 });
      const st = ScrollTrigger.create({
        trigger: card,
        scroller: document.body,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(card, {
            opacity: 1, y: 0,
            duration: 0.55,
            ease: 'power3.out',
            delay: Math.min(i * 0.07, 0.28),
          });
        },
      });
      this.scrollTriggers.push(st);
    });
    ScrollTrigger.refresh();
  }

  // ── Template helpers ──────────────────────────────────

  kvPairs(data: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  chiasmLevels(data: any): any[] {
    return data?.levels ?? [];
  }

  isCenter(idx: number, total: number): boolean {
    return idx === Math.floor(total / 2);
  }

  clusters(data: any): any[] {
    return data?.clusters ?? [];
  }

  timelineSteps(data: any): any[] {
    return data?.steps ?? [];
  }
}
