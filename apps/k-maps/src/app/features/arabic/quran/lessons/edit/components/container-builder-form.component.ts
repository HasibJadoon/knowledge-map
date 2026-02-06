import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ContainerFormModel = {
  title: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  containerId: string;
  unitId: string;
};

@Component({
  selector: 'app-container-builder-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="form-grid form-grid--selection">
      <label>
        <span>Container title</span>
        <input type="text" [(ngModel)]="form.title" placeholder="Surah title" />
      </label>

      <label>
        <span>Container ID</span>
        <input type="text" [(ngModel)]="form.containerId" />
      </label>

      <label>
        <span>Passage unit ID</span>
        <input type="text" [(ngModel)]="form.unitId" />
      </label>

      <label>
        <span>Ayah from</span>
        <input type="number" min="1" [(ngModel)]="form.ayahFrom" />
      </label>

      <label>
        <span>Ayah to</span>
        <input type="number" min="1" [(ngModel)]="form.ayahTo" />
      </label>
    </div>
  `,
})
export class ContainerBuilderFormComponent {
  @Input() form: ContainerFormModel = {
    title: '',
    surah: 1,
    ayahFrom: 1,
    ayahTo: 7,
    containerId: '',
    unitId: '',
  };
}
