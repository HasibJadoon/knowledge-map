import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';

interface PlannerSection {
  label: string;
  icon: string;
  desc: string;
  tag: string;
}

@Component({
  selector: 'km-planner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly sections: PlannerSection[] = [
    {
      label: 'Weekly',
      icon: '⊞',
      desc: 'Set weekly intentions, priorities and focus themes for the coming seven days.',
      tag: 'PLANNING',
    },
    {
      label: 'Tasks',
      icon: '◆',
      desc: 'Daily task list with priorities, time estimates and completion tracking.',
      tag: 'EXECUTION',
    },
    {
      label: 'Kanban',
      icon: '▦',
      desc: 'Visual board for tracking tasks across backlog, in-progress and done columns.',
      tag: 'EXECUTION',
    },
    {
      label: 'Review',
      icon: '◎',
      desc: 'Weekly retrospective — wins, blockers, lessons and carry-overs to next week.',
      tag: 'REFLECTION',
    },
  ];

  ngAfterViewInit(): void {
    const el = this.pageRef.nativeElement;

    gsap.fromTo(
      el.querySelector('.km-page-header'),
      { opacity: 0, y: -28, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', clearProps: 'filter' }
    );

    gsap.fromTo(
      el.querySelectorAll('.km-card'),
      { opacity: 0, y: 36, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.1,
        delay: 0.35,
        clearProps: 'transform',
      }
    );
  }
}
