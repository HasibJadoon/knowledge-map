import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import gsap from 'gsap';
import { WeeklyTaskService } from '../../../../shared/services/planner/weekly-task.service';

type ArabicUnitType = 'book' | 'media' | 'literature';

interface UnitSubtask {
  id: string;
  key: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  order_index: number;
}

@Component({
  selector: 'km-arabic-unit-study',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arabic-unit-study.component.html',
  styleUrl: './arabic-unit-study.component.scss',
})
export class ArabicUnitStudyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('railEl') railEl?: ElementRef<HTMLElement>;
  @ViewChild('contentEl') contentEl?: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private weeklyTaskService = inject(WeeklyTaskService);

  readonly containerId = signal('');
  readonly unitId = signal('');
  readonly unitType = signal<ArabicUnitType>('book');
  readonly activeTask = signal('');
  readonly pushing = signal(false);

  readonly subtasks = computed<UnitSubtask[]>(() => {
    const type = this.unitType();
    if (type === 'media') {
      return [
        { id: '1', key: 'watch',                  title: 'Watch',                   status: 'todo', order_index: 1 },
        { id: '2', key: 'follow_along',            title: 'Follow Along',            status: 'todo', order_index: 2 },
        { id: '3', key: 'vocabulary_expressions',  title: 'Vocabulary + Expressions',status: 'todo', order_index: 3 },
      ];
    }
    if (type === 'literature') {
      return [
        { id: '1', key: 'reading',                title: 'Reading',                 status: 'todo', order_index: 1 },
        { id: '2', key: 'vocabulary_expressions', title: 'Vocabulary + Expressions',status: 'todo', order_index: 2 },
        { id: '3', key: 'notes_reflection',        title: 'Notes / Reflection',      status: 'todo', order_index: 3 },
      ];
    }
    return [
      { id: '1', key: 'reading',                title: 'Reading',                 status: 'todo', order_index: 1 },
      { id: '2', key: 'exercises',              title: 'Exercises',               status: 'todo', order_index: 2 },
      { id: '3', key: 'vocabulary_expressions', title: 'Vocabulary + Expressions',status: 'todo', order_index: 3 },
    ];
  });

  readonly displayName = computed(() => {
    const t = this.unitType();
    const c = this.formatSlug(this.containerId());
    const u = this.unitId();
    if (t === 'book')       return `${c} — Chapter ${u}`;
    if (t === 'media')      return `${c} — Episode ${u}`;
    if (t === 'literature') return `${c} — Section ${u}`;
    return `${c} — ${u}`;
  });

  readonly unitTypeLabel = computed(() => {
    const map: Record<ArabicUnitType, string> = { book: 'Book', media: 'Media', literature: 'Literature' };
    return map[this.unitType()];
  });

  ngAfterViewInit(): void {
    this.route.params.subscribe(params => {
      this.containerId.set(params['containerId'] ?? '');
      this.unitId.set(params['unitId'] ?? '');

      const url = this.router.url;
      if (url.includes('/books/'))       this.unitType.set('book');
      else if (url.includes('/media/'))  this.unitType.set('media');
      else                               this.unitType.set('literature');

      const tasks = this.subtasks();
      if (tasks.length > 0) this.activeTask.set(tasks[0].key);
    });

    this.animateEntrance();
  }

  ngOnDestroy(): void {}

  private animateEntrance(): void {
    const rail = this.railEl?.nativeElement;
    const content = this.contentEl?.nativeElement;
    if (rail)    gsap.fromTo(rail,    { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.32, ease: 'power2.out' });
    if (content) gsap.fromTo(content, { opacity: 0, y: 8 },   { opacity: 1, y: 0, duration: 0.36, delay: 0.06, ease: 'power2.out' });
  }

  selectTask(key: string): void {
    if (this.activeTask() === key) return;
    const content = this.contentEl?.nativeElement;
    if (content) {
      gsap.to(content, { opacity: 0, y: -5, duration: 0.12, ease: 'power2.in',
        onComplete: () => {
          this.activeTask.set(key);
          gsap.fromTo(content, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
        }
      });
    } else {
      this.activeTask.set(key);
    }
  }

  pushToWeeklyTask(): void {
    if (this.pushing()) return;
    this.pushing.set(true);

    const type = this.unitType();
    const originTypeMap: Record<ArabicUnitType, 'arabic_book_unit' | 'arabic_multimedia_unit' | 'arabic_literature_unit'> = {
      book:        'arabic_book_unit',
      media:       'arabic_multimedia_unit',
      literature:  'arabic_literature_unit',
    };
    const originType = originTypeMap[type];
    const subtaskBuilders = {
      arabic_book_unit:       WeeklyTaskService.buildArabicBookSubtasks,
      arabic_multimedia_unit: WeeklyTaskService.buildArabicMultimediaSubtasks,
      arabic_literature_unit: WeeklyTaskService.buildArabicLiteratureSubtasks,
    };

    this.weeklyTaskService.pushToWeeklyTask({
      workspace_id: 1, // TODO: replace with auth workspace context
      unit_id: `${type}_${this.containerId()}_${this.unitId()}`,
      container_id: this.containerId(),
      origin_type: originType,
      display_name: this.displayName(),
      uri: this.router.url.split('?')[0],
      task_scope: 'unit',
      target_bucket: 'ar',
      subtasks: subtaskBuilders[originType](),
    }).subscribe({
      next: (result) => {
        this.pushing.set(false);
        this.router.navigate(['/planner'], { queryParams: { view: 'plan', task: result.task_id } });
      },
      error: () => this.pushing.set(false),
    });
  }

  private formatSlug(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
