import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import gsap from 'gsap';
import { HomePlaneButtonComponent } from '../../../shared/components/home-plane-button/home-plane-button.component';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';

interface ContentSection {
  label: string;
  icon: string;
  desc: string;
  tag: string;
}

@Component({
  selector: 'km-content',
  standalone: true,
  imports: [HomePlaneButtonComponent, BackButtonComponent],
  templateUrl: './content.component.html',
  styleUrl: './content.component.scss',
})
export class ContentComponent implements AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly sections: ContentSection[] = [
    {
      label: 'Current Episode',
      icon: '▶',
      desc: 'Active episode in production — status, outline, script and recording notes.',
      tag: 'ACTIVE',
    },
    {
      label: 'Episodes',
      icon: '◉',
      desc: 'Full episode archive with show notes, timestamps, guest records and metrics.',
      tag: 'ARCHIVE',
    },
    {
      label: 'Categories',
      icon: '▦',
      desc: 'Topic taxonomy, series groupings and content classification for discovery.',
      tag: 'TAXONOMY',
    },
    {
      label: 'Sacred Texts',
      icon: '☽',
      desc: 'Referenced sacred texts, citations and scripture used across episodes.',
      tag: 'REFERENCES',
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
