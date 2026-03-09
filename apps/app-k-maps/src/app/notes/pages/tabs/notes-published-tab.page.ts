import { Component } from '@angular/core';
import { NotesTabListComponent } from './notes-tab-list.component';

@Component({
  selector: 'app-notes-published-tab-page',
  standalone: true,
  imports: [NotesTabListComponent],
  template: '<app-notes-tab-list mode="published"></app-notes-tab-list>',
})
export class NotesPublishedTabPage {}
