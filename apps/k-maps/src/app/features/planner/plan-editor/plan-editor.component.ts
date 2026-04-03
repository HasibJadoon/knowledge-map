import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import type { CaptureItem, PlannerAccordionNote, PlannerPlanState, PlannerSection } from '../models/planner.models';
import { PlannerActionBarComponent } from '../planner-action-bar.component';

@Component({
  selector: 'km-plan-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, PlannerActionBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-editor.component.html',
  styleUrl: './plan-editor.component.scss',
})
export class PlannerPlanEditorComponent implements AfterViewInit {
  @Input({ required: true }) item!: CaptureItem;
  @Input({ required: true }) draft!: PlannerPlanState;
  @Input({ required: true }) title = '';
  @Input() busy = false;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() titleChanged = new EventEmitter<string>();
  @Output() summaryChanged = new EventEmitter<string>();
  @Output() sectionChanged = new EventEmitter<{ index: number; key: keyof PlannerSection; value: string }>();
  @Output() noteChanged = new EventEmitter<{ index: number; value: string }>();
  @Output() sectionAdded = new EventEmitter<void>();
  @Output() pushToFeed = new EventEmitter<void>();
  @Output() pushToKanban = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();
  @Output() archive = new EventEmitter<void>();

  @ViewChildren('accordionBody') private accordionBodies?: QueryList<ElementRef<HTMLElement>>;

  private readonly openNotes = new Set<string>();

  ngAfterViewInit(): void {
    if (this.draft.accordion_notes[0]) {
      this.openNotes.add(this.draft.accordion_notes[0].id);
    }

    queueMicrotask(() => this.syncAccordionState());
  }

  isOpen(note: PlannerAccordionNote): boolean {
    return this.openNotes.has(note.id);
  }

  toggleAccordion(note: PlannerAccordionNote): void {
    if (this.isOpen(note)) {
      this.openNotes.delete(note.id);
    } else {
      this.openNotes.add(note.id);
    }

    this.syncAccordionState();
  }

  private syncAccordionState(): void {
    const bodies = this.accordionBodies?.toArray() ?? [];
    bodies.forEach((bodyRef) => {
      const el = bodyRef.nativeElement;
      const noteId = el.dataset['noteId'] ?? '';
      const shouldOpen = this.openNotes.has(noteId);
      gsap.to(el, {
        height: shouldOpen ? el.scrollHeight : 0,
        opacity: shouldOpen ? 1 : 0,
        duration: 0.36,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
    });
  }
}
