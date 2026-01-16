import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crossref-view',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="card">
      <div class="card-body">
        <h5 class="card-title">Crossref View</h5>
        <pre class="json-preview">{{ jsonValue }}</pre>
      </div>
    </div>
  `
})
export class CrossrefViewComponent {
  jsonValue = '{\n  "notes": ""\n}';
}
