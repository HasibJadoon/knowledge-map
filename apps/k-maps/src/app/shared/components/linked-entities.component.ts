import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LinkedEntity = {
  label: string;
  href: string;
};

@Component({
  selector: 'app-linked-entities',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex flex-wrap gap-2">
      <a
        class="btn btn-outline-secondary btn-sm"
        *ngFor="let link of links"
        [href]="link.href"
      >
        {{ link.label }}
      </a>
      <span *ngIf="links.length === 0" class="text-muted">No links yet.</span>
    </div>
  `
})
export class LinkedEntitiesComponent {
  @Input() links: LinkedEntity[] = [];
}
