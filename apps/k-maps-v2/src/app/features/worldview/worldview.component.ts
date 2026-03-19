import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';

interface WorldviewSection {
  label: string;
  icon: string;
  desc: string;
  tag: string;
}

@Component({
  selector: 'km-worldview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './worldview.component.html',
  styleUrl: './worldview.component.scss',
})
export class WorldviewComponent implements AfterViewInit {
  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly sections: WorldviewSection[] = [
    {
      label: 'Books',
      icon: '⬡',
      desc: 'Catalogue of books read, in progress and queued — with notes and ratings.',
      tag: 'SOURCES',
    },
    {
      label: 'Podcasts',
      icon: '◉',
      desc: 'Episode log, guest mapping and key insight extraction from audio sources.',
      tag: 'SOURCES',
    },
    {
      label: 'Series',
      icon: '▦',
      desc: 'Multi-part lecture series and course completions tracked with progress markers.',
      tag: 'SOURCES',
    },
    {
      label: 'Concepts',
      icon: '◈',
      desc: 'Atomic idea cards distilled from sources, tagged by domain and cross-linked.',
      tag: 'INSIGHTS',
    },
    {
      label: 'Claims',
      icon: '◆',
      desc: 'Specific claims extracted from sources with confidence levels and citations.',
      tag: 'INSIGHTS',
    },
    {
      label: 'Graph',
      icon: '◎',
      desc: 'Visual knowledge graph connecting concepts, claims, sources and thinkers.',
      tag: 'FRAMEWORK',
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
        stagger: 0.09,
        delay: 0.35,
        clearProps: 'transform',
      }
    );
  }
}
