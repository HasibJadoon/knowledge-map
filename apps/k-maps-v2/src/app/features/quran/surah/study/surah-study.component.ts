import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import gsap from 'gsap';
import { SurahModulesService, LessonListItemVm } from '../../../../shared/services/surah-modules.service';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { QuranGsapService } from '../../shared/quran-gsap.service';

@Component({
  selector: 'km-surah-study',
  standalone: true,
  imports: [NgClass, QuranPageShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './surah-study.component.html',
  styleUrl: './surah-study.component.scss',
})
export class SurahStudyComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SurahModulesService);
  private gsapSvc = inject(QuranGsapService);
  @ViewChild('gridEl') gridEl!: ElementRef<HTMLElement>;

  surahId = signal(0);
  lessons = signal<LessonListItemVm[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.svc.getSurahLessons(id).subscribe({
      next: (res) => { this.lessons.set(res.lessons); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  ngAfterViewInit(): void {}

  openLesson(lesson: LessonListItemVm): void {
    this.router.navigate(['/quran', 'lessons', lesson.id, 'study']);
  }

  back(): void { this.router.navigate(['/quran']); }

  ayahRange(l: LessonListItemVm): string {
    if (!l.ayah_from) return l.start_ref ?? '';
    return l.ayah_to && l.ayah_to !== l.ayah_from ? `${l.ayah_from}–${l.ayah_to}` : String(l.ayah_from);
  }

  difficultyLabel(d?: number): string {
    if (!d) return '';
    return ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'][Math.min(d, 5)] ?? '';
  }
}
