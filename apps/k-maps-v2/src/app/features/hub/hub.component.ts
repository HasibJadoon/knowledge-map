import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';

interface HubSection {
  label: string;
  icon: string;
  desc: string;
  tag: string;
}

@Component({
  selector: 'km-hub',
  standalone: true,
  imports: [],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.scss',
})
export class HubComponent implements AfterViewInit {
  private router = inject(Router);

  @ViewChild('page') pageRef!: ElementRef<HTMLElement>;

  readonly sections: HubSection[] = [
    {
      label: 'Quran',
      icon: '☽',
      desc: 'Quranic text, ayat records, tafsir annotations and verse-level data entry.',
      tag: 'SCRIPTURE',
    },
    {
      label: 'Arabic',
      icon: 'ع',
      desc: 'Root lexicon, morphological entries, grammar rules and vocabulary records.',
      tag: 'LANGUAGE',
    },
    {
      label: 'Worldview',
      icon: '◎',
      desc: 'Source ingestion, note distillation, concept mapping and claim structuring.',
      tag: 'KNOWLEDGE',
    },
    {
      label: 'Planner',
      icon: '⊞',
      desc: 'Weekly goals, task templates, focus blocks and review cycle configuration.',
      tag: 'EXECUTION',
    },
    {
      label: 'Content',
      icon: '▶',
      desc: 'Episode records, category taxonomies, editorial workflow and publishing data.',
      tag: 'EDITORIAL',
    },
  ];

  openSection(): void {
    this.router.navigate(['/login']);
  }

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
