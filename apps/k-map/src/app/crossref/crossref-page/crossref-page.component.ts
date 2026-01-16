import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crossref-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crossref-page.component.html'
})
export class CrossrefPageComponent {
  columns = ['title', 'status', 'updated_at'];
  rows: Array<Record<string, string>> = [];
}
