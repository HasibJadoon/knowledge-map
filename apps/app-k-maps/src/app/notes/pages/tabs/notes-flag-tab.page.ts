import { Component } from '@angular/core';
import { NotesTabListComponent } from './notes-tab-list.component';

@Component({
  selector: 'app-notes-flag-tab-page',
  standalone: true,
  imports: [NotesTabListComponent],
  template: '<app-notes-tab-list mode="flag"></app-notes-tab-list>',
})
export class NotesFlagTabPage {}
