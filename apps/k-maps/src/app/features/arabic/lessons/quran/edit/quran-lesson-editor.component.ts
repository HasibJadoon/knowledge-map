import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { QuranLessonService } from '../../../../../shared/services/quran-lesson.service';
import { QuranLesson } from '../../../../../shared/models/arabic/quran-lesson.model';

@Component({
  selector: 'app-quran-lesson-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quran-lesson-editor.component.html',
  styleUrls: ['./quran-lesson-editor.component.scss']
})
export class QuranLessonEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(QuranLessonService);

  lesson: QuranLesson | null = null;
  textJson = '';
  mcqsJson = '';
  comprehensionJson = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!isNaN(id)) {
      this.service.getLesson(id).subscribe((lesson: QuranLesson) => {
      this.lesson = lesson;
      this.textJson = JSON.stringify(lesson.text, null, 2);
      this.mcqsJson = JSON.stringify(lesson.comprehension?.mcqs ?? [], null, 2);
      this.comprehensionJson =
        JSON.stringify(
          {
            reflective: lesson.comprehension?.reflective ?? [],
            analytical: lesson.comprehension?.analytical ?? [],
          },
          null,
          2
        );
    });
  }
  }

  save() {
    this.applyJsonFields();
    // placeholder: ideally POST/PUT to /arabic/lessons/quran/:id
    this.router.navigate(['../view'], { relativeTo: this.route });
  }

  private applyJsonFields() {
    if (!this.lesson) return;
    try {
      const parsedText = JSON.parse(this.textJson);
      this.lesson.text = parsedText;
    } catch {
      // ignore invalid text JSON
    }
    try {
      const parsedMcqs = JSON.parse(this.mcqsJson);
      this.lesson.comprehension = {
        ...this.lesson.comprehension,
        mcqs: parsedMcqs,
      };
    } catch {
      // ignore broken mcq JSON
    }
    try {
      const parsedComprehension = JSON.parse(this.comprehensionJson);
      this.lesson.comprehension = {
        ...this.lesson.comprehension,
        reflective: Array.isArray(parsedComprehension.reflective)
          ? parsedComprehension.reflective
          : this.lesson.comprehension?.reflective ?? [],
        analytical: Array.isArray(parsedComprehension.analytical)
          ? parsedComprehension.analytical
          : this.lesson.comprehension?.analytical ?? [],
      };
    } catch {
      // ignore
    }
  }
}
