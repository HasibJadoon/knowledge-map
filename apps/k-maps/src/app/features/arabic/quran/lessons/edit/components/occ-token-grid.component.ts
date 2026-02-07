import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { QuranLessonTokenV2 } from '../../../../../../shared/models/arabic/quran-lesson.model';

@Component({
  selector: 'app-occ-token-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pane-head">
      <h3>Tokens</h3>
      <div class="pane-actions">
        <label class="pane-toggle">
          <input
            type="checkbox"
            [checked]="splitAffixes"
            (change)="splitAffixesChange.emit($any($event.target).checked)"
          />
          <span>Split affixes</span>
        </label>
        <button
          type="button"
          class="btn btn-outline-light btn-sm"
          [disabled]="!canLookup || lookupLoading"
          (click)="lookup.emit()"
        >
          {{ lookupLoading ? 'Looking up…' : 'Lookup' }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" (click)="add.emit()">Add Token</button>
      </div>
    </div>

    <div class="table-wrap" *ngIf="tokens.length; else emptyTpl">
      <table class="editor-table editor-table--tokens">
        <thead>
          <tr>
            <th>#</th>
            <th>Surface</th>
            <th>Lemma</th>
            <th>POS</th>
            <th>Index</th>
            <th>Features</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let token of tokens; let index = index; trackBy: trackByToken">
            <td>{{ index + 1 }}</td>
            <td>
              <input
                type="text"
                class="text-arabic"
                dir="rtl"
                [(ngModel)]="token.surface_ar"
                (ngModelChange)="changed.emit(); autoFeatures.emit(token)"
              />
            </td>
            <td>
              <input
                type="text"
                class="text-arabic"
                dir="rtl"
                [(ngModel)]="token.lemma_ar"
                (ngModelChange)="changed.emit(); autoFeatures.emit(token)"
              />
            </td>
            <td>
              <select [(ngModel)]="token.pos" (ngModelChange)="changed.emit(); autoFeatures.emit(token)">
                <option [ngValue]="null">—</option>
                <option *ngFor="let option of posOptions" [ngValue]="option.value">{{ option.label }}</option>
              </select>
            </td>
            <td><input type="number" min="0" [(ngModel)]="token.pos_index" (ngModelChange)="changed.emit()" /></td>
            <td>
              <div class="feature-controls feature-controls--noun" *ngIf="token.pos === 'noun'">
                <select
                  [ngModel]="featureValue(token, 'status')"
                  (ngModelChange)="setFeatureValue(token, 'status', $event)"
                >
                  <option [ngValue]="null">الحالة</option>
                  <option [ngValue]="'مرفوع'">مرفوع</option>
                  <option [ngValue]="'منصوب'">منصوب</option>
                  <option [ngValue]="'مجرور'">مجرور</option>
                </select>
                <select
                  [ngModel]="featureValue(token, 'number')"
                  (ngModelChange)="setFeatureValue(token, 'number', $event)"
                >
                  <option [ngValue]="null">العدد</option>
                  <option [ngValue]="'مفرد'">مفرد</option>
                  <option [ngValue]="'مثنى'">مثنى</option>
                  <option [ngValue]="'جمع'">جمع</option>
                </select>
                <select
                  [ngModel]="featureValue(token, 'gender')"
                  (ngModelChange)="setFeatureValue(token, 'gender', $event)"
                >
                  <option [ngValue]="null">الجنس</option>
                  <option [ngValue]="'مذكر'">مذكر</option>
                  <option [ngValue]="'مؤنث'">مؤنث</option>
                </select>
                <select
                  [ngModel]="featureValue(token, 'type')"
                  (ngModelChange)="setFeatureValue(token, 'type', $event)"
                >
                  <option [ngValue]="null">النوع</option>
                  <option [ngValue]="'معرفة'">معرفة</option>
                  <option [ngValue]="'نكرة'">نكرة</option>
                </select>
              </div>
              <div class="feature-controls feature-controls--verb" *ngIf="token.pos === 'verb'">
                <select
                  [ngModel]="featureValue(token, 'tense')"
                  (ngModelChange)="setFeatureValue(token, 'tense', $event)"
                >
                  <option [ngValue]="null">الزمن</option>
                  <option [ngValue]="'ماضٍ'">ماضٍ</option>
                  <option [ngValue]="'مضارع'">مضارع</option>
                  <option [ngValue]="'أمر'">أمر</option>
                </select>
                <select
                  [ngModel]="featureValue(token, 'mood')"
                  (ngModelChange)="setFeatureValue(token, 'mood', $event)"
                >
                  <option [ngValue]="null">الإعراب</option>
                  <option [ngValue]="'مرفوع'">مرفوع</option>
                  <option [ngValue]="'منصوب'">منصوب</option>
                  <option [ngValue]="'مجزوم'">مجزوم</option>
                </select>
              </div>
              <div class="feature-controls feature-controls--particle" *ngIf="token.pos === 'particle'">
                <select
                  [ngModel]="featureValue(token, 'particle_type')"
                  (ngModelChange)="setFeatureValue(token, 'particle_type', $event)"
                >
                  <option [ngValue]="null">نوع الحرف</option>
                  <option [ngValue]="'جر'">حرف جر</option>
                  <option [ngValue]="'عطف'">حرف عطف</option>
                  <option [ngValue]="'نفي'">حرف نفي</option>
                  <option [ngValue]="'نداء'">حرف نداء</option>
                  <option [ngValue]="'استفهام'">حرف استفهام</option>
                  <option [ngValue]="'شرط'">حرف شرط</option>
                  <option [ngValue]="'توكيد'">حرف توكيد</option>
                  <option [ngValue]="'جزم'">حرف جزم</option>
                  <option [ngValue]="'نصب'">حرف نصب</option>
                  <option [ngValue]="'استقبال'">حرف استقبال</option>
                  <option [ngValue]="'ضمير'">ضمير</option>
                </select>
              </div>
            </td>
            <td>
              <button type="button" class="btn btn-sm btn-danger" (click)="remove.emit(token.token_occ_id)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ng-template #emptyTpl>
      <p class="empty-state">No tokens for selected verse.</p>
    </ng-template>
  `,
})
export class OccTokenGridComponent {
  @Input() tokens: QuranLessonTokenV2[] = [];
  @Input() canLookup = false;
  @Input() lookupLoading = false;
  @Input() splitAffixes = true;

  readonly posOptions = [
    { value: 'noun', label: 'اسم' },
    { value: 'verb', label: 'فعل' },
    { value: 'particle', label: 'حرف' },
  ];

  @Output() add = new EventEmitter<void>();
  @Output() remove = new EventEmitter<string>();
  @Output() changed = new EventEmitter<void>();
  @Output() tokenFeaturesInput = new EventEmitter<{ token: QuranLessonTokenV2; value: string }>();
  @Output() lookup = new EventEmitter<void>();
  @Output() splitAffixesChange = new EventEmitter<boolean>();
  @Output() autoFeatures = new EventEmitter<QuranLessonTokenV2>();

  trackByToken = (_index: number, token: QuranLessonTokenV2) =>
    token.token_occ_id || `${token.unit_id}-${token.pos_index}-${_index}`;

  featureValue(token: QuranLessonTokenV2, key: string) {
    const features = token.features && typeof token.features === 'object' ? token.features : null;
    if (!features) return null;
    return (features as Record<string, unknown>)[key] ?? null;
  }

  setFeatureValue(token: QuranLessonTokenV2, key: string, value: unknown) {
    if (!token.features || typeof token.features !== 'object') {
      token.features = {};
    }
    const features = token.features as Record<string, unknown>;
    if (value == null || value === '') {
      delete features[key];
    } else {
      features[key] = value;
    }
    if (!Object.keys(features).length) {
      token.features = null;
    }
    this.changed.emit();
  }
}
