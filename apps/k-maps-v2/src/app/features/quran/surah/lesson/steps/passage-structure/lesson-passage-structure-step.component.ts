import {
  Component, Input, OnInit, AfterViewInit, OnDestroy,
  ElementRef, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StudyLessonResponse } from '../../../../../../shared/services/surah-modules.service';

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
  selector: 'km-lesson-passage-structure-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lesson-passage-structure-step.component.html',
  styleUrl: './lesson-passage-structure-step.component.scss',
})
export class LessonPassageStructureStepComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) lesson!: StudyLessonResponse;

  private elRef = inject(ElementRef);

  sections: PassageSection[] = [];
  ref = '';

  // ── Font scale (em units, applied to container) ─────────
  fontScale = signal(1);
  increaseFontScale(): void { this.fontScale.update(v => Math.min(v + 0.1, 1.6)); }
  decreaseFontScale(): void { this.fontScale.update(v => Math.max(v - 0.1, 0.7)); }
  resetFontScale(): void    { this.fontScale.set(1); }

  // ── Chiasm pair hover ────────────────────────────────────
  hoveredPair = signal<number | null>(null);
  onPairEnter(i: number, total: number): void {
    this.hoveredPair.set(Math.min(i, total - 1 - i));
  }
  onPairLeave(): void { this.hoveredPair.set(null); }
  isPairHighlighted(i: number, total: number): boolean {
    const active = this.hoveredPair();
    if (active === null) return false;
    return Math.min(i, total - 1 - i) === active;
  }

  private scrollTriggers: ScrollTrigger[] = [];

  ngOnInit(): void {
    const task = this.lesson?.tasks?.find(t => t.task_type === 'passage_structure');
    if (!task) return;

    const payloads = [task.task_json, ...(task.children ?? []).map((child) => child.task_json)];
    for (const raw of payloads) {
      const parsed = this.parsePayload(raw);
      if (!parsed) continue;

      const sections = parsed?.analysis?.sections ?? parsed?.sections ?? [];
      if (!Array.isArray(sections) || !sections.length) continue;

      this.sections = sections;
      const s = parsed?.scope?.ref;
      this.ref = s ? `${s.surah}:${s.verses}` : '';
      break;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.animateCards(), 100);
  }

  ngOnDestroy(): void {}

  private animateCards(): void {
    const cards = this.elRef.nativeElement
      .querySelectorAll('.section-card') as NodeListOf<HTMLElement>;
    if (!cards.length) return;

    // Set all cards invisible first, then stagger them in — no scroll dependency
    gsap.set(Array.from(cards), { opacity: 0, y: 22 });
    gsap.to(Array.from(cards), {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.07,
    });
  }

  kvPairs(data: Record<string, string>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  chiasmLevels(data: any): any[] { return data?.levels ?? []; }

  // Indent increases toward the center regardless of odd/even
  chiasmIndent(i: number, total: number): string {
    const outerDepth = Math.min(i, total - 1 - i); // 0 = outermost (A/A')
    return `${outerDepth * 1.25}rem`;
  }

  // Odd count: exactly one center axis row
  isOddAxis(i: number, total: number): boolean {
    return total % 2 === 1 && i === Math.floor(total / 2);
  }

  // Even count: the two innermost rows both get the center highlight
  isEvenCenter(i: number, total: number): boolean {
    if (total % 2 !== 0) return false;
    const mid = total / 2;
    return i === mid - 1 || i === mid;
  }

  // Color for the left border / pair dot — same color for mirror pairs (A↔A', B↔B', etc.)
  pairColor(i: number, total: number): string {
    const depth = Math.min(i, total - 1 - i); // outermost = 0
    const palette = [
      'rgba(100,160,230,0.75)',  // 0 → blue    (A/A')
      'rgba(140,100,220,0.75)',  // 1 → purple  (B/B')
      'rgba(80,180,150,0.75)',   // 2 → teal    (C/C')
      'rgba(220,140,80,0.75)',   // 3 → amber   (D/D')
      'rgba(200,80,120,0.75)',   // 4 → rose
    ];
    return palette[Math.min(depth, palette.length - 1)];
  }

  clusters(data: any): any[] { return data?.clusters ?? []; }

  timelineSteps(data: any): any[] { return data?.steps ?? []; }

  private parsePayload(raw: unknown): any {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }
}
