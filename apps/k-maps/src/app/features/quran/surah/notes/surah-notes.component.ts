import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuranPageShellComponent } from '../../shared/quran-page-shell.component';
import { KmDocumentEditorPageComponent } from './km-document-editor-page.component';
import type { DocumentEditorScope } from '../../../../shared/models/document-editor.models';

@Component({
  selector: 'km-surah-notes',
  standalone: true,
  imports: [QuranPageShellComponent, KmDocumentEditorPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <km-quran-page-shell
      [breadcrumb]="'Surah ' + surahId()"
      title="Notes"
      (goBack)="back()">
      <km-document-editor-page [scope]="scope()" />
    </km-quran-page-shell>
  `,
  styles: [`
    :host { display: flex; height: 100%; overflow: hidden; }
    km-quran-page-shell { width: 100%; }
  `],
})
export class SurahNotesComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  surahId = signal(0);
  scope   = signal<DocumentEditorScope>({ domain: 'quran', surah: 0 });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('surahId')) || 0;
    this.surahId.set(id);
    this.scope.set({ domain: 'quran', surah: id });
  }

  back(): void { this.router.navigate(['/quran']); }
}
