import { Component } from '@angular/core';
import { NotesTabListComponent } from './notes-tab-list.component';

@Component({
  selector: 'app-notes-draft-tab-page',
  standalone: true,
  imports: [NotesTabListComponent],
  template: '<app-notes-tab-list mode="draft"></app-notes-tab-list>',
})
export class NotesDraftTabPage {}
