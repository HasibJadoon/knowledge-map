import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';

interface WorkspaceSection {
  label: string;
  icon: string;
  desc: string;
  tag: string;
}

@Component({
  selector: 'km-workspace',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
})
export class WorkspaceComponent implements AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly avatarSlots = [0, 1, 2, 3];
  readonly avatarLabels = ['A', 'K', 'M', 'S'];

  readonly sections: WorkspaceSection[] = [
    {
      label: 'Members',
      icon: '◉',
      desc: 'Manage workspace members, send invitations and view contributor profiles.',
      tag: 'PEOPLE',
    },
    {
      label: 'Groups',
      icon: '⬡',
      desc: 'Organise members into functional groups for scoped access and collaboration.',
      tag: 'PEOPLE',
    },
    {
      label: 'Roles',
      icon: '◆',
      desc: 'Define permission sets and access roles controlling what each member can do.',
      tag: 'ACCESS',
    },
    {
      label: 'Settings',
      icon: '◈',
      desc: 'Workspace configuration, branding preferences and integration management.',
      tag: 'CONFIG',
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
