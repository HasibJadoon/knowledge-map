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
  templateUrl: './linked-entities.component.html'
})
export class LinkedEntitiesComponent {
  @Input() links: LinkedEntity[] = [];
}
