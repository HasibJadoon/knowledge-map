import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crossref-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crossref-view.component.html'
})
export class CrossrefViewComponent {
  jsonValue = '{\n  "notes": ""\n}';
}
