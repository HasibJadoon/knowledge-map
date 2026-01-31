import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, type SegmentValue } from '@ionic/angular';
import { worldviewEntries, WorldviewEntry } from '../worldview-mock';

type Mode = 'view' | 'edit' | 'capture';

@Component({
  selector: 'app-worldview-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './worldview-entry.page.html',
  styleUrls: ['./worldview-entry.page.scss'],
})
export class WorldviewEntryPage implements OnInit {
  entry: WorldviewEntry | null = null;
  mode: Mode = 'view';

  captureDraft = {
    kind: 'debate',
    title: '',
    creator: '',
    url: '',
    oneLine: '',
    unitType: 'claim',
    unitText: '',
  };

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.entry = id ? worldviewEntries.find((item) => String(item.id) === id) ?? null : null;
    });

    this.route.queryParamMap.subscribe((params) => {
      const next = (params.get('mode') ?? 'view') as Mode;
      this.mode = next === 'edit' || next === 'capture' ? next : 'view';
    });
  }

  setMode(mode: SegmentValue | undefined) {
    const next: Mode = mode === 'edit' || mode === 'capture' ? mode : 'view';
    this.router.navigate([], {
      queryParams: { mode: next },
      queryParamsHandling: 'merge',
    });
  }

  saveDraft() {
    this.mode = 'edit';
  }
}
