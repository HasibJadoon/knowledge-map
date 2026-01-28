import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UnitEditorComponent } from './components/unit-editor/unit-editor.component';
import { ConceptPickerModalComponent } from './components/concept-picker-modal/concept-picker-modal.component';
import { LibraryLinkModalComponent } from './components/library-link-modal/library-link-modal.component';
import { worldviewEntries } from '../worldview-mock';
import {
  WorldviewEntry,
  WorldviewMode,
} from '../../../../shared/models/worldview/worldview-entry.model';

@Component({
  selector: 'app-worldview-entry',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UnitEditorComponent,
    ConceptPickerModalComponent,
    LibraryLinkModalComponent,
  ],
  templateUrl: './worldview-entry.component.html',
  styleUrls: ['./worldview-entry.component.scss'],
})
export class WorldviewEntryComponent {
  entry: WorldviewEntry | null = null;
  mode: WorldviewMode = 'view';
  showConceptPicker = false;
  showLibraryLink = false;

  captureDraft = {
    kind: 'debate',
    title: '',
    creator: '',
    url: '',
    oneLine: '',
    unitType: 'claim',
    unitText: '',
  };

  constructor(private readonly route: ActivatedRoute, private readonly router: Router) {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.entry = id ? worldviewEntries.find((item) => String(item.id) === id) ?? null : null;
    });

    this.route.queryParamMap.subscribe((params) => {
      const next = (params.get('mode') ?? 'view') as WorldviewMode;
      this.mode = next === 'edit' || next === 'capture' ? next : 'view';
    });
  }

  setMode(mode: WorldviewMode) {
    this.router.navigate([], {
      queryParams: { mode },
      queryParamsHandling: 'merge',
    });
  }

  openConceptPicker() {
    this.showConceptPicker = true;
  }

  openLibraryLink() {
    this.showLibraryLink = true;
  }

  closeModals() {
    this.showConceptPicker = false;
    this.showLibraryLink = false;
  }

  saveDraft() {
    this.mode = 'edit';
  }
}
