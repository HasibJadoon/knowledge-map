import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

export type EditStep = 'container' | 'unit' | 'lesson' | 'tasks';

interface StepDef {
  id: EditStep;
  label: string;
  number: number;
}

@Component({
  selector: 'km-lesson-edit',
  standalone: true,
  imports: [],
  templateUrl: './lesson-edit.component.html',
  styleUrl: './lesson-edit.component.scss',
})
export class LessonEditComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  lessonId = signal<string>('');
  activeStep = signal<EditStep>('container');

  readonly steps: StepDef[] = [
    { id: 'container', label: 'Container', number: 1 },
    { id: 'unit', label: 'Unit', number: 2 },
    { id: 'lesson', label: 'Lesson', number: 3 },
    { id: 'tasks', label: 'Tasks', number: 4 },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('lessonId');
    if (id) {
      this.lessonId.set(id);
    }

    this.route.queryParamMap.subscribe((params) => {
      const step = params.get('step') as EditStep | null;
      const validSteps = this.steps.map((s) => s.id);
      if (step && validSteps.includes(step)) {
        this.activeStep.set(step);
      }
    });
  }

  setStep(step: EditStep): void {
    this.activeStep.set(step);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step },
      queryParamsHandling: 'merge',
    });
  }

  getStepIndex(stepId: EditStep): number {
    return this.steps.findIndex((s) => s.id === stepId);
  }

  get activeStepIndex(): number {
    return this.getStepIndex(this.activeStep());
  }

  back(): void {
    this.router.navigate(['/quran']);
  }
}
